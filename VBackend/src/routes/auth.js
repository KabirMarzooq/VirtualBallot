import express from "express"
import bcrypt from "bcryptjs"
import { query } from "../db/pool.js"
import crypto from "crypto"
import {
  generateOTP, hashOTP, verifyOTP,
  signAccessToken, signRefreshToken, verifyRefreshToken,
  sendOTPEmail, sendPasswordResetEmail, generateReceiptId, isValidEmail,
  ok, fail,
} from "../utils/index.js"
import { requireAdmin } from "../middleware/auth.js"
import dotenv from "dotenv"
dotenv.config()

const router = express.Router()

// ─── POST /auth/org/register ──────────────────────────────────────────────────
// Public — a new organization creates their admin account
// Body: { orgName, slug, adminEmail, password, confirmPassword }
router.post("/org/register", async (req, res) => {
  const { orgName, slug, adminEmail, password, confirmPassword } = req.body

  // Basic validation
  if (!orgName?.trim()) return fail(res, "Organization name is required")
  if (!slug?.trim()) return fail(res, "URL slug is required")
  if (!adminEmail?.trim()) return fail(res, "Admin email is required")
  if (!isValidEmail(adminEmail)) return fail(res, "Please enter a valid email address")
  if (!password) return fail(res, "Password is required")
  if (password !== confirmPassword) return fail(res, "Passwords do not match")
  if (password.length < 8) return fail(res, "Password must be at least 8 characters")

  // Slug validation — only lowercase letters, numbers, hyphens
  if (!/^[a-z0-9-]+$/.test(slug.trim())) {
    return fail(res, "Slug can only contain lowercase letters, numbers, and hyphens")
  }

  try {
    // Check slug is not already taken
    const slugCheck = await query(
      `SELECT id FROM organizations WHERE slug = $1`,
      [slug.trim().toLowerCase()]
    )
    if (slugCheck.rows.length > 0) {
      return fail(res, "This URL is already taken — please choose a different one", 409)
    }

    // Check email is not already registered
    const emailCheck = await query(
      `SELECT id FROM organizations WHERE admin_email = $1`,
      [adminEmail.trim().toLowerCase()]
    )
    if (emailCheck.rows.length > 0) {
      return fail(res, "An account with this email already exists", 409)
    }

    // Hash password and default observer PIN
    const adminHash = await bcrypt.hash(password, 10)
    const observerHash = await bcrypt.hash("0000", 10) // default — admin should change this

    // Create the organization
    const result = await query(
      `INSERT INTO organizations (name, slug, admin_email, admin_password, observer_pin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, slug`,
      [
        orgName.trim(),
        slug.trim().toLowerCase(),
        adminEmail.trim().toLowerCase(),
        adminHash,
        observerHash,
      ]
    )
    const org = result.rows[0]

    // Create a blank election for them automatically so the dashboard isn't broken
    await query(
      `INSERT INTO elections (org_id, name, status)
       VALUES ($1, $2, 'NOT_STARTED')`,
      [org.id, `${orgName.trim()} Election`]
    )

    return ok(res, {
      message: "Organization registered successfully. You can now log in.",
      org: { id: org.id, name: org.name, slug: org.slug },
    }, 201)
  } catch (err) {
    console.error("Org register error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/admin/login ───────────────────────────────────────────────────
// Slug-free admin login — finds org by email address
// This is what the admin login page uses
router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return fail(res, "Email and password required")
  if (!isValidEmail(email)) return fail(res, "Please enter a valid email address")

  try {
    const orgResult = await query(
      `SELECT id, name, slug, admin_email, admin_password, is_active
       FROM organizations WHERE admin_email = $1`,
      [email.trim().toLowerCase()]
    )
    if (orgResult.rows.length === 0) {
      return fail(res, "No account found with this email address", 404)
    }
    const org = orgResult.rows[0]

    // Block deactivated organizations
    if (!org.is_active) {
      return fail(res, "This organization has been deactivated. Please contact support.", 403)
    }

    const passwordOk = await bcrypt.compare(password, org.admin_password)
    if (!passwordOk) return fail(res, "Invalid credentials", 401)

    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    )
    const electionId = electionResult.rows[0]?.id || null

    const accessToken = signAccessToken({
      orgId: org.id,
      electionId,
      email: org.admin_email,
      role: "admin",
    })
    const refreshToken = signRefreshToken({
      orgId: org.id,
      email: org.admin_email,
      role: "admin",
    })

    return ok(res, {
      accessToken,
      refreshToken,
      org: { id: org.id, name: org.name, slug: org.slug },
      electionId,
    })
  } catch (err) {
    console.error("Admin login error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/:slug/voter/login ─────────────────────────────────────────────
// Step 1: voter enters matric number → system sends OTP to their email
router.post("/:slug/voter/login", async (req, res) => {
  const { matric } = req.body
  const { slug } = req.params

  if (!matric) return fail(res, "Matric number required")

  try {
    // Find the org
    const orgResult = await query(
      `SELECT id, name FROM organizations WHERE slug = $1`, [slug]
    )
    if (orgResult.rows.length === 0) return fail(res, "Organization not found", 404)
    const org = orgResult.rows[0]

    // Find active election for this org
    const electionResult = await query(
      `SELECT id, name, status, registry_locked FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const election = electionResult.rows[0]

    if (election.status === "NOT_STARTED") {
      return fail(res, "Election has not started yet", 403)
    }
    if (election.status === "ENDED") {
      return fail(res, "Election has ended", 403)
    }

    // Find voter in roster
    const voterResult = await query(
      `SELECT id, name, email, has_voted, matric FROM voters
       WHERE election_id = $1 AND UPPER(matric) = UPPER($2)`,
      [election.id, matric.trim()]
    )
    if (voterResult.rows.length === 0) {
      return fail(res, "Matric number not found in voter roster. Please contact the electoral commission.", 404)
    }
    const voter = voterResult.rows[0]

    if (voter.has_voted) {
      return fail(res, "You have already cast your vote in this election.", 403)
    }

    if (!voter.email) {
      return fail(res, "No email on file for this voter. Please contact the electoral commission.", 400)
    }

    // Generate and store OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const expires = new Date(Date.now() + (Number(process.env.OTP_EXPIRES_MINUTES) || 5) * 60 * 1000)

    // Invalidate any previous OTPs for this voter
    await query(`UPDATE otp_codes SET used = TRUE WHERE voter_id = $1 AND used = FALSE`, [voter.id])

    // Insert new OTP
    await query(
      `INSERT INTO otp_codes (voter_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [voter.id, otpHash, expires]
    )

    // Send OTP email (logs to console in dev if SMTP not configured)
    await sendOTPEmail({
      to: voter.email,
      name: voter.name,
      otp,
      electionName: election.name,
    })

    // Return just enough for the frontend — never return the OTP itself
    return ok(res, {
      message: "OTP sent to your registered email address",
      voter: {
        id: voter.id,
        name: voter.name,
        // Mask email: am***@nuesa.edu.ng
        email: voter.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        matric: voter.matric,
      },
      electionId: election.id,
      orgId: org.id,
    })
  } catch (err) {
    console.error("Voter login error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/:slug/voter/verify-otp ───────────────────────────────────────
// Step 2: voter submits OTP → gets a JWT to access the ballot
router.post("/:slug/voter/verify-otp", async (req, res) => {
  const { voterId, electionId, orgId, otp } = req.body

  if (!voterId || !otp) return fail(res, "Voter ID and OTP required")

  try {
    // Find the latest unused OTP for this voter
    const otpResult = await query(
      `SELECT id, code_hash, expires_at, used FROM otp_codes
       WHERE voter_id = $1 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [voterId]
    )

    if (otpResult.rows.length === 0) {
      return fail(res, "No active OTP found. Please request a new code.", 400)
    }

    const otpRecord = otpResult.rows[0]

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return fail(res, "OTP has expired. Please log in again to get a new code.", 400)
    }

    // Check the code
    const valid = await verifyOTP(otp.toString(), otpRecord.code_hash)
    if (!valid) {
      return fail(res, "Incorrect OTP. Please try again.", 400)
    }

    // Mark OTP as used (one-time use)
    await query(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [otpRecord.id])

    // Issue a ballot access token (15 min — enough to cast a vote)
    const accessToken = signAccessToken({
      voterId,
      electionId,
      orgId,
      role: "voter",
    })

    return ok(res, {
      message: "Verified. Proceed to ballot.",
      accessToken,
    })
  } catch (err) {
    console.error("OTP verify error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/:slug/observer/login ──────────────────────────────────────────
// Observer logs in with PIN
router.post("/:slug/observer/login", async (req, res) => {
  const { pin } = req.body
  const { slug } = req.params

  if (!pin) return fail(res, "PIN required")

  try {
    const orgResult = await query(
      `SELECT id, name, observer_pin FROM organizations WHERE slug = $1`, [slug]
    )
    if (orgResult.rows.length === 0) return fail(res, "Organization not found", 404)
    const org = orgResult.rows[0]

    const pinOk = await bcrypt.compare(pin.toString(), org.observer_pin)
    if (!pinOk) return fail(res, "Incorrect PIN", 401)

    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    )
    const electionId = electionResult.rows[0]?.id || null

    const accessToken = signAccessToken({
      orgId: org.id, electionId, role: "observer",
    })

    return ok(res, { accessToken, electionId })
  } catch (err) {
    console.error("Observer login error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/admin/forgot-password ────────────────────────────────────────
// Public — admin requests a password reset link sent to their org email
// Body: { email }
router.post("/admin/forgot-password", async (req, res) => {
  const { email } = req.body
  if (!email?.trim()) return fail(res, "Email is required")
  if (!isValidEmail(email)) return fail(res, "Please enter a valid email address")

  try {
    const orgResult = await query(
      `SELECT id, name, admin_email, is_active FROM organizations WHERE admin_email = $1`,
      [email.trim().toLowerCase()]
    )

    // Always return the same response to avoid leaking whether an email exists
    if (orgResult.rows.length === 0 || !orgResult.rows[0].is_active) {
      return ok(res, { message: "If that email is registered, a reset link has been sent." })
    }

    const org = orgResult.rows[0]

    // Generate a secure random token — store SHA-256 hash in DB, send raw token in URL
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await query(
      `UPDATE organizations
       SET password_reset_token = $1, password_reset_expires = $2
       WHERE id = $3`,
      [tokenHash, expires, org.id]
    )

    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${rawToken}`

    await sendPasswordResetEmail({
      to: org.admin_email,
      orgName: org.name,
      resetUrl,
    })

    return ok(res, { message: "If that email is registered, a reset link has been sent." })
  } catch (err) {
    console.error("Forgot password error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/admin/reset-password ─────────────────────────────────────────
// Public — admin submits the token from the email link + new password
// Body: { token, password, confirmPassword }
router.post("/admin/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body

  if (!token) return fail(res, "Reset token is required")
  if (!password) return fail(res, "Password is required")
  if (password !== confirmPassword) return fail(res, "Passwords do not match")
  if (password.length < 8) return fail(res, "Password must be at least 8 characters")

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const orgResult = await query(
      `SELECT id, name FROM organizations
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()`,
      [tokenHash]
    )

    if (orgResult.rows.length === 0) {
      return fail(res, "This reset link is invalid or has expired. Please request a new one.", 400)
    }

    const org = orgResult.rows[0]
    const newHash = await bcrypt.hash(password, 10)

    await query(
      `UPDATE organizations
       SET admin_password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE id = $2`,
      [newHash, org.id]
    )

    return ok(res, { message: "Password updated successfully. You can now log in." })
  } catch (err) {
    console.error("Reset password error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
// Exchanges a valid refresh token for a new access token.
// Body: { refreshToken }
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return fail(res, "Refresh token required", 401)

  try {
    const payload = verifyRefreshToken(refreshToken)

    // Only admin refresh is supported here
    if (payload.role !== "admin") {
      return fail(res, "Invalid refresh token", 401)
    }

    // Confirm the org still exists and is active
    const orgResult = await query(
      `SELECT id, name, slug, admin_email, is_active FROM organizations WHERE id = $1`,
      [payload.orgId]
    )
    if (orgResult.rows.length === 0) return fail(res, "Account not found", 404)
    const org = orgResult.rows[0]
    if (!org.is_active) {
      return fail(res, "This organization has been deactivated.", 403)
    }

    // Get the current election for the fresh token
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    )
    const electionId = electionResult.rows[0]?.id || null

    const accessToken = signAccessToken({
      orgId: org.id,
      electionId,
      email: org.admin_email,
      role: "admin",
    })

    return ok(res, {
      accessToken,
      org: { id: org.id, name: org.name, slug: org.slug },
      electionId,
    })
  } catch (err) {
    // Refresh token itself expired or invalid → user must log in again
    return fail(res, "Session expired — please log in again", 401)
  }
})

// ── Staff auth routes ─────────────────────────────────────────────────────────
//
// Provides:
//   POST /auth/staff/create   — admin creates a staff member for their org
//   POST /auth/staff/login    — staff member logs in, gets JWT with role:'staff'
//   POST /auth/staff/refresh  — refresh token flow for staff
//   GET  /auth/staff          — admin lists their org's staff members
//   DELETE /auth/staff/:id    — admin deactivates a staff member

// ─── POST /auth/staff/create ──────────────────────────────────────────────────
// Admin only — creates a staff (committee) member for their org.
// Body: { name, email, password }
router.post("/staff/create", requireAdmin, async (req, res) => {
  const { name, email, password } = req.body

  if (!name?.trim())    return fail(res, "Name is required")
  if (!email?.trim())   return fail(res, "Email is required")
  if (!isValidEmail(email)) return fail(res, "Please enter a valid email address")
  if (!password)        return fail(res, "Password is required")
  if (password.length < 8) return fail(res, "Password must be at least 8 characters")

  try {
    const existing = await query(
      `SELECT id FROM staff_members WHERE email = $1`,
      [email.trim().toLowerCase()]
    )
    if (existing.rows.length > 0) {
      return fail(res, "A staff account with this email already exists", 409)
    }

    const hash = await bcrypt.hash(password, 10)

    const result = await query(
      `INSERT INTO staff_members (org_id, name, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, is_active, created_at`,
      [req.orgId, name.trim(), email.trim().toLowerCase(), hash]
    )
    const staff = result.rows[0]

    await query(
      `INSERT INTO audit_logs (org_id, event_type, message, actor, metadata)
       VALUES ($1, 'admin', $2, $3, $4)`,
      [
        req.orgId,
        `Staff member created: ${staff.name}`,
        req.adminEmail,
        JSON.stringify({ staffId: staff.id, staffEmail: staff.email }),
      ]
    )

    return ok(res, { staff }, 201)
  } catch (err) {
    console.error("Staff create error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /auth/staff ──────────────────────────────────────────────────────────
// Admin only — list all staff members for their org
router.get("/staff", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, is_active, created_at
       FROM staff_members WHERE org_id = $1
       ORDER BY created_at DESC`,
      [req.orgId]
    )
    return ok(res, { staff: result.rows })
  } catch (err) {
    console.error("Staff list error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── DELETE /auth/staff/:id ───────────────────────────────────────────────────
// Admin only — deactivate a staff member (soft delete)
router.delete("/staff/:id", requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `UPDATE staff_members SET is_active = FALSE
       WHERE id = $1 AND org_id = $2
       RETURNING id, name, email`,
      [req.params.id, req.orgId]
    )
    if (result.rows.length === 0) {
      return fail(res, "Staff member not found", 404)
    }

    await query(
      `INSERT INTO audit_logs (org_id, event_type, message, actor, metadata)
       VALUES ($1, 'admin', $2, $3, $4)`,
      [
        req.orgId,
        `Staff member deactivated: ${result.rows[0].name}`,
        req.adminEmail,
        JSON.stringify({ staffId: result.rows[0].id }),
      ]
    )

    return ok(res, { message: "Staff member deactivated" })
  } catch (err) {
    console.error("Staff deactivate error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/staff/login ───────────────────────────────────────────────────
// Staff member logs in with email + password.
// Body: { email, password }
router.post("/staff/login", async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return fail(res, "Email and password required")
  if (!isValidEmail(email)) return fail(res, "Please enter a valid email address")

  try {
    const result = await query(
      `SELECT sm.id, sm.org_id, sm.name, sm.email, sm.password, sm.is_active,
              o.slug as org_slug, o.name as org_name
       FROM staff_members sm
       JOIN organizations o ON o.id = sm.org_id
       WHERE sm.email = $1`,
      [email.trim().toLowerCase()]
    )

    if (result.rows.length === 0) {
      return fail(res, "No account found with this email address", 404)
    }
    const staff = result.rows[0]

    if (!staff.is_active) {
      return fail(res, "Your staff account has been deactivated. Contact your admin.", 403)
    }

    const passwordOk = await bcrypt.compare(password, staff.password)
    if (!passwordOk) return fail(res, "Invalid credentials", 401)

    const accessToken = signAccessToken({
      staffId: staff.id,
      orgId: staff.org_id,
      name: staff.name,
      role: "staff",
    })
    const refreshToken = signRefreshToken({
      staffId: staff.id,
      orgId: staff.org_id,
      role: "staff",
    })

    return ok(res, {
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        orgId: staff.org_id,
        orgSlug: staff.org_slug,
        orgName: staff.org_name,
      },
    })
  } catch (err) {
    console.error("Staff login error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/staff/refresh ─────────────────────────────────────────────────
// Exchanges a valid staff refresh token for a new access token.
// Body: { refreshToken }
router.post("/staff/refresh", async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return fail(res, "Refresh token required", 401)

  try {
    const payload = verifyRefreshToken(refreshToken)

    if (payload.role !== "staff") {
      return fail(res, "Invalid refresh token", 401)
    }

    const result = await query(
      `SELECT id, org_id, name, email, is_active FROM staff_members WHERE id = $1`,
      [payload.staffId]
    )
    if (result.rows.length === 0) return fail(res, "Account not found", 404)
    const staff = result.rows[0]

    if (!staff.is_active) {
      return fail(res, "Your staff account has been deactivated.", 403)
    }

    const accessToken = signAccessToken({
      staffId: staff.id,
      orgId: staff.org_id,
      name: staff.name,
      role: "staff",
    })

    return ok(res, { accessToken })
  } catch (err) {
    return fail(res, "Session expired — please log in again", 401)
  }
})

// ─── POST /auth/guest-chat-token ──────────────────────────────────────────────
// Public — issues a short-lived token that lets an anonymous Open/Paid ballot
// voter use the live support chat (and ONLY the chat). No voter record exists,
// so voterId is null. Valid only while the election is ACTIVE.
// Body: { electionId, orgSlug }
router.post("/guest-chat-token", async (req, res) => {
  const { electionId, orgSlug } = req.body
  if (!electionId) return fail(res, "Election ID required")
  if (!orgSlug) return fail(res, "Organization slug required")

  try {
    const result = await query(
      `SELECT e.id, e.status, o.id AS org_id
       FROM elections e
       JOIN organizations o ON o.id = e.org_id
       WHERE e.id = $1 AND o.slug = $2`,
      [electionId, orgSlug.trim().toLowerCase()]
    )

    if (result.rows.length === 0) {
      return fail(res, "Election not found for this organization", 404)
    }
    const election = result.rows[0]

    if (election.status !== "ACTIVE") {
      return fail(res, "Live support is only available while voting is active", 403)
    }

    const accessToken = signAccessToken({
      voterId: null,
      electionId: election.id,
      orgId: election.org_id,
      role: "guest_voter",
    })

    return ok(res, {
      accessToken,
      electionId: election.id,
      orgId: election.org_id,
    })
  } catch (err) {
    console.error("Guest chat token error:", err)
    return fail(res, "Server error", 500)
  }
})

export default router
