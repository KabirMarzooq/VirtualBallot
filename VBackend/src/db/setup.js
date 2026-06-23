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
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  paystack_subaccount_code  TEXT,
  settlement_bank_name      TEXT,
  settlement_account_number TEXT,
  settlement_business_name  TEXT
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
  voting_mode       TEXT NOT NULL DEFAULT 'CLOSED' CHECK (voting_mode IN ('CLOSED','OPEN')),
  fraud_tier        TEXT NOT NULL DEFAULT 'EMAIL' CHECK (fraud_tier IN ('EMAIL','DEVICE')),
  vote_type         TEXT NOT NULL DEFAULT 'STANDARD' CHECK (vote_type IN ('STANDARD','PAID')),
  pricing_model     TEXT NOT NULL DEFAULT 'FIXED' CHECK (pricing_model IN ('FIXED','BUNDLE')),
  price_per_vote    INTEGER NOT NULL DEFAULT 0,
  vote_bundles      JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- ── Paid Transactions (pay-per-vote) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paid_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id       UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position          TEXT NOT NULL,
  voter_email       TEXT NOT NULL,
  reference         TEXT NOT NULL UNIQUE,
  amount_kobo       INTEGER NOT NULL,
  fee_kobo          INTEGER NOT NULL DEFAULT 0,
  votes_purchased   INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','SUCCESS','FAILED')),
  paystack_data     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paid_tx_election ON paid_transactions(election_id);
CREATE INDEX IF NOT EXISTS idx_paid_tx_status   ON paid_transactions(status);

-- ── Open Votes (public voting, no roster) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS open_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position      TEXT NOT NULL,
  voter_ip      TEXT,
  fingerprint   TEXT,
  email         TEXT,
  receipt_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEVICE tier: one ballot per fingerprint per position
CREATE UNIQUE INDEX IF NOT EXISTS open_votes_device_unique
  ON open_votes (election_id, position, fingerprint)
  WHERE fingerprint IS NOT NULL;

-- EMAIL tier: one ballot per email per position
CREATE UNIQUE INDEX IF NOT EXISTS open_votes_email_unique
  ON open_votes (election_id, position, email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS open_otp_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, email)
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

-- ── Vote Chain (tamper-evident hash chain) ────────────────────────────────────
-- One row per vote across ALL election types (closed, open, paid).
-- Each entry's hash includes the previous entry's hash, forming a chain where
-- altering any past vote breaks every entry after it.
CREATE TABLE IF NOT EXISTS vote_chain (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  seq           BIGINT NOT NULL,            -- position in this election's chain (1,2,3…)
  vote_type     TEXT NOT NULL,              -- 'CLOSED' | 'OPEN' | 'PAID' (provenance)
  candidate_id  UUID NOT NULL,
  position      TEXT NOT NULL,
  receipt_id    TEXT NOT NULL,              -- the voter-facing code tied to this entry
  data_hash     TEXT NOT NULL,             -- SHA-256 of this vote's own content
  prev_hash     TEXT NOT NULL,             -- the previous entry's chain_hash ('GENESIS' for first)
  chain_hash    TEXT NOT NULL,             -- SHA-256(seq + data_hash + prev_hash) — the link
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_vote_chain_election ON vote_chain(election_id, seq);
CREATE INDEX IF NOT EXISTS idx_vote_chain_receipt  ON vote_chain(receipt_id);
CREATE INDEX IF NOT EXISTS idx_vote_chain_hash     ON vote_chain(chain_hash);

CREATE TABLE IF NOT EXISTS chain_anchors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  head_hash    TEXT NOT NULL,
  chain_length BIGINT NOT NULL,
  anchored_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chain_anchors_election ON chain_anchors(election_id, anchored_at);

-- ── Password reset tokens (added via migration) ──────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS password_reset_token      TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires    TIMESTAMPTZ;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voters_election    ON voters(election_id);
CREATE INDEX IF NOT EXISTS idx_voters_matric      ON voters(matric);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_election   ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_voter      ON ballots(voter_id);
CREATE INDEX IF NOT EXISTS idx_audit_org          ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_election     ON audit_logs(election_id);
CREATE INDEX IF NOT EXISTS idx_otp_voter          ON otp_codes(voter_id);

-- ── Live Chat Support (staff accounts + conversations) ───────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_org ON staff_members(org_id);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id         UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  voter_id            UUID REFERENCES voters(id),
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','escalated','claimed','resolved')),
  is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_staff_id   UUID REFERENCES staff_members(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_convo_election_status ON chat_conversations(election_id, status);
CREATE INDEX IF NOT EXISTS idx_convo_org             ON chat_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_convo_urgent          ON chat_conversations(is_urgent) WHERE is_urgent = TRUE;

CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('voter','auto','staff')),
  sender_id         UUID,
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msg_conversation ON chat_messages(conversation_id);

CREATE TABLE IF NOT EXISTS election_chat_faqs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  search_vector   TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', question)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faq_election ON election_chat_faqs(election_id);
CREATE INDEX IF NOT EXISTS idx_faq_search   ON election_chat_faqs USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS canned_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_by    UUID REFERENCES staff_members(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canned_election ON canned_replies(election_id);

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
    console.error(err)
    process.exit(1)
  }
}

setup()
