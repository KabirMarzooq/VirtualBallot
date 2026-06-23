-- ── Chat Migration for Virtual Ballot ──────────────────────────────────────
-- Run AFTER the main db:setup:
--   psql -U postgres -d virtualballot -f src/db/chat-migration.sql
-- or fold into setup.js before process.exit(0)
--
-- Requires Postgres 12+ (GENERATED ALWAYS AS STORED for tsvector column).

-- ── Staff members (committee with individual logins) ─────────────────────────
-- Created by the org admin, scoped to their org.
-- One staff pool per org — staff can handle any election under that org.
CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,  -- bcrypt hashed
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_org ON staff_members(org_id);

-- ── Chat conversations ────────────────────────────────────────────────────────
-- Scoped to (election_id, voter_id). One conversation per voter per election
-- (if they disconnect and come back their history is preserved).
CREATE TABLE IF NOT EXISTS chat_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id         UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  voter_id            UUID REFERENCES voters(id),       -- NULL for anonymous/open elections
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','escalated','claimed','resolved')),
  is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,   -- fraud / can't-vote keywords
  assigned_staff_id   UUID REFERENCES staff_members(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_convo_election_status ON chat_conversations(election_id, status);
CREATE INDEX IF NOT EXISTS idx_convo_org             ON chat_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_convo_urgent          ON chat_conversations(is_urgent) WHERE is_urgent = TRUE;

-- ── Chat messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('voter','auto','staff')),
  sender_id         UUID,   -- staff_members.id for staff; NULL for voter/auto
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON chat_messages(conversation_id);

-- ── Per-election FAQ (matched with Postgres full-text search, no AI) ──────────
-- The search_vector column is maintained automatically by Postgres from the
-- question text — no triggers or manual updates needed.
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

-- ── Canned replies (one-click shortcuts for staff) ───────────────────────────
-- Separate from FAQ — these don't need to match anything, they're just
-- quick-insert text staff type often ("One moment, checking that…").
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
