"""
Session management for Databotics.
Handles saving, loading, and listing analysis sessions with full state preservation.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from pydantic import BaseModel
import pandas as pd


# ============================================================================
# Models
# ============================================================================

class AnalysisState(BaseModel):
    """Snapshot of current analysis state."""
    session_id: str
    user_id: Optional[str] = None
    filename: str
    created_at: str
    last_modified: str
    
    # Data references
    data_shape: tuple  # (rows, columns)
    columns: List[str]
    
    # Analysis history
    operations: List[Dict[str, Any]] = []  # Cleaning, transformations applied
    insights: Optional[Dict[str, Any]] = None
    
    # UI state
    selected_columns: List[str] = []
    active_visualization: Optional[str] = None
    filters: Dict[str, Any] = {}
    theme: str = "light"
    
    # Analysis results cache
    correlations: Optional[Dict[str, Any]] = None
    outliers: Optional[Dict[str, Any]] = None
    distributions: Optional[Dict[str, Any]] = None
    
    # Undo/Redo state
    undo_stack: List[Dict[str, Any]] = []
    redo_stack: List[Dict[str, Any]] = []


class SessionMetadata(BaseModel):
    """Minimal session info for listing."""
    session_id: str
    filename: str
    created_at: str
    last_modified: str
    data_shape: tuple
    size_kb: float


class SessionConfig(BaseModel):
    """Session configuration and preferences."""
    auto_save: bool = True
    auto_save_interval_seconds: int = 60
    max_undo_steps: int = 50
    remember_preferences: bool = True


# ============================================================================
# Session Storage
# ============================================================================

class SessionManager:
    """Manages session persistence and retrieval."""
    
    def __init__(self, base_dir: Optional[str] = None):
        """
        Initialize session manager.
        
        Args:
            base_dir: Base directory for session storage (default: /tmp/databotics_sessions)
        """
        if base_dir is None:
            base_dir = os.path.join(os.path.expanduser('~'), '.databotics_sessions')
        
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir = self.base_dir / 'data'
        self.state_dir = self.base_dir / 'state'
        self.data_dir.mkdir(exist_ok=True)
        self.state_dir.mkdir(exist_ok=True)
    
    def create_session(self, filename: str, df: pd.DataFrame, user_id: Optional[str] = None) -> AnalysisState:
        """
        Create new analysis session.
        
        Args:
            filename: Original filename
            df: DataFrame
            user_id: Optional user identifier
            
        Returns:
            AnalysisState
        """
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Save data to parquet
        data_path = self.data_dir / f"{session_id}.parquet"
        df.to_parquet(data_path)
        
        state = AnalysisState(
            session_id=session_id,
            user_id=user_id,
            filename=filename,
            created_at=now,
            last_modified=now,
            data_shape=df.shape,
            columns=list(df.columns),
        )
        
        # Save state
        self._save_state(state)
        
        return state
    
    def load_data(self, session_id: str) -> Optional[pd.DataFrame]:
        """
        Load data for session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            DataFrame or None if not found
        """
        data_path = self.data_dir / f"{session_id}.parquet"
        
        if not data_path.exists():
            return None
        
        try:
            return pd.read_parquet(data_path)
        except Exception as e:
            print(f"Error loading session data: {e}")
            return None
    
    def save_state(self, state: AnalysisState) -> bool:
        """
        Save analysis state.
        
        Args:
            state: AnalysisState to save
            
        Returns:
            True if successful
        """
        state.last_modified = datetime.utcnow().isoformat()
        return self._save_state(state)
    
    def load_state(self, session_id: str) -> Optional[AnalysisState]:
        """
        Load analysis state.
        
        Args:
            session_id: Session identifier
            
        Returns:
            AnalysisState or None
        """
        state_path = self.state_dir / f"{session_id}.json"
        
        if not state_path.exists():
            return None
        
        try:
            with open(state_path, 'r') as f:
                data = json.load(f)
            return AnalysisState(**data)
        except Exception as e:
            print(f"Error loading state: {e}")
            return None
    
    def list_sessions(self, user_id: Optional[str] = None) -> List[SessionMetadata]:
        """
        List all sessions.
        
        Args:
            user_id: Filter by user (optional)
            
        Returns:
            List of SessionMetadata
        """
        sessions = []
        
        for state_file in self.state_dir.glob('*.json'):
            try:
                with open(state_file, 'r') as f:
                    data = json.load(f)
                
                # Filter by user if specified
                if user_id and data.get('user_id') != user_id:
                    continue
                
                state = AnalysisState(**data)
                
                # Get file size
                data_path = self.data_dir / f"{state.session_id}.parquet"
                size_kb = data_path.stat().st_size / 1024 if data_path.exists() else 0
                
                sessions.append(SessionMetadata(
                    session_id=state.session_id,
                    filename=state.filename,
                    created_at=state.created_at,
                    last_modified=state.last_modified,
                    data_shape=state.data_shape,
                    size_kb=size_kb,
                ))
            except Exception as e:
                print(f"Error loading session {state_file}: {e}")
                continue
        
        # Sort by last modified (newest first)
        sessions.sort(key=lambda x: x.last_modified, reverse=True)
        return sessions
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Session to delete
            
        Returns:
            True if successful
        """
        try:
            data_path = self.data_dir / f"{session_id}.parquet"
            state_path = self.state_dir / f"{session_id}.json"
            
            if data_path.exists():
                data_path.unlink()
            if state_path.exists():
                state_path.unlink()
            
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False
    
    def export_session(self, session_id: str, output_path: str) -> bool:
        """
        Export session (data + state).
        
        Args:
            session_id: Session to export
            output_path: Path to export to (.zip file)
            
        Returns:
            True if successful
        """
        import zipfile
        
        try:
            data_path = self.data_dir / f"{session_id}.parquet"
            state_path = self.state_dir / f"{session_id}.json"
            
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                if data_path.exists():
                    zf.write(data_path, arcname=f"data.parquet")
                if state_path.exists():
                    zf.write(state_path, arcname=f"state.json")
            
            return True
        except Exception as e:
            print(f"Error exporting session: {e}")
            return False
    
    def import_session(self, import_path: str) -> Optional[str]:
        """
        Import session from .zip file.
        
        Args:
            import_path: Path to .zip file
            
        Returns:
            New session_id or None
        """
        import zipfile
        
        try:
            session_id = str(uuid.uuid4())
            data_path = self.data_dir / f"{session_id}.parquet"
            state_path = self.state_dir / f"{session_id}.json"
            
            with zipfile.ZipFile(import_path, 'r') as zf:
                if 'data.parquet' in zf.namelist():
                    with zf.open('data.parquet') as src:
                        with open(data_path, 'wb') as dst:
                            dst.write(src.read())
                
                if 'state.json' in zf.namelist():
                    with zf.open('state.json') as src:
                        state_data = json.loads(src.read().decode('utf-8'))
                        state_data['session_id'] = session_id
                        with open(state_path, 'w') as dst:
                            json.dump(state_data, dst)
            
            return session_id
        except Exception as e:
            print(f"Error importing session: {e}")
            return None
    
    def _save_state(self, state: AnalysisState) -> bool:
        """Save state to JSON."""
        try:
            state_path = self.state_dir / f"{state.session_id}.json"
            with open(state_path, 'w') as f:
                json.dump(state.dict(), f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving state: {e}")
            return False


# ============================================================================
# Undo/Redo Management
# ============================================================================

class UndoRedoManager:
    """Manages undo/redo operations."""
    
    def __init__(self, max_steps: int = 50):
        """
        Initialize undo/redo manager.
        
        Args:
            max_steps: Maximum undo steps to keep
        """
        self.max_steps = max_steps
        self.undo_stack: List[Dict[str, Any]] = []
        self.redo_stack: List[Dict[str, Any]] = []
    
    def record_operation(self, operation: Dict[str, Any], state_snapshot: Dict[str, Any]) -> None:
        """
        Record an operation for undo.
        
        Args:
            operation: Operation description
            state_snapshot: Current state before operation
        """
        action = {
            'operation': operation,
            'timestamp': datetime.utcnow().isoformat(),
            'state_before': state_snapshot,
        }
        
        self.undo_stack.append(action)
        self.redo_stack.clear()  # Clear redo when new action recorded
        
        # Limit stack size
        if len(self.undo_stack) > self.max_steps:
            self.undo_stack.pop(0)
    
    def undo(self) -> Optional[Dict[str, Any]]:
        """
        Undo last operation.
        
        Returns:
            State to restore or None
        """
        if not self.undo_stack:
            return None
        
        action = self.undo_stack.pop()
        self.redo_stack.append(action)
        
        return action['state_before']
    
    def redo(self) -> Optional[Dict[str, Any]]:
        """
        Redo last undone operation.
        
        Returns:
            State to restore or None
        """
        if not self.redo_stack:
            return None
        
        action = self.redo_stack.pop()
        self.undo_stack.append(action)
        
        return action['state_before']
    
    def can_undo(self) -> bool:
        """Check if undo is available."""
        return len(self.undo_stack) > 0
    
    def can_redo(self) -> bool:
        """Check if redo is available."""
        return len(self.redo_stack) > 0
    
    def get_undo_description(self) -> Optional[str]:
        """Get description of next undo operation."""
        if self.undo_stack:
            return self.undo_stack[-1]['operation'].get('name', 'Unknown')
        return None
    
    def get_redo_description(self) -> Optional[str]:
        """Get description of next redo operation."""
        if self.redo_stack:
            return self.redo_stack[-1]['operation'].get('name', 'Unknown')
        return None


# ============================================================================
# Keyboard Shortcut Handlers
# ============================================================================

KEYBOARD_SHORTCUTS = {
    'save': {
        'mac': 'Cmd+S',
        'windows': 'Ctrl+S',
        'action': 'Save current session'
    },
    'undo': {
        'mac': 'Cmd+Z',
        'windows': 'Ctrl+Z',
        'action': 'Undo last operation'
    },
    'redo': {
        'mac': 'Cmd+Shift+Z',
        'windows': 'Ctrl+Y',
        'action': 'Redo last undone operation'
    },
    'export': {
        'mac': 'Cmd+E',
        'windows': 'Ctrl+E',
        'action': 'Export current session'
    },
    'new': {
        'mac': 'Cmd+N',
        'windows': 'Ctrl+N',
        'action': 'Start new session'
    },
    'open': {
        'mac': 'Cmd+O',
        'windows': 'Ctrl+O',
        'action': 'Open previous session'
    },
}


def get_shortcuts_for_platform(platform: str = 'windows') -> Dict[str, str]:
    """
    Get keyboard shortcuts for platform.
    
    Args:
        platform: 'windows' or 'mac'
        
    Returns:
        Mapping of action to shortcut
    """
    shortcuts = {}
    for action, info in KEYBOARD_SHORTCUTS.items():
        key = 'mac' if platform == 'mac' else 'windows'
        shortcuts[action] = info[key]
    return shortcuts


# ============================================================================
# Global Session Manager Instance
# ============================================================================

_session_manager = None

def get_session_manager() -> SessionManager:
    """Get or create global session manager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
