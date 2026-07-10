import { randomInt } from "crypto"
import { query } from "../db/pool.js"

// Unambiguous alphabet — no 0/O/1/I so codes survive being read aloud or typed
// from a WhatsApp message.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6

const randomCode = () => {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}

// A globally-unique review code. Codes must be unique across ALL elections
// because the public /lookup endpoint resolves a code to its org with no slug.
export const generateReviewCode = async () => {
  const existing = await query(`SELECT review_code FROM roster_approvals`)
  const taken = new Set(existing.rows.map((r) => r.review_code))
  let code = randomCode()
  while (taken.has(code)) code = randomCode()
  return code
}

// Recompute and persist an election's roster_approval_status from its
// reviewers: IDLE when there are none, APPROVED when every reviewer has
// approved, otherwise PENDING. Returns the new status.
export const recomputeApprovalStatus = async (electionId) => {
  const tally = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE approved)::int AS approved
       FROM roster_approvals WHERE election_id = $1`,
    [electionId]
  )
  const { total, approved } = tally.rows[0]
  const status = total === 0 ? "IDLE" : approved === total ? "APPROVED" : "PENDING"
  await query(
    `UPDATE elections SET roster_approval_status = $1 WHERE id = $2`,
    [status, electionId]
  )
  return status
}
