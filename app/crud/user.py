from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.company import Company
from app.utils.security import hash_password, verify_password
from app.utils.id_generator import generate_user_id


def create_user(db: Session, user_data):
    # Normalize the incoming role to avoid case/spacing issues
    role = user_data.role.lower().strip()

    # Only allow expected roles
    if role not in ["admin", "client", "engineer"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Fetch BCN company because admins and engineers belong to BCN
    bcn_company = db.query(Company).filter(Company.name == "BCN").first()

    if not bcn_company:
        raise HTTPException(status_code=500, detail="BCN company not found in database")

    # Admins and engineers are tied to BCN automatically
    if role in ["admin", "engineer"]:
        company_id = bcn_company.id

    # Clients must belong to a valid external company like MTN or Airtel
    else:
        if user_data.company_id is None:
            raise HTTPException(status_code=400, detail="Clients must have a company_id")

        company = db.query(Company).filter(Company.id == user_data.company_id).first()

        if not company:
            raise HTTPException(status_code=400, detail="Invalid company_id")

        company_id = company.id

    # Generate system login ID like ADMIN0001 / ENG0001 / CL0001
    username = generate_user_id(db, role)

    # Create the user record
    db_user = User(
        username=username,
        name=user_data.name.strip(),
        role=role,
        password=hash_password(user_data.password),
        company_id=company_id
    )

    # Save to database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def get_all_users(db: Session):
    # Return every user for admin management
    return db.query(User).order_by(User.id.asc()).all()


def get_user_by_id(db: Session, user_id: int):
    # Fetch one user by ID
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def update_user(db: Session, user_id: int, user_data):
    # Fetch the user to update
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update name if provided
    if user_data.name is not None:
        user.name = user_data.name.strip()

    # Update password if provided
    if user_data.password is not None:
        user.password = hash_password(user_data.password)

    # Update active status if provided
    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    # Only clients should be reassigned to another company manually
    if user.role == "client" and user_data.company_id is not None:
        company = db.query(Company).filter(Company.id == user_data.company_id).first()

        if not company:
            raise HTTPException(status_code=400, detail="Invalid company_id")

        user.company_id = company.id

    # Save updates
    db.commit()
    db.refresh(user)

    return user


def deactivate_user(db: Session, user_id: int):
    # Fetch the user to deactivate
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Soft deactivate instead of deleting
    user.is_active = False

    db.commit()
    db.refresh(user)

    return user


def change_password(db: Session, user_id: int, old_password: str, new_password: str):
    # Get current user
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check old password
    if not verify_password(old_password, user.password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    # Prevent weak passwords
    if not new_password or len(new_password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters long"
        )

    # Prevent reuse of same password
    if verify_password(new_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from old password"
        )

    # Save new hashed password
    user.password = hash_password(new_password.strip())
    db.commit()
    db.refresh(user)

    return {"message": "Password changed successfully"}