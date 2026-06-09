import express from "express"
import { query } from "../db/pool.js"
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
        const [orgsResult, statsResult, activeResult] = await Promise.all([
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
          COUNT(DISTINCT v.id) FILTER (WHERE v.has_voted = TRUE)     AS total_votes_cast
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

            // Currently active elections with live voter counts
            query(`
        SELECT
          e.id,
          e.name          AS election_name,
          e.status,
          e.started_at,
          e.ends_at,
          o.name          AS org_name,
          o.slug,
          COUNT(DISTINCT v.id)                                    AS total_voters,
          COUNT(DISTINCT v.id) FILTER (WHERE v.has_voted = TRUE) AS votes_cast
        FROM elections e
        JOIN organizations o ON o.id = e.org_id
        LEFT JOIN voters v   ON v.election_id = e.id
        WHERE e.status = 'ACTIVE'
        GROUP BY e.id, o.id
        ORDER BY e.started_at DESC
      `),
        ])

        return ok(res, {
            orgs: orgsResult.rows,
            stats: statsResult.rows[0],
            liveElections: activeResult.rows,
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

export default router