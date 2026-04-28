from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.auth import authenticate_user
from app.schemas.user import ChangePasswordRequest
from app.utils.security import (
    create_access_token,
    get_current_user,
    verify_password,
    hash_password
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "user_id": user.id
        },
        expires_delta=timedelta(minutes=60)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "name": current_user.name,
        "role": current_user.role,
        "company_id": current_user.company_id
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.password):
        raise HTTPException(
            status_code=400,
            detail="Old password is incorrect"
        )

    if not data.new_password or len(data.new_password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters long"
        )

    if verify_password(data.new_password, current_user.password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from old password"
        )

    current_user.password = hash_password(data.new_password)

    db.commit()
    db.refresh(current_user)

    return {"message": "Password updated successfully"}