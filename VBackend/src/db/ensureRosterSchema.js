import { query } from "./pool.js"

// Self-healing schema sync for the roster-approval feature, run once on server
// startup. Deployments run `node src/server.js`, which does not apply
// migrations — so a schema change would otherwise require a manual one-off
// against the production DB. This closes that gap.
//
// The destructive path (DROP + recreate) only fires when the `reviewer_name`
// column is absent — i.e. the table is missing (fresh DB) or still in the old
// candidate-linked shape. Once the schema is current, every subsequent boot
// detects `reviewer_name` and skips the drop, so existing reviewer data is
// preserved across deploys. Never throws — a failure here must not take down
// the whole API.
export const ensureRosterSchema = async () => {
  try {
    // Independent + idempotent — safe on every boot.
    await query(`
      ALTER TABLE elections
        ADD COLUMN IF NOT EXISTS roster_approval_status TEXT NOT NULL DEFAULT 'IDLE'
          CHECK (roster_approval_status IN ('IDLE','PENDING','APPROVED'))
    `)

    const { rows } = await query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roster_approvals' AND column_name = 'reviewer_name'`
    )
    if (rows.length > 0) return // schema already current

    console.log("⏳ Roster schema out of date — migrating to reviewer_name model...")
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
    console.log("✅ Roster schema migrated to reviewer_name model")
  } catch (err) {
    console.error("Roster schema ensure failed:", err.message)
  }
}
