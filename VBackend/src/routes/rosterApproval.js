import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin, resolveOrg } from "../middleware/auth.js"
import { ok, fail } from "../utils/index.js"
import {
  generateReviewCode,
  recomputeApprovalStatus,
} from "../utils/rosterApproval.js"
import { io } from "../server.js"

const router = express.Router()

// Resolve the current election (id + voting_mode) for an org.
const getElection = async (orgId) => {
  const result = await query(
    `SELECT id, voting_mode FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId]
  )
  return result.rows.length ? result.rows[0] : null
}

// Notify any admin dashboard watching this election that the panel changed.
const emitRosterUpdate = (electionId) => {
  io.to(`election:${electionId}`).emit("roster:updated", { electionId })
}

// ─── POST /roster-approval/lookup ─────────────────────────────────────────────
// Public — resolve a globally-unique review code to its org slug so the review
// portal never needs the org in its URL. Defined before the /:slug/* routes.
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

// ─── POST /roster-approval/:slug/add-reviewer ─────────────────────────────────
// Admin: add a named committee member and mint their personal review code.
router.post("/:slug/add-reviewer", resolveOrg, requireAdmin, async (req, res) => {
  const { reviewerName } = req.body
  if (!reviewerName?.trim()) return fail(res, "Reviewer name required")

  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)
    if (election.voting_mode !== "CLOSED") {
      return fail(res, "Roster approval is only required for closed elections", 400)
    }

    const reviewCode = await generateReviewCode()
    const inserted = await query(
      `INSERT INTO roster_approvals (election_id, org_id, reviewer_name, review_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, reviewer_name, review_code, approved, approved_at`,
      [election.id, req.orgId, reviewerName.trim(), reviewCode]
    )
    const row = inserted.rows[0]

    await recomputeApprovalStatus(election.id)

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'registry', $3, $4)`,
      [
        req.orgId,
        election.id,
        `Committee member '${reviewerName.trim()}' added to roster review panel`,
        req.adminEmail,
      ]
    )

    emitRosterUpdate(election.id)

    return ok(res, {
      reviewer: {
        id: row.id,
        reviewerName: row.reviewer_name,
        reviewCode: row.review_code,
        approved: row.approved,
        approvedAt: row.approved_at,
      },
    })
  } catch (err) {
    console.error("Add reviewer error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── DELETE /roster-approval/:slug/reviewer/:reviewerId ───────────────────────
// Admin: remove a committee member who has not yet approved.
router.delete("/:slug/reviewer/:reviewerId", resolveOrg, requireAdmin, async (req, res) => {
  const { reviewerId } = req.params

  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)

    const found = await query(
      `SELECT id, reviewer_name, approved FROM roster_approvals
        WHERE id = $1 AND org_id = $2 AND election_id = $3`,
      [reviewerId, req.orgId, election.id]
    )
    if (found.rows.length === 0) return fail(res, "Reviewer not found", 404)
    if (found.rows[0].approved) {
      return fail(res, "Cannot remove a reviewer who has already approved", 403)
    }

    await query(`DELETE FROM roster_approvals WHERE id = $1`, [reviewerId])

    await recomputeApprovalStatus(election.id)

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'registry', $3, $4)`,
      [
        req.orgId,
        election.id,
        `Committee member '${found.rows[0].reviewer_name}' removed from roster review panel`,
        req.adminEmail,
      ]
    )

    emitRosterUpdate(election.id)

    return ok(res, { message: "Reviewer removed" })
  } catch (err) {
    console.error("Remove reviewer error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /roster-approval/:slug/status ────────────────────────────────────────
// Admin: full panel + flag state for the dashboard.
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
      `SELECT id, reviewer_name, review_code, approved, approved_at
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
      reviewerName: a.reviewer_name,
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
// Public — reviewer enters their code and receives the voter list.
router.post("/:slug/review", resolveOrg, async (req, res) => {
  const { reviewCode } = req.body
  if (!reviewCode?.trim()) return fail(res, "Review code required")

  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, reviewer_name, approved, approved_at
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), election.id]
    )
    if (approvalResult.rows.length === 0) return fail(res, "Invalid review code", 404)
    const approval = approvalResult.rows[0]

    const votersResult = await query(
      `SELECT matric, name FROM voters WHERE election_id = $1 ORDER BY name`,
      [election.id]
    )

    return ok(res, {
      approval: {
        id: approval.id,
        reviewerName: approval.reviewer_name,
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
// Public — reviewer records their approval.
router.post("/:slug/approve", resolveOrg, async (req, res) => {
  const { reviewCode } = req.body
  if (!reviewCode?.trim()) return fail(res, "Review code required")

  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, reviewer_name, approved
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), election.id]
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
        election.id,
        `${approval.reviewer_name} approved the voter list`,
        approval.reviewer_name,
      ]
    )

    const status = await recomputeApprovalStatus(election.id)
    const allApproved = status === "APPROVED"
    if (allApproved) {
      await query(
        `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
         VALUES ($1, $2, 'registry', $3, $4)`,
        [
          req.orgId,
          election.id,
          "All committee members approved the voter roster — registry cleared for locking",
          "SYSTEM",
        ]
      )
    }

    emitRosterUpdate(election.id)

    return ok(res, {
      message: "Approval recorded",
      reviewerName: approval.reviewer_name,
      approvedAt,
      allApproved,
    })
  } catch (err) {
    console.error("Roster approve error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/flag ─────────────────────────────────────────
// Public — reviewer disputes a specific voter entry.
router.post("/:slug/flag", resolveOrg, async (req, res) => {
  const { reviewCode, matric, reason } = req.body
  if (!reviewCode?.trim() || !matric?.trim() || !reason?.trim()) {
    return fail(res, "Review code, matric and reason are required")
  }

  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)

    const approvalResult = await query(
      `SELECT id, reviewer_name, approved
         FROM roster_approvals
        WHERE UPPER(review_code) = UPPER($1) AND election_id = $2`,
      [reviewCode.trim(), election.id]
    )
    if (approvalResult.rows.length === 0) return fail(res, "Invalid review code", 404)
    const approval = approvalResult.rows[0]

    if (approval.approved) {
      return fail(res, "This roster has already been approved and can no longer be flagged", 400)
    }

    await query(
      `INSERT INTO roster_flags (approval_id, election_id, org_id, matric, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [approval.id, election.id, req.orgId, matric.trim(), reason.trim()]
    )

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'warning', $3, $4)`,
      [
        req.orgId,
        election.id,
        `${approval.reviewer_name} flagged matric ${matric.trim()} — reason: ${reason.trim()}`,
        approval.reviewer_name,
      ]
    )

    emitRosterUpdate(election.id)

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

    emitRosterUpdate(flag.election_id)

    return ok(res, { message: "Flag resolved" })
  } catch (err) {
    console.error("Resolve flag error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /roster-approval/:slug/regenerate ───────────────────────────────────
// Admin: reset every reviewer's approval back to pending (codes are kept).
router.post("/:slug/regenerate", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const election = await getElection(req.orgId)
    if (!election) return fail(res, "No election found", 404)

    await query(
      `UPDATE roster_approvals SET approved = FALSE, approved_at = NULL
        WHERE election_id = $1`,
      [election.id]
    )

    await recomputeApprovalStatus(election.id)

    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'admin', $3, $4)`,
      [
        req.orgId,
        election.id,
        "Roster approvals reset by admin — all committee members must re-approve",
        req.adminEmail,
      ]
    )

    emitRosterUpdate(election.id)

    return ok(res, { message: "Approvals reset" })
  } catch (err) {
    console.error("Reset approvals error:", err)
    return fail(res, "Server error", 500)
  }
})

export default router
