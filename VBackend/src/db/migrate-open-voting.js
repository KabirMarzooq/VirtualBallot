import { query } from "./pool.js"

const run = async () => {
    console.log("Running open-voting migration...")

    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS voting_mode TEXT NOT NULL DEFAULT 'CLOSED'
        CHECK (voting_mode IN ('CLOSED','OPEN'))
  `)
    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS fraud_tier TEXT NOT NULL DEFAULT 'EMAIL'
        CHECK (fraud_tier IN ('EMAIL','DEVICE'))
  `)

    await query(`
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
    )
  `)

    await query(`
    CREATE TABLE IF NOT EXISTS open_otp_codes (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        email         TEXT NOT NULL,
        code_hash     TEXT NOT NULL,
        expires_at    TIMESTAMPTZ NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (election_id, email)
    )
  `)

    await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS open_votes_device_unique
      ON open_votes (election_id, position, fingerprint)
      WHERE fingerprint IS NOT NULL
  `)
    await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS open_votes_email_unique
      ON open_votes (election_id, position, email)
      WHERE email IS NOT NULL
  `)

    console.log("✓ Open-voting migration complete")
    process.exit(0)
}

run().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})