from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class IncidentAssignment(Base):
    __tablename__ = "incident_assignments"

    # Primary key for each assignment record
    id = Column(Integer, primary_key=True, index=True)

    # The incident being assigned
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)

    # The engineer assigned to the incident
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # When the engineer was assigned
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())