import { randomInt } from "crypto"
import { query } from "../db/pool.js"

// Unambiguous alphabet — no 0/O/1/I to avoid transcription mistakes when a
// review code is read aloud or copied by a candidate rep.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6

// Generate one 6-char code, avoiding any code already in `taken` (a Set).
// `taken` is seeded with every existing review_code across ALL elections so
// codes stay globally unique — the public /lookup endpoint resolves a code to
// its election with no slug, which only works if codes never collide.
const makeCode = (taken) => {
  let code
  do {
    code = ""
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
    }
  } while (taken.has(code))
  taken.add(code)
  return code
}

// Shared roster-approval generation used by both the roster upload
// (voters.js) and the dedicated /generate + /regenerate endpoints.
//
// Deletes any existing approvals for this election (a re-upload resets
// approvals), mints one unique review code per candidate, inserts a row per
// candidate, and flips the election into the PENDING approval state.
//
// Does NOT write an audit log — callers log their own context-specific
// message. Returns { approvals, candidateCount }. When the election has no
// candidates yet, it is a no-op that returns an empty array so the caller can
// decide how to respond.
export const generateApprovalsForElection = async (electionId, orgId) => {
  const candidatesResult = await query(
    `SELECT id, name FROM candidates WHERE election_id = $1 ORDER BY created_at`,
    [electionId]
  )
  const candidates = candidatesResult.rows
  if (candidates.length === 0) {
    return { approvals: [], candidateCount: 0 }
  }

  // Reset: a fresh roster upload invalidates any prior approvals.
  await query(`DELETE FROM roster_approvals WHERE election_id = $1`, [electionId])

  // Seed the taken-set with every remaining code globally so new codes are
  // unique across elections, not just within this one.
  const existing = await query(`SELECT review_code FROM roster_approvals`)
  const taken = new Set(existing.rows.map((r) => r.review_code))

  const approvals = []
  for (const c of candidates) {
    const reviewCode = makeCode(taken)
    const inserted = await query(
      `INSERT INTO roster_approvals
         (election_id, org_id, candidate_id, candidate_name, review_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, candidate_id, candidate_name, review_code, approved, approved_at`,
      [electionId, orgId, c.id, c.name, reviewCode]
    )
    const row = inserted.rows[0]
    approvals.push({
      id: row.id,
      candidateId: row.candidate_id,
      candidateName: row.candidate_name,
      reviewCode: row.review_code,
      approved: row.approved,
      approvedAt: row.approved_at,
    })
  }

  await query(
    `UPDATE elections SET roster_approval_status = 'PENDING' WHERE id = $1`,
    [electionId]
  )

  return { approvals, candidateCount: candidates.length }
}
