from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.incident_assignment import IncidentAssignment
from app.models.user import User
from app.models.company import Company


def build_assigned_engineers(db: Session, incident_id: int):
    assignments = (
        db.query(IncidentAssignment, User)
        .join(User, IncidentAssignment.engineer_id == User.id)
        .filter(IncidentAssignment.incident_id == incident_id)
        .all()
    )

    engineers = []
    for assignment, user in assignments:
        engineers.append({
            "id": user.id,
            "username": user.username,
            "name": user.name,
        })

    return engineers


def build_incident_response(db: Session, incident: Incident):
    creator = db.query(User).filter(User.id == incident.created_by).first()
    company = db.query(Company).filter(Company.id == incident.company_id).first()

    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "image_url": incident.image_url,
        "status": incident.status,
        "created_by": incident.created_by,
        "company_id": incident.company_id,
        "location": incident.location,
        "created_at": incident.created_at,
        "updated_at": incident.updated_at,
        "company_name": company.name if company else None,
        "created_by_username": creator.username if creator else None,
        "created_by_name": creator.name if creator else None,
        "created_by_role": creator.role if creator else None,
        "assigned_engineers": build_assigned_engineers(db, incident.id),
    }


def build_update_response(db: Session, update: IncidentUpdate):
    updater = db.query(User).filter(User.id == update.updated_by).first()

    return {
        "id": update.id,
        "incident_id": update.incident_id,
        "updated_by": update.updated_by,
        "note": update.note,
        "image_url": update.image_url,
        "status": update.status,
        "created_at": update.created_at,
        "updated_by_username": updater.username if updater else None,
        "updated_by_name": updater.name if updater else None,
        "updated_by_role": updater.role if updater else None,
    }


def create_incident(db: Session, incident_data, current_user: User):
    # Only clients should create incidents
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can create incidents")

    db_incident = Incident(
        title=incident_data.title.strip(),
        description=incident_data.description.strip(),
        image_url=incident_data.image_url,
        status="pending",
        created_by=current_user.id,
        company_id=current_user.company_id,
        location=incident_data.location,
    )

    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    return build_incident_response(db, db_incident)


def get_all_incidents(db: Session):
    incidents = db.query(Incident).order_by(Incident.id.desc()).all()
    return [build_incident_response(db, incident) for incident in incidents]


def get_incident_by_id(db: Session, incident_id: int):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    return build_incident_response(db, incident)


def get_open_incidents_for_engineers(db: Session):
    incidents = (
        db.query(Incident)
        .filter(Incident.status.in_(["pending", "in_progress", "completed"]))
        .order_by(Incident.id.desc())
        .all()
    )
    return [build_incident_response(db, incident) for incident in incidents]


def get_client_incidents(db: Session, current_user: User):
    incidents = (
        db.query(Incident)
        .filter(Incident.created_by == current_user.id)
        .order_by(Incident.id.desc())
        .all()
    )
    return [build_incident_response(db, incident) for incident in incidents]


def get_assignment_count(db: Session, incident_id: int):
    return (
        db.query(IncidentAssignment)
        .filter(IncidentAssignment.incident_id == incident_id)
        .count()
    )


def is_engineer_already_assigned(db: Session, incident_id: int, engineer_id: int):
    assignment = (
        db.query(IncidentAssignment)
        .filter(
            IncidentAssignment.incident_id == incident_id,
            IncidentAssignment.engineer_id == engineer_id,
        )
        .first()
    )
    return assignment is not None


def assign_engineer(db: Session, incident_id: int, current_user: User):
    if current_user.role != "engineer":
        raise HTTPException(status_code=403, detail="Only engineers can accept incidents")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.status in ["completed", "verified"]:
        raise HTTPException(
            status_code=400,
            detail="This incident is no longer open for assignment",
        )

    if is_engineer_already_assigned(db, incident_id, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="You are already assigned to this incident",
        )

    current_count = get_assignment_count(db, incident_id)
    if current_count >= 3:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 3 engineers already assigned",
        )

    assignment = IncidentAssignment(
        incident_id=incident.id,
        engineer_id=current_user.id,
    )

    db.add(assignment)

    if incident.status == "pending":
        incident.status = "in_progress"

    db.commit()
    db.refresh(incident)

    return {
        "message": "Engineer assigned successfully",
        "incident_id": incident.id,
        "status": incident.status,
        "assigned_engineers_count": get_assignment_count(db, incident.id),
        "assigned_engineers": build_assigned_engineers(db, incident.id),
    }


def add_engineer_update(db: Session, incident_id: int, update_data, current_user: User):
    if current_user.role != "engineer":
        raise HTTPException(status_code=403, detail="Only engineers can add updates")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not is_engineer_already_assigned(db, incident_id, current_user.id):
        raise HTTPException(status_code=403, detail="You are not assigned to this incident")

    if incident.status not in ["in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Incident is not active")

    db_update = IncidentUpdate(
        incident_id=incident.id,
        updated_by=current_user.id,
        note=update_data.note,
        image_url=update_data.image_url,
        status=incident.status,
    )

    db.add(db_update)
    db.commit()
    db.refresh(db_update)

    return build_update_response(db, db_update)


def complete_incident(db: Session, incident_id: int, update_data, current_user: User):
    if current_user.role != "engineer":
        raise HTTPException(status_code=403, detail="Only engineers can complete incidents")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not is_engineer_already_assigned(db, incident_id, current_user.id):
        raise HTTPException(status_code=403, detail="You are not assigned to this incident")

    if incident.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Only in-progress incidents can be completed",
        )

    incident.status = "completed"

    db_update = IncidentUpdate(
        incident_id=incident.id,
        updated_by=current_user.id,
        note=update_data.note,
        image_url=update_data.image_url,
        status="completed",
    )

    db.add(db_update)
    db.commit()
    db.refresh(incident)

    return build_incident_response(db, incident)


def get_incident_updates(db: Session, incident_id: int):
    updates = (
        db.query(IncidentUpdate)
        .filter(IncidentUpdate.incident_id == incident_id)
        .order_by(IncidentUpdate.id.asc())
        .all()
    )
    return [build_update_response(db, update) for update in updates]


def verify_incident(db: Session, incident_id: int, update_data, current_user: User):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can verify incidents")

    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.company_id != current_user.company_id:
        raise HTTPException(
            status_code=403,
            detail="You can only verify incidents from your company",
        )

    if incident.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Only completed incidents can be verified",
        )

    incident.status = "verified"

    db_update = IncidentUpdate(
        incident_id=incident.id,
        updated_by=current_user.id,
        note=update_data.note,
        image_url=update_data.image_url,
        status="verified",
    )

    db.add(db_update)
    db.commit()
    db.refresh(incident)

    return build_incident_response(db, incident)