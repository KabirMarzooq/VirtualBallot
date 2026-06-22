import express from "express"
import { getClient, query } from "../db/pool.js"
import { recomputeChain } from "../utils/voteChain.js"
import { signAccessToken, ok, fail } from "../utils/index.js"
import { requireSuperAdmin } from "../middleware/auth.js"
import dotenv from "dotenv"
dotenv.config()

const router = express.Router()

// ─── POST /superadmin/login ───────────────────────────────────────────────────
// Credentials come from .env only — nothing touches the database
router.post("/login", async (req, res) => {
    const { email, secret } = req.body

    if (!email || !secret) return fail(res, "Email and secret required")

    const validEmail = process.env.SUPERADMIN_EMAIL
    const validSecret = process.env.SUPERADMIN_SECRET

    if (!validEmail || !validSecret) {
        return fail(res, "Super admin not configured on this server", 503)
    }

    if (
        email.trim().toLowerCase() !== validEmail.toLowerCase() ||
        secret !== validSecret
    ) {
        return fail(res, "Invalid credentials", 401)
    }

    const token = signAccessToken({
        role: "superadmin",
        email: validEmail,
    })

    return ok(res, {
        accessToken: token,
        message: "Super admin authenticated",
    })
})

// ─── GET /superadmin/overview ─────────────────────────────────────────────────
// Platform-wide stats — all orgs, elections, votes
router.get("/overview", requireSuperAdmin, async (req, res) => {
    try {
        const [orgsResult, statsResult, activeResult, paymentHealthResult] = await Promise.all([
            // All orgs with their latest election info
            query(`
        SELECT
          o.id,
          o.name,
          o.slug,
          o.admin_email,
          o.created_at,
          o.is_active,
          COUNT(DISTINCT e.id)                                        AS total_elections,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE')    AS active_elections,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ENDED')     AS ended_elections,
          COUNT(DISTINCT v.id)                                        AS total_voters,
          COUNT(DISTINCT v.id) FILTER (WHERE v.has_voted = TRUE)     AS total_votes_cast,
          (SELECT voting_mode FROM elections WHERE org_id = o.id ORDER BY created_at DESC LIMIT 1) AS latest_voting_mode,
          (SELECT vote_type   FROM elections WHERE org_id = o.id ORDER BY created_at DESC LIMIT 1) AS latest_vote_type
        FROM organizations o
        LEFT JOIN elections  e ON e.org_id = o.id
        LEFT JOIN voters     v ON v.election_id = e.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `),

            // Platform totals
            query(`
        SELECT
          COUNT(DISTINCT o.id)                                        AS total_orgs,
          COUNT(DISTINCT e.id)                                        AS total_elections,
          COUNT(DISTINCT v.id) FILTER (WHERE v.has_voted = TRUE)     AS total_votes,
          COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE')    AS live_elections
        FROM organizations o
        LEFT JOIN elections e ON e.org_id = o.id
        LEFT JOIN voters    v ON v.election_id = e.id
      `),

            // Currently active elections — votes from candidate counts (works for all types)
            query(`
    SELECT
      e.id,
      e.name          AS election_name,
      e.status,
      e.started_at,
      e.ends_at,
      e.voting_mode,
      e.vote_type,
      e.fraud_tier,
      o.name          AS org_name,
      o.slug,
      COUNT(DISTINCT v.id)                                    AS total_voters,
      COALESCE((SELECT SUM(vote_count) FROM candidates WHERE election_id = e.id), 0) AS votes_cast
    FROM elections e
    JOIN organizations o ON o.id = e.org_id
    LEFT JOIN voters v   ON v.election_id = e.id
    WHERE e.status = 'ACTIVE'
        GROUP BY e.id, o.id
        ORDER BY e.started_at DESC
      `),

            // Payment health — elections with stuck PENDING transactions
            query(`
        SELECT
          e.id, e.name AS election_name, o.name AS org_name, o.slug,
          COUNT(*) FILTER (WHERE pt.status = 'PENDING') AS pending,
          COUNT(*) FILTER (WHERE pt.status = 'SUCCESS') AS success,
          COUNT(*) AS total
        FROM paid_transactions pt
        JOIN elections e     ON e.id = pt.election_id
        JOIN organizations o ON o.id = pt.org_id
        GROUP BY e.id, o.id
        HAVING COUNT(*) FILTER (WHERE pt.status = 'PENDING') >= 3
           AND COUNT(*) FILTER (WHERE pt.status = 'PENDING') > COUNT(*) FILTER (WHERE pt.status = 'SUCCESS')
        ORDER BY pending DESC
      `),
        ])

        return ok(res, {
            orgs: orgsResult.rows,
            stats: statsResult.rows[0],
            liveElections: activeResult.rows,
            paymentAlerts: paymentHealthResult.rows,
        })
    } catch (err) {
        console.error("Superadmin overview error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── GET /superadmin/logs ─────────────────────────────────────────────────────
// Cross-org audit log — all events across all organizations
router.get("/logs", requireSuperAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const offset = Number(req.query.offset) || 0
    const org = req.query.org || null   // filter by org slug
    const type = req.query.type || null   // filter by event type

    try {
        const conditions = ["1=1"]
        const values = []
        let idx = 1

        if (org) {
            conditions.push(`o.slug = $${idx++}`)
            values.push(org)
        }
        if (type) {
            conditions.push(`al.event_type = $${idx++}`)
            values.push(type)
        }

        const result = await query(`
            SELECT
              al.id,
              al.event_type,
              al.message,
              al.actor,
              al.created_at,
              o.name  AS org_name,
              o.slug  AS org_slug,
              e.name  AS election_name
            FROM audit_logs al
            LEFT JOIN organizations o ON o.id = al.org_id
            LEFT JOIN elections     e ON e.id = al.election_id
            WHERE ${conditions.join(" AND ")}
            ORDER BY al.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `, values)

        const countResult = await query(`
            SELECT COUNT(*) AS total
            FROM audit_logs al
            LEFT JOIN organizations o ON o.id = al.org_id
            WHERE ${conditions.join(" AND ")}
          `, values)

        return ok(res, {
            logs: result.rows,
            total: Number(countResult.rows[0].total),
            limit,
            offset,
        })
    } catch (err) {
        console.error("Superadmin logs error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── PATCH /superadmin/orgs/:orgId/deactivate ─────────────────────────────────
// Soft-deactivate an org — they can't log in but all data is preserved
router.patch("/orgs/:orgId/deactivate", requireSuperAdmin, async (req, res) => {
    const { orgId } = req.params
    const { reason } = req.body

    try {
        const result = await query(
            `UPDATE organizations SET is_active = FALSE WHERE id = $1 RETURNING name, slug`,
            [orgId]
        )
        if (result.rows.length === 0) return fail(res, "Organization not found", 404)

        // Log it
        await query(
            `INSERT INTO audit_logs (org_id, event_type, message, actor)
       VALUES ($1, 'warning', $2, 'SUPERADMIN')`,
            [orgId, `Organization deactivated by platform admin. Reason: ${reason || "not specified"}`]
        )

        return ok(res, {
            message: `${result.rows[0].name} has been deactivated`,
            org: result.rows[0],
        })
    } catch (err) {
        return fail(res, "Server error", 500)
    }
})

// ─── PATCH /superadmin/orgs/:orgId/reactivate ────────────────────────────────
router.patch("/orgs/:orgId/reactivate", requireSuperAdmin, async (req, res) => {
    const { orgId } = req.params
    try {
        const result = await query(
            `UPDATE organizations SET is_active = TRUE WHERE id = $1 RETURNING name, slug`,
            [orgId]
        )
        if (result.rows.length === 0) return fail(res, "Organization not found", 404)

        await query(
            `INSERT INTO audit_logs (org_id, event_type, message, actor)
       VALUES ($1, 'system', 'Organization reactivated by platform admin', 'SUPERADMIN')`,
            [orgId]
        )

        return ok(res, { message: `${result.rows[0].name} has been reactivated` })
    } catch (err) {
        return fail(res, "Server error", 500)
    }
})

// ─── GET /superadmin/invoices — every paid transaction, platform-wide ─────────
router.get("/invoices", requireSuperAdmin, async (req, res) => {
    const { org, status, search, limit = 50, offset = 0 } = req.query
    try {
        const conditions = []
        const values = []
        let idx = 1

        if (org) { conditions.push(`o.slug ILIKE $${idx++}`); values.push(`%${org}%`) }
        if (status) { conditions.push(`pt.status = $${idx++}`); values.push(status) }
        if (search) {
            conditions.push(`(pt.voter_email ILIKE $${idx} OR pt.reference ILIKE $${idx} OR c.name ILIKE $${idx} OR o.name ILIKE $${idx})`)
            values.push(`%${search}%`); idx++
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

        const result = await query(
            `SELECT pt.id, pt.reference, pt.voter_email, pt.amount_kobo, pt.fee_kobo,
                pt.votes_purchased, pt.status, pt.created_at, pt.position,
                c.name AS candidate_name,
                e.name AS election_name,
                o.name AS org_name, o.slug AS org_slug
         FROM paid_transactions pt
         JOIN candidates c    ON c.id = pt.candidate_id
         JOIN elections  e    ON e.id = pt.election_id
         JOIN organizations o ON o.id = pt.org_id
         ${where}
         ORDER BY pt.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
            [...values, Number(limit), Number(offset)]
        )

        const countResult = await query(
            `SELECT COUNT(*) AS total
         FROM paid_transactions pt
         JOIN candidates c    ON c.id = pt.candidate_id
         JOIN organizations o ON o.id = pt.org_id
         ${where}`,
            values
        )

        const totals = await query(
            `SELECT
           COALESCE(SUM(amount_kobo) FILTER (WHERE status='SUCCESS'),0) AS revenue_kobo,
           COUNT(*) FILTER (WHERE status='SUCCESS') AS success_count,
           COUNT(*) FILTER (WHERE status='PENDING') AS pending_count
         FROM paid_transactions`
        )

        return ok(res, {
            invoices: result.rows,
            total: Number(countResult.rows[0].total),
            summary: {
                revenueKobo: Number(totals.rows[0].revenue_kobo),
                successCount: Number(totals.rows[0].success_count),
                pendingCount: Number(totals.rows[0].pending_count),
            },
        })
    } catch (err) {
        console.error("Superadmin invoices error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── GET /superadmin/verify-chain/:electionId ─────────────────────────────────
// Recomputes an election's entire vote chain and reports integrity.
router.get("/verify-chain/:electionId", requireSuperAdmin, async (req, res) => {
    const { electionId } = req.params
    const client = await getClient()
    try {
        const integrity = await recomputeChain(client, electionId)

        // Cross-check: does the chain length match the actual vote tally?
        const tally = await query(
            `SELECT COALESCE(SUM(vote_count),0) AS total FROM candidates WHERE election_id = $1`,
            [electionId]
        )
        const voteTotal = Number(tally.rows[0].total)

        return ok(res, {
            intact: integrity.intact,
            brokenAt: integrity.brokenAt,
            chainLength: integrity.length,
            voteTotal,
            lengthMatches: integrity.length === voteTotal,
            headHash: integrity.headHash || null,
        })
    } catch (err) {
        console.error("Chain verify error:", err)
        return fail(res, "Server error", 500)
    } finally {
        client.release()
    }
})

export default router