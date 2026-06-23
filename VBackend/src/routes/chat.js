// src/routes/chat.js
// Live support chat for Virtual Ballot.
// Mount in server.js:  app.use("/chat", chatRoutes)
//
// Voter endpoints (requireVoter):
//   POST   /chat/message              — voter sends a message
//   GET    /chat/:conversationId/messages — voter loads their history
//
// Staff endpoints (requireStaff):
//   GET    /chat/queue/:electionId    — live queue, urgent first
//   POST   /chat/:id/claim            — claim an escalated chat (race-safe)
//   POST   /chat/:id/release          — hand back to queue
//   POST   /chat/:id/reply            — send a reply to voter
//   POST   /chat/:id/resolve          — mark resolved
//   GET    /chat/:id/transcript       — full history for audit/PDF
//
// Admin endpoints (requireAdmin):
//   GET    /chat/faqs/:electionId     — list FAQs for an election
//   POST   /chat/faqs                 — create FAQ entry
//   DELETE /chat/faqs/:faqId          — delete FAQ entry
//   GET    /chat/canned/:electionId   — list canned replies
//   POST   /chat/canned               — create canned reply
//   DELETE /chat/canned/:id           — delete canned reply
//   GET    /chat/stats/:electionId    — conversation stats for dashboard

import express from "express"
import { query } from "../db/pool.js"
import { io } from "../server.js"
import { ok, fail } from "../utils/index.js"
import { requireVoter, requireAdmin } from "../middleware/auth.js"
import { requireStaff } from "../middleware/auth.js"   // added in requireStaff.js step

const router = express.Router()

// ── Keywords that skip FAQ matching and jump straight to a human ─────────────
const URGENT_KEYWORDS = [
  "fraud", "rigged", "cheat", "hack", "hacked", "not working",
  "can't vote", "cannot vote", "couldn't vote", "didn't register",
  "complaint", "illegal", "lawsuit", "wrong result", "missing",
]

function isUrgent(text) {
  const lower = text.toLowerCase()
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── Match voter message against this election's FAQ ──────────────────────────
// Returns the best match if confident (rank ≥ 0.2), else null.
async function findBestMatch(electionId, message) {
  const result = await query(
    `SELECT question, answer,
            ts_rank(search_vector, plainto_tsquery('english', $2)) AS rank
     FROM election_chat_faqs
     WHERE election_id = $1
       AND search_vector @@ plainto_tsquery('english', $2)
     ORDER BY rank DESC
     LIMIT 1`,
    [electionId, message]
  )
  if (result.rows.length === 0 || result.rows[0].rank < 0.2) return null
  return result.rows[0]
}

// Loose matches sent to staff alongside escalated chats as suggestions.
async function findSuggestions(electionId, message, limit = 3) {
  const result = await query(
    `SELECT question, answer,
            ts_rank(search_vector, plainto_tsquery('english', $2)) AS rank
     FROM election_chat_faqs
     WHERE election_id = $1
       AND search_vector @@ plainto_tsquery('english', $2)
     ORDER BY rank DESC
     LIMIT $3`,
    [electionId, message, limit]
  )
  return result.rows
}

// ── POST /chat/message ────────────────────────────────────────────────────────
// Voter sends a message. Tries FAQ auto-reply first; escalates if no match.
// Body: { content, conversationId? }
// JWT provides: voterId, electionId, orgId
router.post("/message", requireVoter, async (req, res) => {
  const { content, conversationId } = req.body
  const { voterId, electionId, orgId } = req

  if (!content?.trim()) return fail(res, "Message content required")
  if (content.length > 2000) return fail(res, "Message too long (max 2000 characters)")

  try {
    // Get or create conversation
    let convoId = conversationId
    let isNew = false

    if (!convoId) {
      // Check if voter already has an open/escalated/claimed convo for this election
      const existing = await query(
        `SELECT id FROM chat_conversations
         WHERE election_id = $1 AND voter_id = $2 AND status != 'resolved'
         ORDER BY created_at DESC LIMIT 1`,
        [electionId, voterId]
      )
      if (existing.rows.length > 0) {
        convoId = existing.rows[0].id
      } else {
        const created = await query(
          `INSERT INTO chat_conversations (election_id, org_id, voter_id, status)
           VALUES ($1, $2, $3, 'open') RETURNING id`,
          [electionId, orgId, voterId]
        )
        convoId = created.rows[0].id
        isNew = true
      }
    }

    // Save voter's message
    await query(
      `INSERT INTO chat_messages (conversation_id, sender_type, content)
       VALUES ($1, 'voter', $2)`,
      [convoId, content.trim()]
    )

    const urgent = isUrgent(content)
    const match = urgent ? null : await findBestMatch(electionId, content)

    if (match) {
      // Auto-reply from FAQ
      await query(
        `INSERT INTO chat_messages (conversation_id, sender_type, content)
         VALUES ($1, 'auto', $2)`,
        [convoId, match.answer]
      )
      await query(
        `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
        [convoId]
      )

      io.to(`chat:convo:${convoId}`).emit("auto:reply", {
        conversationId: convoId,
        content: match.answer,
      })

      return ok(res, { conversationId: convoId, matched: true, isNew })
    }

    // No match — escalate to staff queue
    const suggestions = await findSuggestions(electionId, content)

    await query(
      `UPDATE chat_conversations
       SET status = 'escalated', is_urgent = $2, last_message_at = NOW()
       WHERE id = $1`,
      [convoId, urgent]
    )

    // Get voter name for staff display
    const voterResult = await query(
      `SELECT name, matric FROM voters WHERE id = $1`, [voterId]
    )
    const voter = voterResult.rows[0] || { name: "Unknown", matric: "" }

    io.to(`chat:org:${orgId}`).emit("chat:escalated", {
      conversationId: convoId,
      electionId,
      message: content.trim(),
      urgent,
      suggestions,
      voter: { name: voter.name, matric: voter.matric },
    })

    return ok(res, { conversationId: convoId, matched: false, isNew })
  } catch (err) {
    console.error("chat/message error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── GET /chat/:conversationId/messages ────────────────────────────────────────
// Voter loads their conversation history (e.g. on page refresh).
router.get("/:conversationId/messages", requireVoter, async (req, res) => {
  try {
    const convo = await query(
      `SELECT id FROM chat_conversations
       WHERE id = $1 AND voter_id = $2`,
      [req.params.conversationId, req.voterId]
    )
    if (convo.rows.length === 0) return fail(res, "Conversation not found", 404)

    const messages = await query(
      `SELECT sender_type, content, created_at
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [req.params.conversationId]
    )
    return ok(res, { messages: messages.rows })
  } catch (err) {
    console.error("chat/messages error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── GET /chat/queue/:electionId ───────────────────────────────────────────────
// Staff: live queue for one election — urgent chats float to the top.
router.get("/queue/:electionId", requireStaff, async (req, res) => {
  try {
    // Verify staff belongs to the org that owns this election
    const electionCheck = await query(
      `SELECT id FROM elections WHERE id = $1 AND org_id = $2`,
      [req.params.electionId, req.orgId]
    )
    if (electionCheck.rows.length === 0) {
      return fail(res, "Election not found", 404)
    }

    const result = await query(
      `SELECT c.id, c.status, c.is_urgent, c.last_message_at, c.assigned_staff_id,
              v.name AS voter_name, v.matric AS voter_matric,
              sm.name AS assigned_to,
              (SELECT content FROM chat_messages
               WHERE conversation_id = c.id
               ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chat_conversations c
       LEFT JOIN voters v     ON v.id = c.voter_id
       LEFT JOIN staff_members sm ON sm.id = c.assigned_staff_id
       WHERE c.election_id = $1 AND c.status IN ('escalated','claimed')
       ORDER BY c.is_urgent DESC, c.last_message_at DESC`,
      [req.params.electionId]
    )
    return ok(res, { queue: result.rows })
  } catch (err) {
    console.error("chat/queue error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── POST /chat/:id/claim ──────────────────────────────────────────────────────
// Staff claims an escalated chat — race-safe UPDATE returns nothing if
// someone else already grabbed it.
router.post("/:id/claim", requireStaff, async (req, res) => {
  try {
    const result = await query(
      `UPDATE chat_conversations
       SET assigned_staff_id = $1, status = 'claimed'
       WHERE id = $2
         AND org_id = $3
         AND assigned_staff_id IS NULL
         AND status = 'escalated'
       RETURNING *`,
      [req.staffId, req.params.id, req.orgId]
    )

    if (result.rows.length === 0) {
      return fail(res, "Already claimed by someone else — or not in queue", 409)
    }
    const convo = result.rows[0]

    io.to(`chat:org:${req.orgId}`).emit("chat:claimed", {
      conversationId: convo.id,
      staffId: req.staffId,
      staffName: req.staffName,
    })

    return ok(res, { conversation: convo })
  } catch (err) {
    console.error("chat/claim error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── POST /chat/:id/release ────────────────────────────────────────────────────
// Staff hands their claimed chat back to the queue (shift change, etc.)
router.post("/:id/release", requireStaff, async (req, res) => {
  try {
    const result = await query(
      `UPDATE chat_conversations
       SET assigned_staff_id = NULL, status = 'escalated'
       WHERE id = $1 AND assigned_staff_id = $2 AND org_id = $3
       RETURNING *`,
      [req.params.id, req.staffId, req.orgId]
    )
    if (result.rows.length === 0) {
      return fail(res, "You do not have this conversation claimed", 403)
    }

    io.to(`chat:org:${req.orgId}`).emit("chat:released", {
      conversationId: req.params.id,
      reason: "released by staff",
    })

    return ok(res, { message: "Conversation returned to queue" })
  } catch (err) {
    console.error("chat/release error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── POST /chat/:id/reply ──────────────────────────────────────────────────────
// Staff sends a reply. Voter receives it live via socket.
// Body: { content }
router.post("/:id/reply", requireStaff, async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) return fail(res, "Reply content required")
  if (content.length > 2000) return fail(res, "Message too long (max 2000 characters)")

  try {
    // Verify staff is assigned to this conversation and it belongs to their org
    const convo = await query(
      `SELECT id, assigned_staff_id, org_id FROM chat_conversations
       WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.orgId]
    )
    if (convo.rows.length === 0) return fail(res, "Conversation not found", 404)
    if (convo.rows[0].assigned_staff_id !== req.staffId) {
      return fail(res, "Claim this conversation before replying", 403)
    }

    await query(
      `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, content)
       VALUES ($1, 'staff', $2, $3)`,
      [req.params.id, req.staffId, content.trim()]
    )
    await query(
      `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    io.to(`chat:convo:${req.params.id}`).emit("staff:reply", {
      conversationId: req.params.id,
      content: content.trim(),
      staffName: req.staffName,
    })

    return ok(res, { ok: true })
  } catch (err) {
    console.error("chat/reply error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── POST /chat/:id/resolve ────────────────────────────────────────────────────
// Mark a conversation resolved. Voter sees a "this chat is closed" state.
router.post("/:id/resolve", requireStaff, async (req, res) => {
  try {
    const result = await query(
      `UPDATE chat_conversations
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING *`,
      [req.params.id, req.orgId]
    )
    if (result.rows.length === 0) return fail(res, "Conversation not found", 404)

    const convo = result.rows[0]

    // Log to audit trail so it appears in the existing AuditLogTab
    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'admin', $3, $4)`,
      [
        req.orgId,
        convo.election_id,
        `Chat conversation resolved`,
        req.staffName,
      ]
    )

    io.to(`chat:org:${req.orgId}`).emit("chat:resolved", { conversationId: req.params.id })
    io.to(`chat:convo:${req.params.id}`).emit("chat:resolved", { conversationId: req.params.id })

    return ok(res, { message: "Conversation resolved" })
  } catch (err) {
    console.error("chat/resolve error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── GET /chat/:id/transcript ──────────────────────────────────────────────────
// Full message history — feed into your existing PDF generator for audit records.
router.get("/:id/transcript", requireStaff, async (req, res) => {
  try {
    const convo = await query(
      `SELECT c.*, v.name AS voter_name, v.matric AS voter_matric,
              e.name AS election_name, o.name AS org_name
       FROM chat_conversations c
       LEFT JOIN voters v     ON v.id = c.voter_id
       JOIN elections e        ON e.id = c.election_id
       JOIN organizations o    ON o.id = c.org_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [req.params.id, req.orgId]
    )
    if (convo.rows.length === 0) return fail(res, "Conversation not found", 404)

    const messages = await query(
      `SELECT cm.sender_type, cm.content, cm.created_at,
              sm.name AS staff_name
       FROM chat_messages cm
       LEFT JOIN staff_members sm ON sm.id = cm.sender_id
       WHERE cm.conversation_id = $1
       ORDER BY cm.created_at ASC`,
      [req.params.id]
    )

    return ok(res, {
      conversation: convo.rows[0],
      messages: messages.rows,
    })
  } catch (err) {
    console.error("chat/transcript error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── GET /chat/stats/:electionId ───────────────────────────────────────────────
// Admin: conversation stats for the dashboard.
router.get("/stats/:electionId", requireAdmin, async (req, res) => {
  try {
    const electionCheck = await query(
      `SELECT id FROM elections WHERE id = $1 AND org_id = $2`,
      [req.params.electionId, req.orgId]
    )
    if (electionCheck.rows.length === 0) return fail(res, "Election not found", 404)

    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status != 'resolved') AS open_count,
         COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
         COUNT(*) FILTER (WHERE status = 'claimed')   AS claimed_count,
         COUNT(*) FILTER (WHERE status = 'resolved')  AS resolved_count,
         COUNT(*) FILTER (WHERE is_urgent = TRUE AND status != 'resolved') AS urgent_count,
         COUNT(*) AS total_count
       FROM chat_conversations
       WHERE election_id = $1`,
      [req.params.electionId]
    )
    return ok(res, { stats: result.rows[0] })
  } catch (err) {
    console.error("chat/stats error:", err)
    return fail(res, "Server error", 500)
  }
})

// ── FAQ management (admin only) ───────────────────────────────────────────────

router.get("/faqs/:electionId", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, question, answer, created_at
       FROM election_chat_faqs
       WHERE election_id = $1 AND org_id = $2
       ORDER BY created_at ASC`,
      [req.params.electionId, req.orgId]
    )
    return ok(res, { faqs: result.rows })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

router.post("/faqs", requireAdmin, async (req, res) => {
  const { electionId, question, answer } = req.body
  if (!question?.trim()) return fail(res, "Question required")
  if (!answer?.trim())   return fail(res, "Answer required")

  try {
    const electionCheck = await query(
      `SELECT id FROM elections WHERE id = $1 AND org_id = $2`,
      [electionId, req.orgId]
    )
    if (electionCheck.rows.length === 0) return fail(res, "Election not found", 404)

    const result = await query(
      `INSERT INTO election_chat_faqs (election_id, org_id, question, answer)
       VALUES ($1, $2, $3, $4) RETURNING id, question, answer`,
      [electionId, req.orgId, question.trim(), answer.trim()]
    )
    return ok(res, { faq: result.rows[0] }, 201)
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

router.delete("/faqs/:faqId", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM election_chat_faqs WHERE id = $1 AND org_id = $2 RETURNING id`,
      [req.params.faqId, req.orgId]
    )
    if (result.rows.length === 0) return fail(res, "FAQ not found", 404)
    return ok(res, { message: "FAQ deleted" })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ── Canned replies (admin creates, staff uses) ────────────────────────────────

router.get("/canned/:electionId", requireStaff, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, label, body FROM canned_replies
       WHERE election_id = $1 AND org_id = $2
       ORDER BY label ASC`,
      [req.params.electionId, req.orgId]
    )
    return ok(res, { replies: result.rows })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

router.post("/canned", requireAdmin, async (req, res) => {
  const { electionId, label, body } = req.body
  if (!label?.trim()) return fail(res, "Label required")
  if (!body?.trim())  return fail(res, "Body required")

  try {
    const result = await query(
      `INSERT INTO canned_replies (election_id, org_id, label, body)
       VALUES ($1, $2, $3, $4) RETURNING id, label, body`,
      [electionId, req.orgId, label.trim(), body.trim()]
    )
    return ok(res, { reply: result.rows[0] }, 201)
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

router.delete("/canned/:id", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM canned_replies WHERE id = $1 AND org_id = $2 RETURNING id`,
      [req.params.id, req.orgId]
    )
    if (result.rows.length === 0) return fail(res, "Canned reply not found", 404)
    return ok(res, { message: "Canned reply deleted" })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

export default router
