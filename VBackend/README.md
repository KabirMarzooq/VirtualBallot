# Virtual Ballot — Backend API

Node.js + Express + PostgreSQL backend for Virtual Ballot.

---

## Prerequisites

- Node.js 18+ (you already have this)
- PostgreSQL — install it below

---

## Step 1 — Install PostgreSQL

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer. Set a password for the `postgres` user — remember it.
3. Leave the port as 5432.
4. After install, open "SQL Shell (psql)" from the Start menu.

**Mac (with Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql   # open psql
```

---

## Step 2 — Create the database

Open psql (SQL Shell on Windows, or terminal on Mac/Linux):

```sql
-- Connect as postgres user, then run:
CREATE DATABASE virtualballot;
-- You should see: CREATE DATABASE

-- Quit psql
\q
```

---

## Step 3 — Clone and install dependencies

```bash
# In this folder (vb-backend):
npm install
```

---

## Step 4 — Set up environment variables

```bash
# Copy the example file
cp .env.example .env

# Open .env and fill in:
# DB_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/virtualballot
# JWT_SECRET=any-long-random-string (run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# REFRESH_TOKEN_SECRET=another-long-random-string
# FRONTEND_URL=http://localhost:5173
```

**For JWT secrets**, run this in your terminal to generate them:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice and paste each output into JWT_SECRET and REFRESH_TOKEN_SECRET.

---

## Step 5 — Create tables

```bash
npm run db:setup
```

You should see: ✅ All tables created successfully

---

## Step 6 — Seed demo data

```bash
npm run db:seed
```

This creates a demo organization (NUESA) with 4 voters and 4 candidates so you
can test the full flow immediately.

---

## Step 7 — Start the server

```bash
npm run dev
```

You should see:
```
✅ PostgreSQL connected
🗳️  Virtual Ballot API running on port 5000
```

Test it: http://localhost:5000/health

---

## API Routes Summary

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET    | /health | Health check |
| GET    | /elections/:slug | Election config + branding |
| GET    | /elections/:slug/candidates | Candidate list |
| GET    | /elections/:slug/results | Results (if published) |
| GET    | /vote/verify/:receiptId | Verify a vote receipt |

### Voter auth
| Method | Route | Description |
|--------|-------|-------------|
| POST   | /auth/:slug/voter/login | Enter matric → sends OTP |
| POST   | /auth/:slug/voter/verify-otp | Submit OTP → get JWT |

### Voting (JWT required)
| Method | Route | Description |
|--------|-------|-------------|
| POST   | /vote | Submit ballot |

### Admin (JWT required)
| Method | Route | Description |
|--------|-------|-------------|
| POST   | /auth/:slug/admin/login | Admin login |
| GET    | /elections/:slug/admin/overview | Full dashboard data |
| PATCH  | /elections/:slug/config | Update election settings |
| POST   | /voters/:slug/roster | Upload voter roster |
| GET    | /voters/:slug | List all voters |
| DELETE | /voters/:slug/:id | Remove a voter |
| POST   | /candidates/:slug | Add a candidate |
| PATCH  | /candidates/:slug/:id | Update candidate manifesto |
| DELETE | /candidates/:slug/:id | Remove a candidate |

### Observer (JWT required)
| Method | Route | Description |
|--------|-------|-------------|
| POST   | /auth/:slug/observer/login | Observer login |

---

## Test credentials (after seed)

```
Admin login:
  Email:    admin@nuesa.edu.ng
  Password: Admin1234!

Observer PIN: 5566

Voter matric numbers:
  U/25/001  —  Amina Yusuf
  U/25/002  —  Chukwuemeka Obi
  U/25/003  —  Fatima Abdullahi
  U/25/004  —  Tunde Adeyemi

Org slug: nuesa
(used in all API calls, e.g. POST /auth/nuesa/voter/login)
```

---

## Email / OTP in development

If SMTP is not configured, OTP codes are printed directly to your terminal
console — no email setup needed to test the full flow.

For real emails, sign up at https://mailtrap.io (free) and paste the SMTP
credentials into your .env file.

---

## Connecting the frontend

In your React frontend, replace the fake setTimeout calls with real fetch calls:

```js
// Example: voter login
const res = await fetch("http://localhost:5000/auth/nuesa/voter/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ matric: "U/25/001" }),
})
const data = await res.json()
```

A full frontend integration guide will follow once the backend is confirmed working.
