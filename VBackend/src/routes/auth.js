import express from "express"
import bcrypt from "bcryptjs"
import { query } from "../db/pool.js"
import {
  generateOTP, hashOTP, verifyOTP,
  signAccessToken, signRefreshToken,
  sendOTPEmail, generateReceiptId,
  ok, fail,
} from "../utils/index.js"
import dotenv from "dotenv"
dotenv.config()

const router = express.Router()

// ─── POST /auth/:slug/voter/login ─────────────────────────────────────────────
// Step 1: voter enters matric number → system sends OTP to their email
router.post("/:slug/voter/login", async (req, res) => {
  const { matric } = req.body
  const { slug }   = req.params

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
    const otp     = generateOTP()
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
      to:           voter.email,
      name:         voter.name,
      otp,
      electionName: election.name,
    })

    // Return just enough for the frontend — never return the OTP itself
    return ok(res, {
      message: "OTP sent to your registered email address",
      voter: {
        id:     voter.id,
        name:   voter.name,
        // Mask email: am***@nuesa.edu.ng
        email:  voter.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        matric: voter.matric,
      },
      electionId: election.id,
      orgId:      org.id,
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
      message:     "Verified. Proceed to ballot.",
      accessToken,
    })
  } catch (err) {
    console.error("OTP verify error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/:slug/admin/login ─────────────────────────────────────────────
// Admin logs in with email + password
router.post("/:slug/admin/login", async (req, res) => {
  const { email, password } = req.body
  const { slug }            = req.params

  if (!email || !password) return fail(res, "Email and password required")

  try {
    const orgResult = await query(
      `SELECT id, name, admin_email, admin_password FROM organizations WHERE slug = $1`,
      [slug]
    )
    if (orgResult.rows.length === 0) return fail(res, "Organization not found", 404)
    const org = orgResult.rows[0]

    if (org.admin_email !== email.trim().toLowerCase()) {
      return fail(res, "Invalid credentials", 401)
    }

    const passwordOk = await bcrypt.compare(password, org.admin_password)
    if (!passwordOk) return fail(res, "Invalid credentials", 401)

    // Get the most recent election for this org
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    )
    const electionId = electionResult.rows[0]?.id || null

    const accessToken = signAccessToken({
      orgId:   org.id,
      electionId,
      email:   org.admin_email,
      role:    "admin",
    })

    return ok(res, {
      accessToken,
      org: { id: org.id, name: org.name, slug },
      electionId,
    })
  } catch (err) {
    console.error("Admin login error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /auth/:slug/observer/login ──────────────────────────────────────────
// Observer logs in with PIN
router.post("/:slug/observer/login", async (req, res) => {
  const { pin }  = req.body
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

export default router
