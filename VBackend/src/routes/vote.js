import express from "express"
import { io } from "../server.js"
import { getClient, query } from "../db/pool.js"
import { requireVoter } from "../middleware/auth.js"
import { generateReceiptId, ok, fail } from "../utils/index.js"

const router = express.Router()

// ─── POST /vote ───────────────────────────────────────────────────────────────
// Submit a complete ballot.
//
// Body: { selections: [ { candidateId, position }, ... ] }
// One entry per position — voter must fill every position.
//
// Security layers:
//   1. JWT required (requireVoter middleware)
//   2. Voter's has_voted flag checked BEFORE writing
//   3. DB UNIQUE(election_id, voter_id, position) prevents any double-write
//   4. Everything runs in a single transaction — partial writes are impossible
//
router.post("/", requireVoter, async (req, res) => {
  const { selections } = req.body
  const { voterId, electionId, orgId } = req

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    return fail(res, "Ballot selections required")
  }

  const client = await getClient()

  try {
    await client.query("BEGIN")

    // 1. Verify election is still active
    const electionResult = await client.query(
      `SELECT status FROM elections WHERE id = $1 AND org_id = $2`,
      [electionId, orgId]
    )
    if (electionResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return fail(res, "Election not found", 404)
    }
    if (electionResult.rows[0].status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return fail(res, "Election is not currently active", 403)
    }

    // 2. Check voter hasn't already voted (application-level check before DB write)
    const voterResult = await client.query(
      `SELECT has_voted FROM voters WHERE id = $1 AND election_id = $2`,
      [voterId, electionId]
    )
    if (voterResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return fail(res, "Voter not found in this election", 404)
    }
    if (voterResult.rows[0].has_voted) {
      await client.query("ROLLBACK")
      return fail(res, "You have already voted in this election", 403)
    }

    // 3. Validate all candidate IDs belong to this election
    const candidateIds = selections.map(s => s.candidateId)
    const candidateResult = await client.query(
      `SELECT id, position FROM candidates
       WHERE election_id = $1 AND id = ANY($2::uuid[])`,
      [electionId, candidateIds]
    )
    if (candidateResult.rows.length !== selections.length) {
      await client.query("ROLLBACK")
      return fail(res, "One or more candidate IDs are invalid", 400)
    }

    // 4. Generate one receipt ID for the whole ballot
    const receiptId = generateReceiptId()

    // 5. Insert one ballot row per selection
    for (const sel of selections) {
      await client.query(
        `INSERT INTO ballots (election_id, org_id, voter_id, candidate_id, position, receipt_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [electionId, orgId, voterId, sel.candidateId, sel.position, receiptId]
      )
    }

    // 6. Increment vote_count on each selected candidate
    await client.query(
      `UPDATE candidates SET vote_count = vote_count + 1
       WHERE election_id = $1 AND id = ANY($2::uuid[])`,
      [electionId, candidateIds]
    )

    // 7. Mark voter as voted
    await client.query(
      `UPDATE voters SET has_voted = TRUE, voted_at = NOW()
       WHERE id = $1`,
      [voterId]
    )

    // 8. Write audit log
    await client.query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'vote', $3, $4)`,
      [orgId, electionId, `Voter cast ballot (receipt: ${receiptId})`, voterId]
    )

    await client.query("COMMIT")

    // ── Broadcast live update to all clients watching this election ──────────────
    // Fetch fresh vote counts to broadcast accurate numbers
    const updatedCandidates = await query(
      `SELECT id, name, position, vote_count, color, image_url
   FROM candidates WHERE election_id = $1
   ORDER BY position, vote_count DESC`,
      [electionId]
    )

    io.to(`election:${electionId}`).emit("vote:update", {
      electionId,
      receiptId,
      candidates: updatedCandidates.rows,
      timestamp: new Date().toISOString(),
    })

    return ok(res, {
      message: "Vote cast successfully",
      receiptId,
    })

  } catch (err) {
    await client.query("ROLLBACK")

    // Catch the DB unique constraint violation — means double-vote attempt
    if (err.code === "23505") {
      return fail(res, "You have already voted for one of these positions", 409)
    }

    console.error("Vote submission error:", err)
    return fail(res, "Failed to cast vote. Please try again.", 500)
  } finally {
    client.release()
  }
})

// ─── GET /vote/verify/:receiptId ──────────────────────────────────────────────
// Public — let anyone verify a receipt ID is in the ledger
router.get("/verify/:receiptId", async (req, res) => {
  const { receiptId } = req.params

  try {
    const result = await query(
      `SELECT b.receipt_id, b.position, c.name AS candidate_name, b.cast_at
       FROM ballots b
       JOIN candidates c ON c.id = b.candidate_id
       WHERE b.receipt_id = $1`,
      [receiptId.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return fail(res, "Receipt ID not found in the vote ledger", 404)
    }

    return ok(res, {
      receiptId,
      verified: true,
      castAt: result.rows[0].cast_at,
      positions: result.rows.map(r => ({
        position: r.position,
        candidate: r.candidate_name,
      })),
    })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

export default router
