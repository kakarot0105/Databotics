# PHASE 5: Session Management & Advanced UX

## Overview
Professional session management system with full state persistence, undo/redo stack, keyboard shortcuts, and session import/export for seamless analysis workflows.

## Core Features

1. **Session Management**
   - Save/load analysis sessions with full state
   - Auto-save capability
   - Session export/import (zip format)
   - Session listing with metadata

2. **Undo/Redo Stack**
   - Full operation history
   - Configurable max history (default: 50 steps)
   - State snapshots for perfect restoration
   - Redo after undo

3. **Keyboard Shortcuts**
   - Platform-aware (Windows/Mac)
   - Standard hotkeys (Cmd/Ctrl + S, Z, Y, E, etc.)
   - Customizable
   - Help overlay display

4. **UI State Persistence**
   - Selected columns
   - Active visualizations
   - Filters and preferences
   - Theme settings

---

## Session Management Module (`app/sessions.py`)

### `SessionManager`

Manages persistent session storage with file-based backend.

#### Methods

##### `create_session(filename, df, user_id=None) -> AnalysisState`
Create new session from DataFrame.

```python
manager = SessionManager()
state = manager.create_session('data.csv', df, user_id='user123')
# state.session_id → unique session identifier
```

**Returns**:
```python
AnalysisState(
    session_id='abc-123-def',
    filename='data.csv',
    created_at='2026-02-16T10:30:00',
    data_shape=(2500, 15),
    columns=[...],
    operations=[],
)
```

##### `save_state(state) -> bool`
Save current analysis state.

```python
state.selected_columns = ['product_category', 'total_sale']
state.theme = 'dark'
manager.save_state(state)
```

##### `load_state(session_id) -> AnalysisState`
Load saved state.

```python
state = manager.load_state('abc-123-def')
print(f"Theme: {state.theme}")
print(f"Selected: {state.selected_columns}")
```

##### `load_data(session_id) -> pd.DataFrame`
Load session's DataFrame.

```python
df = manager.load_data('abc-123-def')
# Full data is available
```

##### `list_sessions(user_id=None) -> List[SessionMetadata]`
List all sessions (optionally filtered by user).

```python
sessions = manager.list_sessions(user_id='user123')
for s in sessions:
    print(f"{s.filename} - {s.data_shape[0]} rows")
```

**Returns**:
```python
[
    SessionMetadata(
        session_id='abc-123',
        filename='data.csv',
        created_at='2026-02-16T10:30:00',
        last_modified='2026-02-16T10:45:00',
        data_shape=(2500, 15),
        size_kb=150.5,
    ),
]
```

##### `delete_session(session_id) -> bool`
Delete session (data + state).

##### `export_session(session_id, output_path) -> bool`
Export session to .zip file.

```python
manager.export_session('abc-123', '/downloads/analysis.zip')
# Contains: data.parquet + state.json
```

##### `import_session(import_path) -> str`
Import session from .zip file.

```python
new_id = manager.import_session('/downloads/analysis.zip')
# Returns new session_id
```

---

### `UndoRedoManager`

Manages undo/redo operation history.

#### Methods

##### `record_operation(operation, state_snapshot)`
Record operation for undo.

```python
manager = UndoRedoManager(max_steps=50)

operation = {
    'name': 'Remove duplicates',
    'rows_removed': 30,
}

state_before = {
    'shape': (2530, 15),
    'missing_values': 75,
}

manager.record_operation(operation, state_before)
```

##### `undo() -> Dict`
Undo last operation.

```python
if manager.can_undo():
    state_to_restore = manager.undo()
    restore_ui_state(state_to_restore)
```

##### `redo() -> Dict`
Redo last undone operation.

```python
if manager.can_redo():
    state_to_restore = manager.redo()
    restore_ui_state(state_to_restore)
```

##### `can_undo() -> bool`, `can_redo() -> bool`
Check availability.

##### `get_undo_description()`, `get_redo_description()`
Get user-friendly descriptions.

```python
print(f"Undo: {manager.get_undo_description()}")
# Output: "Undo: Remove duplicates"
```

---

## API Endpoints

### Session Management

#### `POST /session/save`
Save current session.

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@data.csv" \
  -F "session_data={...}" \
  https://api.databotics.com/session/save
```

**Request Body** (form data):
- `file`: CSV/Excel file
- `session_data` (optional): JSON with analysis state

```json
{
  "selected_columns": ["product_category", "total_sale"],
  "theme": "dark",
  "active_visualization": "scatter_plot",
  "filters": {"country": "USA"}
}
```

**Response**:
```json
{
  "session_id": "abc-123-def",
  "filename": "data.csv",
  "created_at": "2026-02-16T10:30:00",
  "data_shape": [2500, 15]
}
```

#### `GET /session/list`
List all sessions for user.

**Response**:
```json
{
  "sessions": [
    {
      "session_id": "abc-123",
      "filename": "data.csv",
      "created_at": "2026-02-16T10:30:00",
      "last_modified": "2026-02-16T10:45:00",
      "data_shape": [2500, 15],
      "size_kb": 150.5
    }
  ],
  "count": 1
}
```

#### `POST /session/load/{session_id}`
Load saved session.

**Response**:
```json
{
  "session_id": "abc-123",
  "filename": "data.csv",
  "created_at": "2026-02-16T10:30:00",
  "data_shape": [2500, 15],
  "columns": ["order_id", "customer_id", ...],
  "operations": [
    {"name": "Remove duplicates", "rows_removed": 30}
  ],
  "insights": {...},
  "selected_columns": ["product_category", "total_sale"],
  "active_visualization": "scatter_plot",
  "theme": "dark",
  "filters": {"country": "USA"}
}
```

#### `DELETE /session/{session_id}`
Delete a session.

#### `POST /session/export/{session_id}`
Export session as .zip file.

**Response**: Binary .zip file with:
- `data.parquet` — DataFrame
- `state.json` — Full analysis state

#### `POST /session/import`
Import session from .zip file.

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@session.zip" \
  https://api.databotics.com/session/import
```

**Response**:
```json
{
  "session_id": "new-abc-123",
  "filename": "data.csv",
  "created_at": "2026-02-16T11:00:00"
}
```

#### `GET /shortcuts`
Get platform-specific keyboard shortcuts.

**Query Parameters**:
- `platform`: 'windows' or 'mac' (default: 'windows')

**Response**:
```json
{
  "platform": "mac",
  "shortcuts": {
    "save": "Cmd+S",
    "undo": "Cmd+Z",
    "redo": "Cmd+Shift+Z",
    "export": "Cmd+E",
    "new": "Cmd+N",
    "open": "Cmd+O"
  },
  "all_shortcuts": {
    "save": {
      "mac": "Cmd+S",
      "windows": "Ctrl+S",
      "action": "Save current session"
    },
    ...
  }
}
```

---

## Keyboard Shortcuts

### Built-in Shortcuts

| Action | Windows | Mac | Purpose |
|--------|---------|-----|---------|
| Save | Ctrl+S | Cmd+S | Save current session |
| Undo | Ctrl+Z | Cmd+Z | Undo last operation |
| Redo | Ctrl+Y | Cmd+Shift+Z | Redo last undone operation |
| Export | Ctrl+E | Cmd+E | Export current session |
| New | Ctrl+N | Cmd+N | Start new session |
| Open | Ctrl+O | Cmd+O | Open previous session |

---

## Session State

### `AnalysisState` Model

```python
class AnalysisState(BaseModel):
    session_id: str              # Unique identifier
    user_id: str                 # User who created session
    filename: str                # Original filename
    created_at: str              # ISO timestamp
    last_modified: str           # Last update time
    
    # Data info
    data_shape: tuple            # (rows, columns)
    columns: List[str]           # Column names
    
    # Analysis history
    operations: List[Dict]       # List of operations performed
    insights: Optional[Dict]     # Generated insights cache
    
    # UI state
    selected_columns: List[str]  # Currently selected columns
    active_visualization: str    # Active chart type
    filters: Dict[str, Any]      # Applied filters
    theme: str                   # 'light' or 'dark'
    
    # Analysis results cache
    correlations: Optional[Dict] # Cached correlation matrix
    outliers: Optional[Dict]     # Cached outlier detection
    distributions: Optional[Dict] # Cached distributions
    
    # Undo/Redo
    undo_stack: List[Dict]       # Operation history
    redo_stack: List[Dict]       # Redo history
```

---

## Storage Structure

### File System Layout

```
~/.databotics_sessions/
├── data/
│   ├── abc-123-def.parquet    # Session DataFrame
│   ├── xyz-456-ghi.parquet
│   └── ...
└── state/
    ├── abc-123-def.json       # Session state/metadata
    ├── xyz-456-ghi.json
    └── ...
```

### Session File Format

**state.json**:
```json
{
  "session_id": "abc-123-def",
  "user_id": "user123",
  "filename": "data.csv",
  "created_at": "2026-02-16T10:30:00",
  "last_modified": "2026-02-16T10:45:00",
  "data_shape": [2500, 15],
  "columns": [...],
  "selected_columns": ["product_category", "total_sale"],
  "theme": "dark",
  "operations": [
    {
      "name": "Remove duplicates",
      "timestamp": "2026-02-16T10:31:00",
      "rows_removed": 30
    }
  ],
  "insights": {...},
  "undo_stack": [...],
  "redo_stack": [...]
}
```

---

## Frontend Integration

### React Implementation Example

```typescript
import { useCallback, useState } from 'react';

function AnalysisApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Save session (Ctrl+S / Cmd+S)
  const handleSave = useCallback(async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('session_data', JSON.stringify({
      selected_columns: selectedColumns,
      theme: currentTheme,
      active_visualization: activeChart,
      filters: currentFilters,
    }));

    const response = await fetch('/session/save', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const { session_id } = await response.json();
    setSessionId(session_id);
    showNotification('Session saved');
  }, [selectedFile, selectedColumns, currentTheme, activeChart, currentFilters]);

  // Load session (Ctrl+O / Cmd+O)
  const handleOpen = useCallback(async (id: string) => {
    const response = await fetch(`/session/load/${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const state = await response.json();
    restoreUIState(state);
    setSessionId(id);
  }, []);

  // Export session (Ctrl+E / Cmd+E)
  const handleExport = useCallback(async () => {
    const response = await fetch(`/session/export/${sessionId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const blob = await response.blob();
    downloadFile(blob, `session-${sessionId}.zip`);
  }, [sessionId]);

  // Undo (Ctrl+Z / Cmd+Z)
  const handleUndo = useCallback(async () => {
    // Send undo request to backend or handle locally
    // Roll back to previous state snapshot
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (modifier && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      if (modifier && e.key === 'o') {
        e.preventDefault();
        showSessionSelector();
      }
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((modifier && e.key === 'y') || (modifier && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExport, handleUndo, handleRedo]);

  return (
    <div>
      <SessionHeader 
        sessionId={sessionId} 
        onSave={handleSave}
        onExport={handleExport}
        onOpen={handleOpen}
      />
      
      <AnalysisPanel>
        {/* Analysis tools */}
      </AnalysisPanel>

      <SessionList onLoadSession={handleOpen} />
    </div>
  );
}
```

### Keyboard Shortcut Display

```typescript
function ShortcutHelp() {
  const [shortcuts, setShortcuts] = useState({});
  const platform = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? 'mac' : 'windows';

  useEffect(() => {
    fetch(`/shortcuts?platform=${platform}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setShortcuts(data.shortcuts));
  }, [platform]);

  return (
    <div className="shortcuts-overlay">
      <h3>Keyboard Shortcuts</h3>
      <table>
        <tbody>
          {Object.entries(shortcuts).map(([action, shortcut]) => (
            <tr key={action}>
              <td>{action.replace('_', ' ')}</td>
              <td><kbd>{shortcut}</kbd></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Best Practices

### Session Management
1. **Auto-save**: Enable in settings for background persistence
2. **Regular exports**: Export important analyses periodically
3. **Session naming**: Use descriptive filenames for sessions
4. **Cleanup**: Delete old sessions to free storage

### Undo/Redo
1. **Record meaningful operations**: Use descriptive names
2. **State snapshots**: Always capture state before operations
3. **Limit history**: Keep default 50-step limit for performance
4. **Clear on destructive**: Clear redo after new operations

### Keyboard Shortcuts
1. **Display help**: Show shortcut overlay on first load
2. **Respect platform**: Use OS-appropriate shortcuts
3. **Consistency**: Follow standard conventions (Ctrl/Cmd + letter)
4. **Accessibility**: Always provide menu alternatives

---

## Example Workflow

```
1. Upload Data
   → User selects CSV file
   → Auto-create session

2. Explore Analysis
   → Generate insights
   → Create visualizations
   → Apply filters
   → (Ctrl+S to save periodically)

3. Clean Data
   → Detect issues (Ctrl+Z to undo if needed)
   → Apply transformations
   → Verify results

4. Export Results
   → Save session (Ctrl+S)
   → Export as zip (Ctrl+E)
   → Download clean data

5. Later Session
   → Open previous session (Ctrl+O)
   → All state restored
   → Continue analysis

6. Share
   → Export session (Ctrl+E)
   → Send zip file
   → Recipient imports (POST /session/import)
   → Full context restored
```

---

## Performance Optimization

- Session data stored as compressed Parquet (60-70% smaller than CSV)
- State as JSON for fast load/save
- Undo stack limited to configurable size
- Auto-cleanup of old sessions (optional)

---

**Last Updated**: 2026-02-16  
**Status**: Complete with session persistence and keyboard shortcuts  
**Next**: PHASE 6 - Premium UI Polish
