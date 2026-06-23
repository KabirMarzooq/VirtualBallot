import { verifyAccessToken, fail } from "../utils/index.js"
import { query } from "../db/pool.js"

/**
 * requireVoter
 * Verifies the JWT in the Authorization header and attaches
 * the voter record + election context to req.
 */
export const requireVoter = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
      return fail(res, "No token provided", 401)
    }

    const token = header.split(" ")[1]
    const payload = verifyAccessToken(token)

    // Attach context to request
    req.voterId = payload.voterId
    req.electionId = payload.electionId
    req.orgId = payload.orgId

    next()
  } catch (err) {
    return fail(res, "Invalid or expired token — please log in again", 401)
  }
}

/**
 * requireAdmin
 * Verifies the JWT and checks that role === 'admin'.
 * Used on all admin-only routes.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
      return fail(res, "No token provided", 401)
    }

    const token = header.split(" ")[1]
    const payload = verifyAccessToken(token)

    if (payload.role !== "admin") {
      return fail(res, "Admin access required", 403)
    }

    req.orgId = payload.orgId
    req.electionId = payload.electionId
    req.adminEmail = payload.email

    next()
  } catch (err) {
    return fail(res, "Invalid or expired token", 401)
  }
}

/**
 * requireObserver
 * Verifies the JWT and checks that role === 'observer'.
 */
export const requireObserver = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
      return fail(res, "No token provided", 401)
    }

    const token = header.split(" ")[1]
    const payload = verifyAccessToken(token)

    if (payload.role !== "observer" && payload.role !== "admin") {
      return fail(res, "Observer access required", 403)
    }

    req.orgId = payload.orgId
    req.electionId = payload.electionId

    next()
  } catch (err) {
    return fail(res, "Invalid or expired token", 401)
  }
}

/**
 * resolveOrg
 * Reads the org slug from req.params or the x-org-slug header,
 * looks up the org, and attaches it to req.
 * Use this on all public routes that need to know which org they're for.
 */
export const resolveOrg = async (req, res, next) => {
  try {
    // Get slug from param (:slug in route) or header
    const slug = req.params.slug || req.headers["x-org-slug"]
    if (!slug) return fail(res, "Organization slug required", 400)

    const result = await query(
      `SELECT id, name, slug, logo_url, is_active FROM organizations WHERE slug = $1`,
      [slug]
    )

    if (result.rows.length === 0) {
      return fail(res, "Organization not found", 404)
    }

    if (!result.rows[0].is_active) {
      return fail(res, "This organization has been deactivated. Please contact support.", 403)
    }

    req.org = result.rows[0]
    req.orgId = result.rows[0].id
    req.orgName = result.rows[0].name

    // Auto-end any election whose timer has expired, and capture which ended
    const justEnded = await query(
      `UPDATE elections
 SET status = 'ENDED', updated_at = NOW()
 WHERE org_id = $1
   AND status = 'ACTIVE'
   AND ends_at IS NOT NULL
   AND ends_at < NOW()
 RETURNING id`,
      [req.orgId]
    )

    // Write the definitive final anchor for each election that just ended,
    // so timer-ended elections get the same airtight final checkpoint as
    // manually-ended ones (not just the periodic ~10-min snapshot).
    if (justEnded.rows.length > 0) {
      try {
        const { anchorChain } = await import("../utils/voteChain.js")
        for (const row of justEnded.rows) {
          await anchorChain(row.id)
        }
      } catch (e) {
        console.error("Auto-end final anchor failed:", e.message)
      }
    }

    next()
  } catch (err) {
    return fail(res, "Server error", 500)
  }
}

/**
 * requireSuperAdmin
 * Checks the JWT role is 'superadmin'.
 * Superadmin token is issued only via POST /auth/superadmin/login
 * using credentials stored entirely in .env — never in the database.
 */
export const requireSuperAdmin = (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) return fail(res, "No token provided", 401)

    const token = header.split(" ")[1]
    const payload = verifyAccessToken(token)

    if (payload.role !== "superadmin") return fail(res, "Super admin access required", 403)

    req.superAdmin = true
    next()
  } catch (err) {
    return fail(res, "Invalid or expired token", 401)
  }
}

/**
 * requireStaff
 * Verifies the JWT and checks role === 'staff'.
 * Used on all chat management routes.
 * Sets: req.staffId, req.orgId, req.staffName
 */
export const requireStaff = (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
      return fail(res, "No token provided", 401)
    }

    const token = header.split(" ")[1]
    const payload = verifyAccessToken(token)

    if (payload.role !== "staff" && payload.role !== "admin") {
      return fail(res, "Staff access required", 403)
    }

    req.staffId   = payload.staffId || null  // null if admin is acting as staff
    req.orgId     = payload.orgId
    req.staffName = payload.name || payload.email || "Admin"

    next()
  } catch (err) {
    return fail(res, "Invalid or expired token", 401)
  }
}
