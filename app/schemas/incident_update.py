from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IncidentUpdateCreate(BaseModel):
    note: Optional[str] = None
    image_url: Optional[str] = None


class IncidentUpdateResponse(BaseModel):
    id: int
    incident_id: int
    updated_by: int
    note: Optional[str]
    image_url: Optional[str]
    status: str
    created_at: datetime

    # enriched fields
    updated_by_username: Optional[str] = None
    updated_by_name: Optional[str] = None
    updated_by_role: Optional[str] = None

    class Config:
        from_attributes = True