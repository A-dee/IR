# BCN Incident Reporting Platform

A role-based incident management system for tracking and resolving infrastructure incidents. Clients report issues, engineers accept and resolve them, and admins oversee the entire process.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) + OAuth2 |
| Frontend | React 18 + React Router 7 |
| Bundler | Vite 5 |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally)

---

## Setup

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd ir
```

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE incidence_db;
```

### 3. Backend setup

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Update the database credentials in `app/database.py` if your PostgreSQL user/password differs from the defaults (`postgres` / `levi123`).

> **Security note:** Before deploying to production, move the database URL and `SECRET_KEY` in `app/utils/security.py` to environment variables or a `.env` file.

### 4. Seed the database (first-time setup)

This creates the tables and inserts a default admin and demo client:

```bash
python seed.py
```

Default credentials created by the seed script:

| Role | Username | Password |
|---|---|---|
| Admin | `ADMIN0001` | `admin1234` |
| Client | `CL0001` | `client1234` |

**Change these passwords after first login.**

The admin can create additional engineers and clients from the Admin Dashboard.

### 5. Start the backend

```bash
uvicorn app.main:app --reload
```

Backend runs at: `http://127.0.0.1:8000`  
Interactive API docs: `http://127.0.0.1:8000/docs`

### 6. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## User Roles

### Admin
- Creates and manages all users (admins, engineers, clients)
- Views all incidents across all companies
- Monitors engineer workload and incident stats from the dashboard

### Engineer
- Accepts open incidents (max 3 engineers per incident)
- Posts progress updates with notes and images
- Marks incidents as completed

### Client
- Reports new incidents (title, description, location, image)
- Tracks the status of their own incidents
- Verifies an incident is resolved (closes the workflow)

---

## Incident Workflow

```
Client reports incident
        ↓  (status: pending)
Engineer accepts
        ↓  (status: in_progress — automatic)
Engineer posts updates
        ↓
Engineer marks complete
        ↓  (status: completed)
Client verifies resolution
        ↓  (status: verified)
        ✓  Closed
```

---

## Auto-generated Usernames

Usernames are generated automatically when an admin creates a user:

| Role | Format | Example |
|---|---|---|
| Client | `CL0001`, `CL0002`, … | `CL0042` |
| Engineer | `ENG0001`, `ENG0002`, … | `ENG0007` |
| Admin | `ADMIN0001`, `ADMIN0002`, … | `ADMIN0002` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current user info |
| POST | `/auth/change-password` | Change own password |
| POST | `/admin/create-user` | Create a new user (admin only) |
| GET | `/admin/users` | List all users (admin only) |
| PUT | `/admin/users/{id}` | Update user details (admin only) |
| PATCH | `/admin/users/{id}/deactivate` | Deactivate a user (admin only) |
| GET | `/dashboard/admin` | Full dashboard stats (admin only) |
| POST | `/incidents/` | Report a new incident (client) |
| GET | `/incidents/client/my` | Client's own incidents |
| GET | `/incidents/engineer/all` | All open incidents (engineer) |
| POST | `/incidents/{id}/accept` | Accept an incident (engineer) |
| POST | `/incidents/{id}/update` | Post a progress update (engineer) |
| POST | `/incidents/{id}/complete` | Mark incident complete (engineer) |
| POST | `/incidents/{id}/verify` | Verify resolution (client) |
| GET | `/incidents/{id}/updates` | View update history |

Full interactive docs available at `/docs` when the backend is running.

---

## Project Structure

```
ir/
├── app/                    # FastAPI backend
│   ├── crud/               # Business logic
│   ├── models/             # SQLAlchemy database models
│   ├── routers/            # API route handlers
│   ├── schemas/            # Pydantic request/response schemas
│   ├── utils/              # Security (JWT, hashing) + ID generation
│   ├── database.py         # DB connection and session
│   └── main.py             # App entry point
├── frontend/               # React frontend
│   └── src/
│       ├── context/        # Auth state (AuthContext)
│       ├── components/     # Shared components (ProtectedRoute)
│       ├── pages/          # LoginPage, AdminDashboard, EngineerDashboard, ClientDashboard
│       └── lib/            # API client, auth helpers
├── seed.py                 # Database seeding script
├── requirements.txt        # Python dependencies
└── README.md
```
