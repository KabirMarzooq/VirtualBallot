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
      `SELECT id, name, slug, logo_url FROM organizations WHERE slug = $1`,
      [slug]
    )

    if (result.rows.length === 0) {
      return fail(res, "Organization not found", 404)
    }

    req.org = result.rows[0]
    req.orgId = result.rows[0].id
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
