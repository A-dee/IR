from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.incident import IncidentCreate, IncidentResponse
from app.schemas.incident_update import IncidentUpdateCreate, IncidentUpdateResponse
from app.crud.incident import (
     create_incident,
    get_all_incidents,
    get_incident_by_id,
    assign_engineer,
    get_open_incidents_for_engineers,
    add_engineer_update,
    complete_incident,
    get_incident_updates,
    verify_incident,
    get_client_incidents
)
from app.utils.security import (
    get_current_user,
    require_admin,
    require_engineer
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post("/", response_model=IncidentResponse)
def create_new_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Logged-in client creates a new incident
    return create_incident(db, incident, current_user)


@router.get("/engineer/all")
def engineer_view_all_incidents(
    db: Session = Depends(get_db),
    engineer=Depends(require_engineer)
):
    # Engineers can view all active incidents in the system
    return get_open_incidents_for_engineers(db)


@router.post("/{incident_id}/accept")
def accept_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    engineer=Depends(require_engineer)
):
    # Engineer joins an incident team if fewer than 3 engineers are assigned
    return assign_engineer(db, incident_id, engineer)


@router.post("/{incident_id}/update", response_model=IncidentUpdateResponse)
def add_update_to_incident(
    incident_id: int,
    update: IncidentUpdateCreate,
    db: Session = Depends(get_db),
    engineer=Depends(require_engineer)
):
    # Assigned engineer adds work note or proof image
    return add_engineer_update(db, incident_id, update, engineer)


@router.post("/{incident_id}/complete")
def complete_single_incident(
    incident_id: int,
    update: IncidentUpdateCreate,
    db: Session = Depends(get_db),
    engineer=Depends(require_engineer)
):
    # Assigned engineer marks the incident completed
    return complete_incident(db, incident_id, update, engineer)


@router.post("/{incident_id}/verify")
def verify_single_incident(
    incident_id: int,
    update: IncidentUpdateCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Logged-in client confirms the work done
    return verify_incident(db, incident_id, update, current_user)


@router.get("/{incident_id}/updates")
def list_incident_updates(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Any logged-in user can view the update history for now
    return get_incident_updates(db, incident_id)


@router.get("/")
def list_all_incidents(
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin can see all incidents
    return get_all_incidents(db)

@router.get("/client/my")
def client_view_own_incidents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
    
):
    return get_client_incidents(db, current_user)

@router.get("/{incident_id}")
def get_single_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin can fetch a single incident
    return get_incident_by_id(db, incident_id)