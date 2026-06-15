import express from "express"
import { io } from "../server.js"
import { getClient, query } from "../db/pool.js"
import { resolveOrg } from "../middleware/auth.js"
import {
    generateReceiptId, generateOTP, hashOTP, verifyOTP,
    sendOTPEmail, ok, fail,
} from "../utils/index.js"

const router = express.Router()

// Helper — get the client's real IP (works behind Railway/Vercel proxies)
const getIp = (req) =>
    (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "")
        .trim()

// ─── GET /open/:slug — public election config + candidates ───────────────────
router.get("/:slug", resolveOrg, async (req, res) => {
    try {
        const electionResult = await query(
            `SELECT id, name, status, is_published, show_countdown, ends_at,
              voting_mode, fraud_tier
       FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.orgId]
        )
        if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
        const e = electionResult.rows[0]

        if (e.voting_mode !== "OPEN") {
            return fail(res, "This election is not open for public voting", 403)
        }

        const candidatesResult = await query(
            `SELECT id, name, position, manifesto, color, image_url
       FROM candidates WHERE election_id = $1 ORDER BY position, name`,
            [e.id]
        )

        const orgResult = await query(
            `SELECT name, logo_url FROM organizations WHERE id = $1`,
            [req.orgId]
        )

        return ok(res, {
            election: {
                id: e.id,
                name: e.name,
                status: e.status,
                isPublished: e.is_published,
                showCountdown: e.show_countdown,
                endsAt: e.ends_at,
                votingMode: e.voting_mode,
                fraudTier: e.fraud_tier,
            },
            branding: {
                institutionName: orgResult.rows[0]?.name || "",
                electionName: e.name,
                logoUrl: orgResult.rows[0]?.logo_url || "",
            },
            candidates: candidatesResult.rows,
        })
    } catch (err) {
        console.error("Open election fetch error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── POST /open/:slug/request-otp — EMAIL tier: send a code ──────────────────
router.post("/:slug/request-otp", resolveOrg, async (req, res) => {
    const { email } = req.body
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail(res, "Please enter a valid email address")
    }

    try {
        const electionResult = await query(
            `SELECT id, name, status, fraud_tier FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.orgId]
        )
        if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
        const e = electionResult.rows[0]

        if (e.status !== "ACTIVE") return fail(res, "Voting is not currently open", 403)
        if (e.fraud_tier !== "EMAIL") return fail(res, "This election does not require email verification", 400)

        // Has this email already voted in this election?
        const existing = await query(
            `SELECT id FROM open_votes WHERE election_id = $1 AND email = $2 LIMIT 1`,
            [e.id, email.trim().toLowerCase()]
        )
        if (existing.rows.length > 0) {
            return fail(res, "This email has already voted in this election", 409)
        }

        const otp = generateOTP()
        const otpHash = await hashOTP(otp)
        const expiresMin = Number(process.env.OTP_EXPIRES_MINUTES || 5)

        // Store OTP keyed to the email + election (reuse otp_codes table)
        await query(
            `INSERT INTO open_otp_codes (election_id, email, code_hash, expires_at)
             VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
             ON CONFLICT (election_id, email)
             DO UPDATE SET code_hash = $3, expires_at = NOW() + ($4 || ' minutes')::interval`,
            [e.id, email.trim().toLowerCase(), otpHash, expiresMin]
        )

        await sendOTPEmail({
            to: email.trim().toLowerCase(),
            name: "Voter",
            otp,
            electionName: e.name,
        })

        return ok(res, { message: "Verification code sent to your email" })
    } catch (err) {
        console.error("Open request-otp error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── POST /open/:slug/vote — cast a public ballot ────────────────────────────
// Body (DEVICE tier): { selections, fingerprint }
// Body (EMAIL tier):  { selections, email, otp }
router.post("/:slug/vote", resolveOrg, async (req, res) => {
    const { selections, fingerprint, email, otp } = req.body

    if (!selections || !Array.isArray(selections) || selections.length === 0) {
        return fail(res, "Ballot selections required")
    }

    const client = await getClient()
    try {
        await client.query("BEGIN")

        const electionResult = await client.query(
            `SELECT id, status, voting_mode, fraud_tier FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.orgId]
        )
        if (electionResult.rows.length === 0) {
            await client.query("ROLLBACK")
            return fail(res, "Election not found", 404)
        }
        const e = electionResult.rows[0]

        if (e.voting_mode !== "OPEN") {
            await client.query("ROLLBACK")
            return fail(res, "This election is not open for public voting", 403)
        }
        if (e.status !== "ACTIVE") {
            await client.query("ROLLBACK")
            return fail(res, "Voting is not currently open", 403)
        }

        let voterEmail = null
        let voterFingerprint = null
        const ip = getIp(req)

        // ── Fraud check by tier ──────────────────────────────────────────────────
        if (e.fraud_tier === "EMAIL") {
            if (!email || !otp) {
                await client.query("ROLLBACK")
                return fail(res, "Email and verification code required")
            }
            voterEmail = email.trim().toLowerCase()

            const otpResult = await client.query(
                `SELECT code_hash, expires_at FROM open_otp_codes
                 WHERE election_id = $1 AND email = $2`,
                [e.id, voterEmail]
            )
            if (otpResult.rows.length === 0) {
                await client.query("ROLLBACK")
                return fail(res, "No verification code found — please request one", 400)
            }
            const { code_hash, expires_at } = otpResult.rows[0]
            if (new Date(expires_at) < new Date()) {
                await client.query("ROLLBACK")
                return fail(res, "Verification code expired — please request a new one", 400)
            }
            const valid = await verifyOTP(otp.toString(), code_hash)
            if (!valid) {
                await client.query("ROLLBACK")
                return fail(res, "Invalid verification code", 401)
            }
        } else {
            // DEVICE tier
            if (!fingerprint) {
                await client.query("ROLLBACK")
                return fail(res, "Device verification failed — please refresh and try again")
            }
            voterFingerprint = fingerprint
        }

        const receiptId = generateReceiptId()
        const candidateIds = selections.map((s) => s.candidateId)

        // ── Insert one open_votes row per selection ──────────────────────────────
        for (const sel of selections) {
            await client.query(
                `INSERT INTO open_votes
           (election_id, org_id, candidate_id, position, voter_ip, fingerprint, email, receipt_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [e.id, req.orgId, sel.candidateId, sel.position, ip, voterFingerprint, voterEmail, receiptId]
            )
        }

        // Increment candidate counts
        await client.query(
            `UPDATE candidates SET vote_count = vote_count + 1
       WHERE election_id = $1 AND id = ANY($2::uuid[])`,
            [e.id, candidateIds]
        )

        // Clear the used OTP
        if (voterEmail) {
            await client.query(
                `DELETE FROM open_otp_codes WHERE election_id = $1 AND email = $2`,
                [e.id, voterEmail]
            )
        }

        await client.query(
            `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'vote', $3, 'public')`,
            [req.orgId, e.id, `Public vote cast (receipt: ${receiptId})`]
        )

        await client.query("COMMIT")

        // Broadcast live update
        const updatedCandidates = await query(
            `SELECT id, name, position, vote_count, color, image_url
       FROM candidates WHERE election_id = $1
       ORDER BY position, vote_count DESC`,
            [e.id]
        )
        io.to(`election:${e.id}`).emit("vote:update", {
            electionId: e.id,
            receiptId,
            candidates: updatedCandidates.rows,
            timestamp: new Date().toISOString(),
        })

        return ok(res, { message: "Vote cast successfully", receiptId })
    } catch (err) {
        await client.query("ROLLBACK")
        if (err.code === "23505") {
            return fail(res, "You have already voted in this election", 409)
        }
        console.error("Open vote error:", err)
        return fail(res, "Server error", 500)
    } finally {
        client.release()
    }
})

// ─── GET /open/:slug/results — public results (only if published) ────────────
router.get("/:slug/results", resolveOrg, async (req, res) => {
    try {
        const electionResult = await query(
            `SELECT id, name, status, is_published, voting_mode FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.orgId]
        )
        if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
        const e = electionResult.rows[0]

        if (e.voting_mode !== "OPEN") return fail(res, "Not an open election", 403)
        if (!e.is_published) {
            return ok(res, { published: false, candidates: [], stats: { totalVotes: 0 } })
        }

        const candidatesResult = await query(
            `SELECT id, name, position, vote_count, color, image_url
       FROM candidates WHERE election_id = $1
       ORDER BY position, vote_count DESC`,
            [e.id]
        )

        const totalResult = await query(
            `SELECT COUNT(*) AS total FROM open_votes WHERE election_id = $1`,
            [e.id]
        )

        return ok(res, {
            published: true,
            candidates: candidatesResult.rows,
            stats: { totalVotes: Number(totalResult.rows[0].total) },
        })
    } catch (err) {
        console.error("Open results error:", err)
        return fail(res, "Server error", 500)
    }
})

export default router