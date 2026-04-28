from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.crud.user import create_user, get_all_users, get_user_by_id, update_user, deactivate_user
from app.utils.security import require_admin
from app.models.incident import Incident  # make sure this import path matches your project

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/create-user", response_model=UserResponse)
def admin_create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Protected admin-only user creation
    return create_user(db, user)


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Count all incidents
    total_incidents = db.query(func.count(Incident.id)).scalar() or 0

    # Count incidents by status
    pending = db.query(func.count(Incident.id)).filter(Incident.status == "pending").scalar() or 0
    in_progress = db.query(func.count(Incident.id)).filter(Incident.status == "in_progress").scalar() or 0
    completed = db.query(func.count(Incident.id)).filter(Incident.status == "completed").scalar() or 0
    verified = db.query(func.count(Incident.id)).filter(Incident.status == "verified").scalar() or 0

    return {
        "message": f"Welcome {admin_user.name}",
        "role": admin_user.role,
        "summary": {
            "total_incidents": total_incidents,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "verified": verified,
        }
    }


@router.get("/users")
def admin_get_users(
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin fetches all users
    return get_all_users(db)


@router.get("/users/{user_id}")
def admin_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin fetches one user by ID
    return get_user_by_id(db, user_id)


@router.put("/users/{user_id}")
def admin_update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin updates a user
    return update_user(db, user_id, user)


@router.patch("/users/{user_id}/deactivate")
def admin_deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Admin deactivates a user
    return deactivate_user(db, user_id)