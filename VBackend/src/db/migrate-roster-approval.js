import { query } from "./pool.js"

const run = async () => {
    console.log("Running roster-approval migration...")

    // Reviewers are now admin-named committee members, independent of the
    // candidates table. Drop the old candidate-linked tables and recreate
    // cleanly (safe — this feature is still in development).
    await query(`DROP TABLE IF EXISTS roster_flags`)
    await query(`DROP TABLE IF EXISTS roster_approvals`)

    await query(`
    CREATE TABLE roster_approvals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      election_id    UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      reviewer_name  TEXT NOT NULL,
      review_code    TEXT NOT NULL,
      approved       BOOLEAN NOT NULL DEFAULT FALSE,
      approved_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(election_id, review_code)
    )
  `)

    await query(`
    CREATE TABLE roster_flags (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_id  UUID NOT NULL REFERENCES roster_approvals(id) ON DELETE CASCADE,
      election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      matric       TEXT NOT NULL,
      reason       TEXT NOT NULL,
      resolved     BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

    await query(`
    ALTER TABLE elections
      ADD COLUMN IF NOT EXISTS roster_approval_status TEXT NOT NULL DEFAULT 'IDLE'
        CHECK (roster_approval_status IN ('IDLE', 'PENDING', 'APPROVED'))
  `)

    console.log("✓ Roster-approval migration complete")
    process.exit(0)
}

run().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})
