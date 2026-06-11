# VirtualBallot

A secure, multi-tenant online voting platform for organizations. Voters authenticate via OTP, cast ballots on a clean interface, and receive tamper-evident receipts. Admins manage elections, candidates, and voter rosters through a full dashboard. Observers monitor live results in real time via WebSocket.

**Live site:** [virtualballot.online](https://virtualballot.online)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [User Roles](#user-roles)
- [API Overview](#api-overview)
- [Security](#security)
- [Multi-Tenancy](#multi-tenancy)

---

## Features

- **OTP-based voter authentication** — voters enter their matric number and receive a one-time passcode via email
- **Tamper-evident receipts** — each ballot produces a unique receipt ID stored in an append-only log
- **Real-time results** — Socket.io pushes live vote counts to admins and observers instantly
- **Multi-tenancy** — one deployment serves multiple organizations, each isolated by a URL slug
- **Admin dashboard** — manage elections, candidates (with images, manifestos, colors), voter rosters, and branding
- **Observer access** — PIN-protected read-only view of live results with vote pulse animation
- **Audit logs** — append-only compliance log of every significant action
- **Tie handling** — built-in logic for detecting and surfacing tied results
- **Password reset** — admin accounts support email-based password recovery

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router DOM 7, Socket.io Client |
| Backend | Node.js, Express 4, Socket.io 4 |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens), Bcrypt, OTP via email |
| Email | Nodemailer (SMTP / Mailtrap) |
| Security | Helmet, CORS, Express Rate Limit |

---

## Project Structure

```
VirtualBallot/
├── Frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # Route-level page components
│   │   ├── components/     # Shared UI components
│   │   │   ├── admin/      # Admin dashboard tabs
│   │   │   ├── ballot/     # Voting UI widgets
│   │   │   ├── observer/   # Observer view components
│   │   │   └── results/    # Results display
│   │   ├── context/        # Global app state (AppContext, SlugContext)
│   │   └── api.js          # Centralized API fetch wrapper
│   ├── .env                # Frontend environment variables
│   └── package.json
│
└── VBackend/               # Node.js + Express backend
    ├── src/
    │   ├── routes/         # Express route handlers
    │   ├── middleware/      # JWT auth middleware
    │   ├── db/             # DB pool, schema setup, seed scripts
    │   └── utils/          # OTP, JWT, email, receipt ID helpers
    ├── .env                # Backend environment variables
    └── package.json
```

---

## Prerequisites

- **Node.js** 18 or later
- **PostgreSQL** 15 or later
- An SMTP provider (Mailtrap for development, any SMTP for production)

### Installing PostgreSQL

**Windows:** Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) and run it. Note the password you set for the `postgres` user.

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Environment Variables

### Backend — `VBackend/.env`

Create this file by copying `.env.example`:

```bash
cp VBackend/.env.example VBackend/.env
```

| Variable | Description | Example |
|---|---|---|
| `DB_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/virtualballot` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `JWT_SECRET` | Access token signing key | any long random string |
| `REFRESH_TOKEN_SECRET` | Refresh token signing key | any long random string |
| `SMTP_HOST` | SMTP server hostname | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | from your provider |
| `SMTP_PASS` | SMTP password | from your provider |
| `OTP_EXPIRES_MINUTES` | OTP validity window | `5` |
| `SUPERADMIN_EMAIL` | Super admin login email | `superadmin@virtualballot.online` |
| `SUPERADMIN_SECRET` | Super admin password | any strong password |

> If `SMTP_*` variables are omitted, OTPs are printed to the server console (development fallback).

### Frontend — `Frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:5000` |
| `VITE_ORG_SLUG` | Default org slug | `nuesa` |

---

## Backend Setup

```bash
cd VBackend
npm install
```

Create and configure `VBackend/.env` as described above, then run the database setup:

```bash
npm run db:setup    # creates all tables and indexes
npm run db:seed     # populates demo data (optional)
```

---

## Frontend Setup

```bash
cd Frontend
npm install
```

Create and configure `Frontend/.env` as described above.

---

## Database Setup

Create the database before running `db:setup`:

```sql
-- run as the postgres superuser
CREATE DATABASE virtualballot;
```

**Windows (psql):**
```powershell
psql -U postgres -c "CREATE DATABASE virtualballot;"
```

**macOS / Linux:**
```bash
psql -U postgres -c "CREATE DATABASE virtualballot;"
```

Then run migrations:

```bash
cd VBackend && npm run db:setup
```

### Schema Overview

| Table | Purpose |
|---|---|
| `organizations` | Tenant accounts — each org gets a unique slug |
| `elections` | Election instances per organization |
| `voters` | Eligible voter roster per election |
| `candidates` | Candidates with position, manifesto, image, color |
| `ballots` | Immutable vote records (one per voter per position) |
| `otp_codes` | Short-lived OTP tokens for voter authentication |
| `audit_logs` | Append-only compliance event log |

---

## Running the App

Start both servers in separate terminals:

**Backend:**
```bash
cd VBackend
npm run dev
# Runs on http://localhost:5000
```

**Frontend:**
```bash
cd Frontend
npm run dev
# Runs on http://localhost:5173
```

Open your browser to `http://localhost:5173`.

---

## User Roles

### Voter
- Accesses the ballot via `/{slug}` (e.g. `/nuesa`)
- Enters their matric number → receives OTP by email → casts ballot → gets receipt
- Each voter can vote once per position; votes are final and cannot be changed

### Admin
- Logs in at `/{slug}/admin`
- Manages the election lifecycle: create, open, close, publish results
- Uploads and manages voter rosters and candidates
- Configures org branding (logo, name)
- Views real-time audit logs and election history

### Observer
- Logs in at `/{slug}/observer` with a PIN
- Read-only live view of vote counts and results
- No ability to modify any data

### Super Admin
- Logs in at `/superadmin`
- Manages all organizations on the platform
- Can provision new orgs and manage platform-wide settings

---

## API Overview

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new organization |
| `POST` | `/auth/voter-login` | Voter matric entry — triggers OTP |
| `POST` | `/auth/verify-otp` | OTP verification — returns voter JWT |
| `POST` | `/auth/admin-login` | Admin login |
| `POST` | `/auth/observer-login` | Observer PIN login |
| `POST` | `/auth/forgot-password` | Admin password reset request |
| `POST` | `/auth/reset-password` | Admin password reset with token |
| `GET` | `/elections/:slug` | Get election info for an org |
| `POST` | `/elections` | Create election (admin) |
| `PUT` | `/elections/:id` | Update election (admin) |
| `GET` | `/elections/:id/results` | Get published results |
| `POST` | `/vote` | Submit ballot (voter) |
| `GET` | `/voters/:electionId` | List voters (admin) |
| `POST` | `/voters/bulk` | Bulk upload voter roster (admin) |
| `GET` | `/candidates/:electionId` | List candidates |
| `POST` | `/candidates` | Add candidate (admin) |
| `PUT` | `/candidates/:id` | Update candidate (admin) |
| `DELETE` | `/candidates/:id` | Delete candidate (admin) |
| `GET` | `/superadmin/orgs` | List all organizations (super admin) |

---

## Security

- **Rate limiting** — auth endpoints: 20 requests / 15 min; global: 100 requests / min
- **JWT expiry** — voter tokens: 15 min; admin/observer: 8 h; superadmin: 2 h; refresh tokens: 7 days
- **Bcrypt** — passwords and OTPs hashed with 10 rounds
- **Helmet** — sets secure HTTP response headers
- **CORS** — only the configured `FRONTEND_URL` is allowed
- **Immutable ballots** — database constraint prevents duplicate votes (one per voter per position)
- **Append-only audit log** — no update or delete permissions on `audit_logs`

---

## Multi-Tenancy

Each organization is identified by a URL slug (e.g. `nuesa`). All database queries are scoped to the requesting organization's ID, ensuring complete data isolation between tenants. The slug is resolved from the URL on the frontend and passed to the backend on every request.

- Voter URL: `https://virtualballot.online/nuesa`
- Admin URL: `https://virtualballot.online/nuesa/admin`
- Observer URL: `https://virtualballot.online/nuesa/observer`
