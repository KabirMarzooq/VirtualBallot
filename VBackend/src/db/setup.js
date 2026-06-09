/**
 * db/setup.js — Run this ONCE to create all tables.
 * Command: npm run db:setup
 *
 * Tables:
 *   organizations  — each org is one customer (NUESA, SIWES, etc.)
 *   elections      — each election belongs to one org
 *   voters         — eligible voters per election (the roster)
 *   candidates     — candidates per election, grouped by position
 *   ballots        — one row per cast vote (immutable once written)
 *   otp_codes      — temporary OTP tokens for voter verification
 *   audit_logs     — immutable record of every significant action
 */

import { query } from "./pool.js"
import dotenv from "dotenv"
dotenv.config()

const schema = `

-- ── Organizations (tenants) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,   -- used in subdomain: nuesa.virtualballot.app
  logo_url        TEXT,
  admin_email     TEXT NOT NULL UNIQUE,
  admin_password  TEXT NOT NULL,          -- bcrypt hashed
  observer_pin    TEXT NOT NULL DEFAULT '$2a$10$placeholder',  -- bcrypt hashed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Elections ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'NOT_STARTED'
                    CHECK (status IN ('NOT_STARTED','ACTIVE','ENDED')),
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  registry_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  show_countdown    BOOLEAN NOT NULL DEFAULT FALSE,
  started_at        TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Voters (the roster) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matric        TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  has_voted     BOOLEAN NOT NULL DEFAULT FALSE,
  voted_at      TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A voter can only appear once per election
  UNIQUE(election_id, matric)
);

-- ── Candidates ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    TEXT NOT NULL,
  image_url   TEXT,
  manifesto   TEXT,
  color       TEXT NOT NULL DEFAULT 'from-blue-400 to-blue-600',
  vote_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ballots (immutable — never updated, never deleted) ────────────────────────
-- One row per (voter, position) — a voter choosing President creates one row,
-- choosing Gen. Secretary creates another row.
CREATE TABLE IF NOT EXISTS ballots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES elections(id),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  voter_id        UUID NOT NULL REFERENCES voters(id),
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  position        TEXT NOT NULL,
  receipt_id      TEXT NOT NULL,     -- VB-XXXXXXXXX shown to voter
  cast_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A voter can only vote once per position
  UNIQUE(election_id, voter_id, position)
);

-- ── OTP Codes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id    UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,         -- bcrypt hash of the 6-digit code
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs (append-only) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID REFERENCES organizations(id),
  election_id UUID REFERENCES elections(id),
  event_type  TEXT NOT NULL,   -- 'vote', 'admin', 'system', 'warning', etc.
  message     TEXT NOT NULL,
  actor       TEXT,            -- who triggered it (matric, 'ADMIN', 'SYSTEM')
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voters_election    ON voters(election_id);
CREATE INDEX IF NOT EXISTS idx_voters_matric      ON voters(matric);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_election   ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_voter      ON ballots(voter_id);
CREATE INDEX IF NOT EXISTS idx_audit_org          ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_election     ON audit_logs(election_id);
CREATE INDEX IF NOT EXISTS idx_otp_voter          ON otp_codes(voter_id);

`

async function setup() {
  console.log("🔧 Setting up database schema...")
  try {
    await query(schema)
    console.log("✅ All tables created successfully")
    console.log("")
    console.log("Next steps:")
    console.log("  1. Run: npm run db:seed   (creates a demo org + election)")
    console.log("  2. Run: npm run dev       (starts the API server)")
    process.exit(0)
  } catch (err) {
    console.error("❌ Schema setup failed:", err.message)
    process.exit(1)
  }
}

setup()
