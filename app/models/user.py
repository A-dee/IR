from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)  # CL0001
    password = Column(String)
    role = Column(String)  # admin, client, engineer
    name = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    is_active = Column(Boolean, default=True)