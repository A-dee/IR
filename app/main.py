from fastapi import FastAPI
from app.database import Base, engine

from app.models.user import User
from app.models.company import Company
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.incident_assignment import IncidentAssignment

from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.incident import router as incident_router
from app.routers.dashboard import router as dashboard_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Create all database tables for imported models
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    # Simple app health check
    return {"message": "API running"}


# Register all routers
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(incident_router)
app.include_router(dashboard_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)