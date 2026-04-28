from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AssignedEngineerResponse(BaseModel):
    id: int
    username: str
    name: str

    class Config:
        from_attributes = True


class IncidentCreate(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = None
    location: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    image_url: Optional[str]
    status: str
    created_by: int
    company_id: int
    location: Optional[str]
    created_at: datetime
    updated_at: datetime

    # enriched fields
    company_name: Optional[str] = None
    created_by_username: Optional[str] = None
    created_by_name: Optional[str] = None
    created_by_role: Optional[str] = None
    assigned_engineers: List[AssignedEngineerResponse] = []

    class Config:
        from_attributes = True