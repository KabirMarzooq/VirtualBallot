import express from "express"
import bcrypt from "bcryptjs"
import { query } from "../db/pool.js"
import crypto from "crypto"
import {
  generateOTP, hashOTP, verifyOTP,
  signAccessToken, signRefreshToken,
  sendOTPEmail, sendPasswordResetEmail, generateReceiptId,
  ok, fail,
} from "../utils/index.js"
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

    return ok(res, {
      accessToken,
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

export default router
