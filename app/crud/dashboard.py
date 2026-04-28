from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.incident import Incident
from app.models.company import Company
from app.models.user import User
from app.models.incident_assignment import IncidentAssignment


def get_dashboard_summary(db: Session):
    # Count all incidents in the system
    total_incidents = db.query(Incident).count()

    # Count incidents by workflow status
    pending_count = db.query(Incident).filter(Incident.status == "pending").count()
    in_progress_count = db.query(Incident).filter(Incident.status == "in_progress").count()
    completed_count = db.query(Incident).filter(Incident.status == "completed").count()
    verified_count = db.query(Incident).filter(Incident.status == "verified").count()

    # Return a clean summary block for the dashboard
    return {
        "total_incidents": total_incidents,
        "pending": pending_count,
        "in_progress": in_progress_count,
        "completed": completed_count,
        "verified": verified_count
    }


def get_incidents_by_company(db: Session):
    # Count incidents grouped by company name
    results = (
        db.query(
            Company.name.label("company_name"),
            func.count(Incident.id).label("incident_count")
        )
        .join(Incident, Incident.company_id == Company.id)
        .group_by(Company.name)
        .order_by(func.count(Incident.id).desc())
        .all()
    )

    # Convert SQLAlchemy result rows into normal dictionaries
    return [
        {
            "company_name": row.company_name,
            "incident_count": row.incident_count
        }
        for row in results
    ]


def get_engineer_workload(db: Session):
    # Count how many incident assignments each engineer currently has
    results = (
        db.query(
            User.id.label("engineer_id"),
            User.name.label("engineer_name"),
            User.username.label("engineer_username"),
            func.count(IncidentAssignment.id).label("assigned_incidents")
        )
        .outerjoin(IncidentAssignment, IncidentAssignment.engineer_id == User.id)
        .filter(User.role == "engineer")
        .group_by(User.id, User.name, User.username)
        .order_by(func.count(IncidentAssignment.id).desc(), User.id.asc())
        .all()
    )

    # Convert query results to plain dictionaries
    return [
        {
            "engineer_id": row.engineer_id,
            "engineer_name": row.engineer_name,
            "engineer_username": row.engineer_username,
            "assigned_incidents": row.assigned_incidents
        }
        for row in results
    ]


def get_admin_dashboard_data(db: Session):
    # Combine all dashboard parts into one response for the admin frontend
    return {
        "summary": get_dashboard_summary(db),
        "incidents_by_company": get_incidents_by_company(db),
        "engineer_workload": get_engineer_workload(db)
    }