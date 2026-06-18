import { query } from "./pool.js"

const run = async () => {
    console.log("Running paid-voting migration...")

    // ── Elections: paid voting config ──────────────────────────────────────────
    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS vote_type TEXT NOT NULL DEFAULT 'STANDARD'
        CHECK (vote_type IN ('STANDARD','PAID'))
  `)
    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'FIXED'
        CHECK (pricing_model IN ('FIXED','BUNDLE'))
  `)
    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS price_per_vote INTEGER NOT NULL DEFAULT 0
  `)
    // Bundles stored as JSONB array: [{ label, amount, votes }, ...]
    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS vote_bundles JSONB NOT NULL DEFAULT '[]'::jsonb
  `)

    // ── Organizations: Paystack subaccount ─────────────────────────────────────
    await query(`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT,
      ADD COLUMN IF NOT EXISTS settlement_bank_name     TEXT,
      ADD COLUMN IF NOT EXISTS settlement_account_number TEXT,
      ADD COLUMN IF NOT EXISTS settlement_business_name TEXT
  `)

    // ── Paid transactions ──────────────────────────────────────────────────────
    await query(`
    CREATE TABLE IF NOT EXISTS paid_transactions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      election_id       UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      position          TEXT NOT NULL,
      voter_email       TEXT NOT NULL,
      reference         TEXT NOT NULL UNIQUE,   -- Paystack transaction reference
      amount_kobo       INTEGER NOT NULL,       -- amount for VOTES, in kobo (₦1 = 100 kobo)
      fee_kobo          INTEGER NOT NULL DEFAULT 0, -- Paystack fee voter paid on top
      votes_purchased   INTEGER NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','SUCCESS','FAILED')),
      paystack_data     JSONB,                  -- raw verification payload for the record
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

    await query(`
    CREATE INDEX IF NOT EXISTS idx_paid_tx_election ON paid_transactions(election_id)
  `)
    await query(`
    CREATE INDEX IF NOT EXISTS idx_paid_tx_status   ON paid_transactions(status)
  `)

    console.log("✓ Paid-voting migration complete")
    process.exit(0)
}

run().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})