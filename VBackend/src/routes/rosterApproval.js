import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin, resolveOrg } from "../middleware/auth.js"
import { ok, fail } from "../utils/index.js"
import { generateApprovalsForElection } from "../utils/rosterApproval.js"

const router = express.Router()

// Resolve the current election for an org (same pattern as voters.js).
const getElectionId = async (orgId) => {
  const result = await query(
    `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId]
  )
  return result.rows.length ? result.rows[0].id : null
}

// ─── POST /roster-approval/lookup ─────────────────────────────────────────────
// Public — resolve a globally-unique review code to its org slug so the rep
// portal never needs to know the org. Defined before the /:slug/* routes.
router.post("/lookup", async (req, res) => {
  const { reviewCode } = req.body
  if (!reviewCode?.trim()) return fail(res, "Review code required")

  try {
    const result = await query(
      `SELECT o.slug
         FROM roster_approvals ra
         JOIN organizations o ON o.id = ra.org_id
        WHERE UPPER(ra.review_code) = UPPER($1)
        LIMIT 1`,
      [reviewCode.trim()]
    )
    if (result.rows.length === 0) return fail(res, "Invalid or expired review code", 404)
    return ok(res, { slug: result.rows[0].slug })
  } catch (err) {
    console.error("Review code lookup error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/generate ─────────────────────────────────────
// Admin: mint one review code per candidate (called on roster upload).
router.post("/:slug/generate", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const electionId = await getElectionId(req.orgId)
    if (!electionId) return fail(res, "No election found", 404)

    const { approvals, candidateCount } = await generateApprovalsForElection(
      electionId,
      req.orgId
    )
    if (candidateCount === 0) {
      return fail(res, "Add candidates before uploading the voter roster")
    }

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'registry', $3, $4)`,
      [
        req.orgId,
        electionId,
        `Voter roster uploaded — approval required from ${candidateCount} candidate reps`,
        req.adminEmail,
      ]
    )

    return ok(res, { approvals })
  } catch (err) {
    console.error("Generate roster approvals error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /roster-approval/:slug/status ────────────────────────────────────────
// Admin: full approval + flag state for the dashboard.
router.get("/:slug/status", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT id, roster_approval_status
         FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const election = electionResult.rows[0]

    const approvalsResult = await query(
      `SELECT id, candidate_id, candidate_name, review_code, approved, approved_at
         FROM roster_approvals WHERE election_id = $1 ORDER BY created_at`,
      [election.id]
    )
    const flagsResult = await query(
      `SELECT id, approval_id, matric, reason, resolved
         FROM roster_flags WHERE election_id = $1 ORDER BY created_at`,
      [election.id]
    )

    const flagsByApproval = new Map()
    for (const f of flagsResult.rows) {
      const list = flagsByApproval.get(f.approval_id) || []
      list.push({ id: f.id, matric: f.matric, reason: f.reason, resolved: f.resolved })
      flagsByApproval.set(f.approval_id, list)
    }

    const approvals = approvalsResult.rows.map((a) => ({
      id: a.id,
      candidateId: a.candidate_id,
      candidateName: a.candidate_name,
      reviewCode: a.review_code,
      approved: a.approved,
      approvedAt: a.approved_at,
      flags: flagsByApproval.get(a.id) || [],
    }))

    const totalCount = approvals.length
    const approvedCount = approvals.filter((a) => a.approved).length
    const allApproved = totalCount > 0 && approvedCount === totalCount
    const hasUnresolvedFlags = flagsResult.rows.some((f) => !f.resolved)

    return ok(res, {
      rosterApprovalStatus: election.roster_approval_status,
      approvals,
      totalCount,
      approvedCount,
      allApproved,
      hasUnresolvedFlags,
    })
  } catch (err) {
    console.error("Roster approval status error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/review ───────────────────────────────────────
// Public — rep enters their code and receives the voter list to review.
router.post("/:slug/review", resolveOrg, async (req, res) => {
  const { reviewCode } = req.body
  if (!reviewCode?.trim()) return fail(res, "Review code required")

  try {
    const electionId = await getElectionId(req.orgId)
    if (!electionId) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, candidate_name, approved, approved_at
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), electionId]
    )
    if (approvalResult.rows.length === 0) return fail(res, "Invalid review code", 404)
    const approval = approvalResult.rows[0]

    const votersResult = await query(
      `SELECT matric, name FROM voters WHERE election_id = $1 ORDER BY name`,
      [electionId]
    )

    return ok(res, {
      approval: {
        id: approval.id,
        candidateName: approval.candidate_name,
        approved: approval.approved,
        approvedAt: approval.approved_at,
      },
      voters: votersResult.rows,
      alreadyApproved: approval.approved,
    })
  } catch (err) {
    console.error("Roster review error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/approve ──────────────────────────────────────
// Public — rep records their approval.
router.post("/:slug/approve", resolveOrg, async (req, res) => {
  const { reviewCode } = req.body
  if (!reviewCode?.trim()) return fail(res, "Review code required")

  try {
    const electionId = await getElectionId(req.orgId)
    if (!electionId) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, candidate_name, approved
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), electionId]
    )
    if (approvalResult.rows.length === 0) return fail(res, "Invalid review code", 404)
    const approval = approvalResult.rows[0]

    if (approval.approved) {
      return fail(res, "You have already approved this roster", 409)
    }

    const unresolvedResult = await query(
      `SELECT COUNT(*)::int AS n FROM roster_flags
        WHERE approval_id = $1 AND resolved = FALSE`,
      [approval.id]
    )
    if (unresolvedResult.rows[0].n > 0) {
      return fail(
        res,
        "You have flagged entries that must be resolved by the admin before you can approve",
        400
      )
    }

    const updated = await query(
      `UPDATE roster_approvals SET approved = TRUE, approved_at = NOW()
        WHERE id = $1 RETURNING approved_at`,
      [approval.id]
    )
    const approvedAt = updated.rows[0].approved_at

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'registry', $3, $4)`,
      [
        req.orgId,
        electionId,
        `${approval.candidate_name}'s rep approved the voter list`,
        `${approval.candidate_name} (rep)`,
      ]
    )

    // Did this approval complete the set?
    const tallyResult = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE approved)::int AS approved
         FROM roster_approvals WHERE election_id = $1`,
      [electionId]
    )
    const tally = tallyResult.rows[0]
    const allApproved = tally.total > 0 && tally.approved === tally.total

    if (allApproved) {
      await query(
        `UPDATE elections SET roster_approval_status = 'APPROVED' WHERE id = $1`,
        [electionId]
      )
      await query(
        `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
         VALUES ($1, $2, 'registry', $3, $4)`,
        [
          req.orgId,
          electionId,
          "All candidate reps approved the voter roster — registry cleared for locking",
          "SYSTEM",
        ]
      )
    }

    return ok(res, {
      message: "Approval recorded",
      candidateName: approval.candidate_name,
      approvedAt,
      allApproved,
    })
  } catch (err) {
    console.error("Roster approve error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/flag ─────────────────────────────────────────
// Public — rep disputes a specific voter entry.
router.post("/:slug/flag", resolveOrg, async (req, res) => {
  const { reviewCode, matric, reason } = req.body
  if (!reviewCode?.trim() || !matric?.trim() || !reason?.trim()) {
    return fail(res, "Review code, matric and reason are required")
  }

  try {
    const electionId = await getElectionId(req.orgId)
    if (!electionId) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, candidate_name, approved
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), electionId]
    )
    if (approvalResult.rows.length === 0) return fail(res, "Invalid review code", 404)
    const approval = approvalResult.rows[0]

    if (approval.approved) {
      return fail(res, "This roster has already been approved and can no longer be flagged", 400)
    }

    await query(
      `INSERT INTO roster_flags (approval_id, election_id, org_id, matric, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [approval.id, electionId, req.orgId, matric.trim(), reason.trim()]
    )

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'warning', $3, $4)`,
      [
        req.orgId,
        electionId,
        `${approval.candidate_name}'s rep flagged matric ${matric.trim()} — reason: ${reason.trim()}`,
        `${approval.candidate_name} (rep)`,
      ]
    )

    return ok(res, {
      message: "Entry flagged",
      flag: { matric: matric.trim(), reason: reason.trim() },
    })
  } catch (err) {
    console.error("Roster flag error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/resolve-flag ─────────────────────────────────
// Admin: mark a flag as resolved after reviewing it.
router.post("/:slug/resolve-flag", resolveOrg, requireAdmin, async (req, res) => {
  const { flagId } = req.body
  if (!flagId) return fail(res, "Flag ID required")

  try {
    const flagResult = await query(
      `SELECT id, matric, election_id FROM roster_flags
        WHERE id = $1 AND org_id = $2`,
      [flagId, req.orgId]
    )
    if (flagResult.rows.length === 0) return fail(res, "Flag not found", 404)
    const flag = flagResult.rows[0]

    await query(
      `UPDATE roster_flags SET resolved = TRUE, resolved_at = NOW() WHERE id = $1`,
      [flagId]
    )

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'admin', $3, $4)`,
      [req.orgId, flag.election_id, `Admin resolved flag on matric ${flag.matric}`, req.adminEmail]
    )

    return ok(res, { message: "Flag resolved" })
  } catch (err) {
    console.error("Resolve flag error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/regenerate ───────────────────────────────────
// Admin: reset and re-mint all review codes.
router.post("/:slug/regenerate", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const electionId = await getElectionId(req.orgId)
    if (!electionId) return fail(res, "No election found", 404)

    const { approvals, candidateCount } = await generateApprovalsForElection(
      electionId,
      req.orgId
    )
    if (candidateCount === 0) {
      return fail(res, "Add candidates before uploading the voter roster")
    }

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'admin', $3, $4)`,
      [
        req.orgId,
        electionId,
        "Roster review codes regenerated by admin — all approvals reset",
        req.adminEmail,
      ]
    )

    return ok(res, { approvals })
  } catch (err) {
    console.error("Regenerate roster codes error:", err)
    return fail(res, "Server error", 500)
  }
})

export default router
