from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.security import require_admin
from app.crud.dashboard import get_admin_dashboard_data

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin")
def admin_dashboard_data(
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin)
):
    # Return all dashboard data for admin users only
    return get_admin_dashboard_data(db)