import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin } from "../middleware/auth.js"
import { resolveOrg } from "../middleware/auth.js"
import { ok, fail, isValidEmail } from "../utils/index.js"

const router = express.Router()

// ─── POST /voters/:slug/roster ────────────────────────────────────────────────
// Admin: bulk-upload voters from a parsed CSV array
// Body: { voters: [ { matric, name, email? }, ... ] }
router.post("/:slug/roster", resolveOrg, requireAdmin, async (req, res) => {
  const { voters, replaceExisting = false } = req.body

  if (!voters || !Array.isArray(voters) || voters.length === 0) {
    return fail(res, "Voters array required")
  }

  try {
    // Get current election
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const electionId = electionResult.rows[0].id

    // If replace mode: delete all existing voters who haven't voted yet
    if (replaceExisting) {
      await query(
        `DELETE FROM voters
         WHERE election_id = $1 AND has_voted = FALSE`,
        [electionId]
      )
      await query(
        `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
         VALUES ($1, $2, 'registry', 'Voter roster replaced — previous unvoted entries cleared', $3)`,
        [req.orgId, electionId, req.adminEmail]
      )
    }

    let inserted = 0
    let skipped = 0

    for (const v of voters) {
      if (!v.matric?.trim() || !v.name?.trim()) { skipped++; continue }

      try {
        await query(
          `INSERT INTO voters (election_id, org_id, matric, name, email)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (election_id, matric) DO NOTHING`,
          [electionId, req.orgId, v.matric.trim().toUpperCase(), v.name.trim(), v.email?.trim() || null]
        )
        inserted++
      } catch (_) {
        skipped++
      }
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'registry', $3, $4)`,
      [req.orgId, electionId, `Roster uploaded — ${inserted} voters added, ${skipped} skipped`, req.adminEmail]
    )

    return ok(res, {
      message: `Roster uploaded: ${inserted} added, ${skipped} skipped`,
      inserted,
      skipped,
    })
  } catch (err) {
    console.error("Roster upload error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /voters/:slug ────────────────────────────────────────────────────────
// Admin: get all voters for the current election
router.get("/:slug", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)

    const votersResult = await query(
      `SELECT id, matric, name, email, has_voted, voted_at, registered_at
       FROM voters WHERE election_id = $1 ORDER BY name`,
      [electionResult.rows[0].id]
    )

    return ok(res, { voters: votersResult.rows })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── DELETE /voters/:slug/:voterId ────────────────────────────────────────────
// Admin: remove a voter from the roster (only if they haven't voted)
router.delete("/:slug/:voterId", resolveOrg, requireAdmin, async (req, res) => {
  const { voterId } = req.params

  try {
    const voterResult = await query(
      `SELECT id, matric, has_voted FROM voters WHERE id = $1 AND org_id = $2`,
      [voterId, req.orgId]
    )
    if (voterResult.rows.length === 0) return fail(res, "Voter not found", 404)
    if (voterResult.rows[0].has_voted) {
      return fail(res, "Cannot remove a voter who has already cast their vote", 403)
    }

    await query(`DELETE FROM voters WHERE id = $1`, [voterId])

    return ok(res, { message: "Voter removed from roster" })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── POST /voters/:slug/check-eligibility ─────────────────────────────────────
// Public — voter enters matric, we confirm they're on the roster and not yet registered
router.post("/:slug/check-eligibility", resolveOrg, async (req, res) => {
  const { matric } = req.body
  if (!matric) return fail(res, "Matric number required")

  try {
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const electionId = electionResult.rows[0].id

    const voterResult = await query(
      `SELECT id, name, email, has_voted FROM voters
       WHERE election_id = $1 AND UPPER(matric) = UPPER($2)`,
      [electionId, matric.trim()]
    )

    if (voterResult.rows.length === 0) {
      return fail(res, "Matric number not found in voter roster. Contact the electoral commission.", 404)
    }

    const voter = voterResult.rows[0]

    // Already has an email = already registered
    if (voter.email) {
      return fail(res, "This matric number is already registered. Please log in.", 409)
    }

    return ok(res, {
      eligible: true,
      voter: { id: voter.id, name: voter.name }
    })
  } catch (err) {
    console.error("Check eligibility error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /voters/:slug/register ──────────────────────────────────────────────
// Public — voter submits their email to complete registration
router.post("/:slug/register", resolveOrg, async (req, res) => {
  const { voterId, email } = req.body
  if (!voterId || !email) return fail(res, "Voter ID and email required")

  // Basic email format check
  if (!isValidEmail(email)) {
    return fail(res, "Please enter a valid email address")
  }

  try {
    const result = await query(
      `UPDATE voters SET email = $1
       WHERE id = $2 AND email IS NULL
       RETURNING id, name, matric`,
      [email.trim().toLowerCase(), voterId]
    )

    if (result.rows.length === 0) {
      return fail(res, "Registration failed — voter not found or already registered", 400)
    }

    return ok(res, {
      message: "Registration successful. You can now log in to vote.",
      voter: result.rows[0]
    })
  } catch (err) {
    console.error("Register error:", err)
    return fail(res, "Server error", 500)
  }
})

export default router
