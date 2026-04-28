from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class IncidentUpdate(Base):
    __tablename__ = "incident_updates"

    # Primary key for each update entry
    id = Column(Integer, primary_key=True, index=True)

    # Which incident this update belongs to
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)

    # Which user added the update (usually engineer for now)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Optional text note about what was done on site
    note = Column(Text, nullable=True)

    # Optional image path / URL showing repair progress or completion proof
    image_url = Column(String, nullable=True)

    # Status snapshot at the time of the update
    # Example: in_progress or completed
    status = Column(String, nullable=False)

    # Timestamp of when the update was added
    created_at = Column(DateTime(timezone=True), server_default=func.now())