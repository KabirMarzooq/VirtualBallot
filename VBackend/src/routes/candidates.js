import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin, resolveOrg } from "../middleware/auth.js"
import { ok, fail } from "../utils/index.js"

const router = express.Router()

const COLORS = [
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-teal-400 to-teal-600",
  "from-orange-400 to-orange-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
]

// ─── POST /candidates/:slug ───────────────────────────────────────────────────
// Admin: add a candidate
router.post("/:slug", resolveOrg, requireAdmin, async (req, res) => {
  const { name, position, imageUrl, manifesto, color } = req.body

  if (!name?.trim() || !position?.trim()) {
    return fail(res, "Name and position are required")
  }

  try {
    const electionResult = await query(
      `SELECT id, status FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const election = electionResult.rows[0]

    if (election.status !== "NOT_STARTED") {
      return fail(res, "Cannot add candidates after the election has started", 403)
    }

    // Pick a color if not provided
    const countResult = await query(
      `SELECT COUNT(*) AS cnt FROM candidates WHERE election_id = $1`, [election.id]
    )
    const idx = Number(countResult.rows[0].cnt) % COLORS.length
    const chosenColor = color || COLORS[idx]

    const result = await query(
      `INSERT INTO candidates (election_id, org_id, name, position, image_url, manifesto, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [election.id, req.orgId, name.trim(), position.trim(),
       imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
       manifesto?.trim() || null, chosenColor]
    )

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'candidate', $3, $4)`,
      [req.orgId, election.id, `Candidate "${name.trim()}" added for ${position.trim()}`, req.adminEmail]
    )

    return ok(res, { candidate: result.rows[0] }, 201)
  } catch (err) {
    console.error("Add candidate error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── PATCH /candidates/:slug/:candidateId ─────────────────────────────────────
// Admin: update a candidate's manifesto or details
router.patch("/:slug/:candidateId", resolveOrg, requireAdmin, async (req, res) => {
  const { candidateId } = req.params
  const { manifesto, name, imageUrl } = req.body

  try {
    const updates = []
    const values  = []
    let   idx     = 1

    if (manifesto !== undefined) { updates.push(`manifesto = $${idx++}`); values.push(manifesto) }
    if (name      !== undefined) { updates.push(`name = $${idx++}`);      values.push(name.trim()) }
    if (imageUrl  !== undefined) { updates.push(`image_url = $${idx++}`); values.push(imageUrl) }

    if (updates.length === 0) return fail(res, "Nothing to update")

    values.push(candidateId, req.orgId)
    const result = await query(
      `UPDATE candidates SET ${updates.join(", ")} WHERE id = $${idx++} AND org_id = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return fail(res, "Candidate not found", 404)

    return ok(res, { candidate: result.rows[0] })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── DELETE /candidates/:slug/:candidateId ────────────────────────────────────
// Admin: remove a candidate (only before election starts)
router.delete("/:slug/:candidateId", resolveOrg, requireAdmin, async (req, res) => {
  const { candidateId } = req.params

  try {
    const electionResult = await query(
      `SELECT id, status FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows[0]?.status !== "NOT_STARTED") {
      return fail(res, "Cannot remove candidates once the election has started", 403)
    }

    const result = await query(
      `DELETE FROM candidates WHERE id = $1 AND org_id = $2 RETURNING name, position`,
      [candidateId, req.orgId]
    )
    if (result.rows.length === 0) return fail(res, "Candidate not found", 404)

    const { name, position } = result.rows[0]
    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'candidate', $3, $4)`,
      [req.orgId, electionResult.rows[0].id, `Candidate "${name}" removed from ${position}`, req.adminEmail]
    )

    return ok(res, { message: "Candidate removed" })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

export default router
