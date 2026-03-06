"""
FastAPI router for dashboard management with drag-and-drop layout support.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship, Session
from datetime import datetime, timedelta
from typing import Optional
import uuid

from app.db import Base, get_db

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])

# ---- Models ----

class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024))
    layout_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    widgets = relationship("DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan")
    shares = relationship("DashboardShare", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"
    
    id = Column(Integer, primary_key=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)
    widget_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    config = Column(JSON, nullable=True)
    position = Column(JSON, nullable=True)
    size = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dashboard = relationship("Dashboard", back_populates="widgets")


class DashboardShare(Base):
    __tablename__ = "dashboard_shares"
    
    id = Column(Integer, primary_key=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dashboard = relationship("Dashboard", back_populates="shares")


# ---- Schemas ----

class DashboardWidgetResponse(BaseModel):
    id: int
    dashboard_id: int
    widget_type: str
    title: str
    config: Optional[dict] = None
    position: Optional[dict] = None
    size: Optional[dict] = None
    
    class Config:
        from_attributes = True


class DashboardListItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    widget_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    layout_config: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    widget_count: int
    widgets: list[DashboardWidgetResponse]
    
    class Config:
        from_attributes = True


class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    layout_config: Optional[dict] = None


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout_config: Optional[dict] = None


class DashboardWidgetCreate(BaseModel):
    widget_type: str
    title: str
    config: Optional[dict] = None
    position: Optional[dict] = None
    size: Optional[dict] = None


class DashboardWidgetUpdate(BaseModel):
    title: Optional[str] = None
    config: Optional[dict] = None
    position: Optional[dict] = None
    size: Optional[dict] = None


# ---- Endpoints ----

@router.get("", response_model=list[DashboardListItem])
def list_dashboards(db: Session = Depends(get_db)):
    """List all dashboards with widget counts."""
    dashboards = db.query(Dashboard).order_by(Dashboard.updated_at.desc()).all()
    result = []
    for d in dashboards:
        result.append(DashboardListItem(
            id=d.id,
            name=d.name,
            description=d.description,
            widget_count=len(d.widgets),
            created_at=d.created_at,
            updated_at=d.updated_at,
        ))
    return result


@router.post("", response_model=DashboardResponse)
def create_dashboard(payload: DashboardCreate, db: Session = Depends(get_db)):
    """Create a new dashboard."""
    dashboard = Dashboard(
        name=payload.name,
        description=payload.description,
        layout_config=payload.layout_config,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return DashboardResponse(
        id=dashboard.id,
        name=dashboard.name,
        description=dashboard.description,
        layout_config=dashboard.layout_config,
        created_at=dashboard.created_at,
        updated_at=dashboard.updated_at,
        widget_count=0,
        widgets=[],
    )


@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db)):
    """Get dashboard by ID with all widgets."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    return DashboardResponse(
        id=dashboard.id,
        name=dashboard.name,
        description=dashboard.description,
        layout_config=dashboard.layout_config,
        created_at=dashboard.created_at,
        updated_at=dashboard.updated_at,
        widget_count=len(dashboard.widgets),
        widgets=[DashboardWidgetResponse.from_orm(w) for w in dashboard.widgets],
    )


@router.put("/{dashboard_id}", response_model=DashboardResponse)
def update_dashboard(dashboard_id: int, payload: DashboardUpdate, db: Session = Depends(get_db)):
    """Update dashboard metadata and layout."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    if payload.name is not None:
        dashboard.name = payload.name
    if payload.description is not None:
        dashboard.description = payload.description
    if payload.layout_config is not None:
        dashboard.layout_config = payload.layout_config
    
    db.commit()
    db.refresh(dashboard)
    
    return DashboardResponse(
        id=dashboard.id,
        name=dashboard.name,
        description=dashboard.description,
        layout_config=dashboard.layout_config,
        created_at=dashboard.created_at,
        updated_at=dashboard.updated_at,
        widget_count=len(dashboard.widgets),
        widgets=[DashboardWidgetResponse.from_orm(w) for w in dashboard.widgets],
    )


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db)):
    """Delete a dashboard."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    db.delete(dashboard)
    db.commit()
    return {"deleted": True, "dashboard_id": dashboard_id}


@router.post("/{dashboard_id}/widgets", response_model=DashboardWidgetResponse)
def add_widget(dashboard_id: int, payload: DashboardWidgetCreate, db: Session = Depends(get_db)):
    """Add widget to dashboard."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    widget = DashboardWidget(
        dashboard_id=dashboard_id,
        widget_type=payload.widget_type,
        title=payload.title,
        config=payload.config,
        position=payload.position,
        size=payload.size,
    )
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return DashboardWidgetResponse.from_orm(widget)


@router.put("/{dashboard_id}/widgets/{widget_id}", response_model=DashboardWidgetResponse)
def update_widget(dashboard_id: int, widget_id: int, payload: DashboardWidgetUpdate, db: Session = Depends(get_db)):
    """Update widget configuration."""
    widget = db.query(DashboardWidget).filter(
        DashboardWidget.id == widget_id,
        DashboardWidget.dashboard_id == dashboard_id,
    ).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    if payload.title is not None:
        widget.title = payload.title
    if payload.config is not None:
        widget.config = payload.config
    if payload.position is not None:
        widget.position = payload.position
    if payload.size is not None:
        widget.size = payload.size
    
    db.commit()
    db.refresh(widget)
    return DashboardWidgetResponse.from_orm(widget)


@router.delete("/{dashboard_id}/widgets/{widget_id}")
def delete_widget(dashboard_id: int, widget_id: int, db: Session = Depends(get_db)):
    """Delete a widget."""
    widget = db.query(DashboardWidget).filter(
        DashboardWidget.id == widget_id,
        DashboardWidget.dashboard_id == dashboard_id,
    ).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    db.delete(widget)
    db.commit()
    return {"deleted": True, "widget_id": widget_id}


@router.post("/{dashboard_id}/share")
def share_dashboard(dashboard_id: int, expires_in_days: int = 7, db: Session = Depends(get_db)):
    """Generate a public share link."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days) if expires_in_days else None
    
    share = DashboardShare(
        dashboard_id=dashboard_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(share)
    db.commit()
    
    return {
        "dashboard_id": dashboard_id,
        "token": token,
        "expires_at": expires_at,
    }


@router.get("/shared/{token}", response_model=DashboardResponse)
def get_shared_dashboard(token: str, db: Session = Depends(get_db)):
    """View a shared dashboard (no auth required)."""
    share = db.query(DashboardShare).filter(DashboardShare.token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link expired")
    
    dashboard = share.dashboard
    return DashboardResponse(
        id=dashboard.id,
        name=dashboard.name,
        description=dashboard.description,
        layout_config=dashboard.layout_config,
        created_at=dashboard.created_at,
        updated_at=dashboard.updated_at,
        widget_count=len(dashboard.widgets),
        widgets=[DashboardWidgetResponse.from_orm(w) for w in dashboard.widgets],
    )
