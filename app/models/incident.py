from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    # Primary key for each incident
    id = Column(Integer, primary_key=True, index=True)

    # Short title for the issue
    title = Column(String, nullable=False)

    # Full explanation of the issue from the client
    description = Column(Text, nullable=False)

    # Optional image path or URL showing the damaged line
    image_url = Column(String, nullable=True)

    # Current state of the incident
    # pending -> in_progress -> completed -> verified
    status = Column(String, default="pending", nullable=False)

    # The client user who created the complaint
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # The company tied to this incident
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    # Optional location text for where the issue happened
    location = Column(String, nullable=True)

    # Auto timestamp when incident is created
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Auto timestamp whenever incident is updated
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())