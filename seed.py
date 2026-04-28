"""
Run this once after setting up the database to create the initial admin account
and an optional demo client account.

Usage:
    python seed.py
"""

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.company import Company
from app.utils.security import hash_password

# Create all tables if they don't exist yet
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # --- Admin user ---
    if not db.query(User).filter(User.username == "ADMIN0001").first():
        admin = User(
            username="ADMIN0001",
            name="System Admin",
            password=hash_password("admin1234"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        print("Created admin  →  username: ADMIN0001  |  password: admin1234")
    else:
        print("Admin ADMIN0001 already exists, skipping.")

    # --- Demo company + client user ---
    company = db.query(Company).filter(Company.name == "Demo Company").first()
    if not company:
        company = Company(name="Demo Company")
        db.add(company)
        db.flush()  # get the id before commit
        print("Created company → Demo Company")

    if not db.query(User).filter(User.username == "CL0001").first():
        client = User(
            username="CL0001",
            name="Demo Client",
            password=hash_password("client1234"),
            role="client",
            company_id=company.id,
            is_active=True,
        )
        db.add(client)
        print("Created client  →  username: CL0001     |  password: client1234")
    else:
        print("Client CL0001 already exists, skipping.")

    db.commit()
    print("\nSeeding complete. Change these passwords after first login.")

except Exception as e:
    db.rollback()
    print(f"Error during seeding: {e}")
    raise
finally:
    db.close()
