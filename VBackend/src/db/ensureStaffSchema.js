import { query } from "./pool.js"

// Self-healing schema for staff↔election assignment, run once on startup.
// Deploys run `node src/server.js` with no migration step, so this closes the
// gap the same way ensureRosterSchema does. Idempotent; never throws.
export const ensureStaffSchema = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS staff_elections (
        staff_id     UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (staff_id, election_id)
      )
    `)
    await query(
      `CREATE INDEX IF NOT EXISTS idx_staff_elections_staff ON staff_elections(staff_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_staff_elections_election ON staff_elections(election_id)`
    )
  } catch (err) {
    console.error("Staff schema ensure failed:", err.message)
  }
}
