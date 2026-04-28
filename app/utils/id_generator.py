from app.models.user import User

def generate_user_id(db, role: str):
    prefix_map = {
        "client": "CL",
        "engineer": "ENG",
        "admin": "ADMIN"
    }

    prefix = prefix_map.get(role)

    last_user = db.query(User).filter(User.role == role).order_by(User.id.desc()).first()

    if last_user and last_user.username:
        last_number = int(last_user.username.replace(prefix, ""))
        new_number = last_number + 1
    else:
        new_number = 1

    return f"{prefix}{str(new_number).zfill(4)}"