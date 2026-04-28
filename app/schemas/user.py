from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    # Full name of the user
    name: str

    # Role of the user: admin, client, or engineer
    role: str

    # Raw password entered at creation time
    password: str

    # Company ID is required for clients, auto-assigned for admin/engineer
    company_id: Optional[int] = None


class UserResponse(BaseModel):
    # Internal database ID
    id: int

    # Generated login ID like ADMIN0001 / ENG0001 / CL0001
    username: str

    # User role
    role: str

    # Full name
    name: str

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    # Optional new name
    name: Optional[str] = None

    # Optional new password
    password: Optional[str] = None

    # Optional company reassignment
    company_id: Optional[int] = None

    # Optional account active/inactive flag
    is_active: Optional[bool] = None


class LoginRequest(BaseModel):
    # Username for login
    username: str

    # Password for login
    password: str


class TokenResponse(BaseModel):
    # JWT token returned after successful login
    access_token: str

    # Token type, usually bearer
    token_type: str


class ChangePasswordRequest(BaseModel):
    # User's current password for verification
    old_password: str

    # New password to replace the old one
    new_password: str