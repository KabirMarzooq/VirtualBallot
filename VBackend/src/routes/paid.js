import express from "express"
import crypto from "crypto"
import { io } from "../server.js"
import { getClient, query } from "../db/pool.js"
import { requireAdmin, resolveOrg } from "../middleware/auth.js"
import {
    initializeTransaction, verifyTransaction, calculatePaystackFee,
} from "../utils/paystack.js"
import { sendReceiptEmail, isValidNonDisposableEmail, generateReceiptId, ok, fail } from "../utils/index.js"
import { appendToChain } from "../utils/voteChain.js"

const router = express.Router()

// ─── POST /paid/:slug/initialize — start a paid-vote transaction ─────────────
// Body: { candidateId, position, email, quantity }  (quantity = number of votes OR bundle index)
router.post("/:slug/initialize", resolveOrg, async (req, res) => {
    const { candidateId, position, email, votes, bundleIndex } = req.body

    if (!candidateId || !position || !email) {
        return fail(res, "Candidate, position, and email are required")
    }
    if (!isValidNonDisposableEmail(email)) {
        return fail(res, "Please enter a valid email address (temporary email services aren't allowed for paid voting)")
    }

    try {
        // Load election + verify it's a live PAID election
        const electionResult = await query(
            `SELECT id, status, vote_type, pricing_model, price_per_vote, vote_bundles
       FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.orgId]
        )
        if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
        const e = electionResult.rows[0]

        if (e.vote_type !== "PAID") return fail(res, "This election does not use paid voting", 400)
        if (e.status !== "ACTIVE") return fail(res, "Voting is not currently open", 403)

        // Org must have a subaccount configured
        const orgResult = await query(
            `SELECT is_active, paystack_subaccount_code FROM organizations WHERE id = $1`,
            [req.orgId]
        )
        const org = orgResult.rows[0]
        if (!org.is_active) return fail(res, "Organization is not active", 403)
        if (!org.paystack_subaccount_code) {
            return fail(res, "This organization hasn't set up a payout account yet", 400)
        }

        // Confirm candidate belongs to this election
        const candResult = await query(
            `SELECT id, name FROM candidates WHERE id = $1 AND election_id = $2`,
            [candidateId, e.id]
        )
        if (candResult.rows.length === 0) return fail(res, "Candidate not found", 404)

        // ── Determine vote count + amount (BACKEND decides — never trust frontend price) ──
        let voteCount, amountKobo
        if (e.pricing_model === "BUNDLE") {
            const bundles = e.vote_bundles || []
            const idx = Number(bundleIndex)
            if (isNaN(idx) || idx < 0 || idx >= bundles.length) {
                return fail(res, "Invalid bundle selected")
            }
            voteCount = Number(bundles[idx].votes)
            amountKobo = Number(bundles[idx].amount)   // stored in kobo
        } else {
            // FIXED
            voteCount = Number(votes)
            if (!Number.isInteger(voteCount) || voteCount < 1) {
                return fail(res, "Enter a valid number of votes")
            }
            amountKobo = voteCount * Number(e.price_per_vote)  // price_per_vote in kobo
        }

        if (amountKobo < 100) return fail(res, "Amount too small")  // Paystack min ₦1

        const feeKobo = calculatePaystackFee(amountKobo)
        const totalKobo = amountKobo + feeKobo   // Model A: voter pays vote amount + fee
        const reference = "VBPAY-" + crypto.randomBytes(8).toString("hex").toUpperCase()

        // Record a PENDING transaction BEFORE redirecting to Paystack
        await query(
            `INSERT INTO paid_transactions
         (election_id, org_id, candidate_id, position, voter_email,
          reference, amount_kobo, fee_kobo, votes_purchased, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING')`,
            [e.id, req.orgId, candidateId, position, email.trim().toLowerCase(),
                reference, amountKobo, feeKobo, voteCount]
        )

        await query(
            `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
             VALUES ($1, $2, 'system', $3, 'paid')`,
            [req.orgId, e.id, `Payment initiated — ${voteCount} vote(s), ref ${reference}`]
        )

        // Initialize with Paystack — subaccount comes from the DB, never the frontend
        const init = await initializeTransaction({
            email: email.trim().toLowerCase(),
            amountKobo: totalKobo,
            reference,
            subaccountCode: org.paystack_subaccount_code,
            callbackUrl: `${process.env.FRONTEND_URL}/paid/${req.params.slug}`,
            metadata: {
                electionId: e.id, candidateId, position, votes: voteCount, orgId: req.orgId,
            },
        })

        return ok(res, {
            authorizationUrl: init.authorization_url,
            reference,
            votes: voteCount,
            amountNaira: amountKobo / 100,
            feeNaira: feeKobo / 100,
            totalNaira: totalKobo / 100,
        })
    } catch (err) {
        console.error("Paid initialize error:", err)
        return fail(res, err.message || "Could not start payment", 500)
    }
})

// ─── POST /paid/webhook — Paystack server-to-server confirmation ──────────────
// This is the ONLY place votes get credited. Signature-verified.
// NOTE: mounted with express.raw in server.js so we can verify the signature.
router.post("/webhook", async (req, res) => {
    try {
        const signature = req.headers["x-paystack-signature"]
        const secret = process.env.PAYSTACK_SECRET_KEY

        // req.body is a Buffer here (raw). Verify HMAC.
        const hash = crypto.createHmac("sha512", secret).update(req.body).digest("hex")
        if (hash !== signature) {
            console.warn("Paystack webhook signature mismatch — rejected")
            return res.sendStatus(401)
        }

        const event = JSON.parse(req.body.toString())

        // Acknowledge immediately; only act on successful charges
        if (event.event !== "charge.success") {
            return res.sendStatus(200)
        }

        const reference = event.data.reference
        await creditVotesForReference(reference, event.data)

        return res.sendStatus(200)
    } catch (err) {
        console.error("Webhook error:", err)
        return res.sendStatus(200) // Always 200 so Paystack doesn't retry-storm; we log failures
    }
})

// ─── GET /paid/:slug/verify/:reference — frontend fallback verify ─────────────
// After redirect back, the frontend calls this to confirm + show the receipt.
// It re-verifies server-side and credits if the webhook hasn't already.
router.get("/:slug/verify/:reference", resolveOrg, async (req, res) => {
    const { reference } = req.params
    try {
        const data = await verifyTransaction(reference)
        if (data.status === "success") {
            await creditVotesForReference(reference, data)
            const txResult = await query(
                `SELECT votes_purchased, status FROM paid_transactions WHERE reference = $1`,
                [reference]
            )
            // Pull the chain hashes created for this payment so the voter can verify
            const chainResult = await query(
                `SELECT chain_hash FROM vote_chain WHERE receipt_id = $1 ORDER BY seq ASC`,
                [reference]
            )
            const chainHashes = chainResult.rows.map((r) => r.chain_hash)
            return ok(res, {
                success: true,
                votes: txResult.rows[0]?.votes_purchased || 0,
                reference,
                verificationHash: chainHashes[0] || null,
                chainHashes,
            })
        }

    } catch (err) {
        console.error("Verify error:", err)
        return fail(res, "Could not verify payment", 500)
    }
})

/**
 * Credit votes for a reference — IDEMPOTENT.
 * Only acts if the transaction is still PENDING, so the webhook and the
 * frontend-verify can both call this safely without double-counting.
 */
async function creditVotesForReference(reference, paystackData) {
    // Atomically flip PENDING → SUCCESS; if 0 rows updated, it was already processed
    const tx = await query(
        `UPDATE paid_transactions
     SET status = 'SUCCESS', paystack_data = $2, updated_at = NOW()
     WHERE reference = $1 AND status = 'PENDING'
     RETURNING election_id, org_id, candidate_id, position, voter_email, votes_purchased, amount_kobo`,
        [reference, paystackData]
    )

    if (tx.rows.length === 0) return  // already processed or not found — idempotent no-op
    const t = tx.rows[0]

    // Credit the votes + append to the vote chain, atomically.
    const client = await getClient()
    try {
        await client.query("BEGIN")

        await client.query(
            `UPDATE candidates SET vote_count = vote_count + $2 WHERE id = $1`,
            [t.candidate_id, t.votes_purchased]
        )

        // A paid purchase can buy multiple votes — append one chain entry per vote
        // so the chain's length matches the true vote tally.
        for (let i = 0; i < t.votes_purchased; i++) {
            await appendToChain(client, {
                electionId: t.election_id,
                voteType: "PAID",
                candidateId: t.candidate_id,
                position: t.position,
                receiptId: reference,
            })
        }

        await client.query(
            `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'vote', $3, 'paid')`,
            [t.org_id, t.election_id,
            `Paid vote confirmed — ${t.votes_purchased} vote(s), ref ${reference}`]
        )

        await client.query("COMMIT")
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Paid chain append failed:", err)
        throw err
    } finally {
        client.release()
    }

    // Broadcast live tally update
    const updated = await query(
        `SELECT id, name, position, vote_count, color, image_url
     FROM candidates WHERE election_id = $1 ORDER BY position, vote_count DESC`,
        [t.election_id]
    )
    io.to(`election:${t.election_id}`).emit("vote:update", {
        electionId: t.election_id,
        receiptId: reference,
        candidates: updated.rows,
        timestamp: new Date().toISOString(),
    })

    // Email receipt (fire and forget)
    try {
        const candResult = await query(`SELECT name FROM candidates WHERE id = $1`, [t.candidate_id])
        const elecResult = await query(`SELECT name FROM elections WHERE id = $1`, [t.election_id])
        const orgResult = await query(`SELECT name, slug FROM organizations WHERE id = $1`, [t.org_id])
        // Pull the first chain hash for this payment so the voter can verify
        const hashResult = await query(
            `SELECT chain_hash FROM vote_chain WHERE receipt_id = $1 ORDER BY seq ASC LIMIT 1`,
            [reference]
        )
        const vHash = hashResult.rows[0]?.chain_hash || null
        const slug = orgResult.rows[0]?.slug
        await sendReceiptEmail({
            to: t.voter_email,
            name: "Voter",
            receiptId: reference,
            electionName: elecResult.rows[0]?.name || "Election",
            orgName: orgResult.rows[0]?.name || "Organization",
            castAt: new Date(),
            verificationHash: vHash,
            verifyUrl: vHash && slug
                ? `${process.env.FRONTEND_URL}/verify/${slug}?hash=${encodeURIComponent(vHash)}`
                : null,
        })
    } catch (e) {
        console.error("Paid receipt email failed:", e.message)
    }
}

// ─── GET /paid/:slug/invoices — admin: all transactions for this org ─────────
router.get("/:slug/invoices", resolveOrg, requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT pt.id, pt.reference, pt.voter_email, pt.amount_kobo, pt.fee_kobo,
                pt.votes_purchased, pt.status, pt.created_at, pt.position,
                c.name AS candidate_name, e.name AS election_name
         FROM paid_transactions pt
         JOIN candidates c ON c.id = pt.candidate_id
         JOIN elections  e ON e.id = pt.election_id
         WHERE pt.org_id = $1
        AND pt.election_id = (SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1)
      ORDER BY pt.created_at DESC`,
            [req.orgId]
        )

        const totals = await query(
            `SELECT
           COUNT(*) FILTER (WHERE status='SUCCESS') AS paid_count,
           COALESCE(SUM(amount_kobo) FILTER (WHERE status='SUCCESS'),0) AS revenue_kobo,
           COALESCE(SUM(votes_purchased) FILTER (WHERE status='SUCCESS'),0) AS votes_sold
         FROM paid_transactions WHERE org_id = $1 AND election_id = (SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1)`,
            [req.orgId]
        )

        return ok(res, {
            invoices: result.rows,
            summary: {
                paidCount: Number(totals.rows[0].paid_count),
                revenueKobo: Number(totals.rows[0].revenue_kobo),
                votesSold: Number(totals.rows[0].votes_sold),
            },
        })
    } catch (err) {
        console.error("Invoices error:", err)
        return fail(res, "Server error", 500)
    }
})

export default router