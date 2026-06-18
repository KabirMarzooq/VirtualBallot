import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin, resolveOrg } from "../middleware/auth.js"
import { listBanks, resolveAccount, createSubaccount } from "../utils/paystack.js"
import { ok, fail } from "../utils/index.js"

const router = express.Router()

// ─── GET /payments/:slug/banks — list NGN banks for the dropdown ─────────────
router.get("/:slug/banks", resolveOrg, requireAdmin, async (req, res) => {
    try {
        const banks = await listBanks()
        // Trim to what the frontend needs
        const trimmed = banks.map((b) => ({ name: b.name, code: b.code }))
        return ok(res, { banks: trimmed })
    } catch (err) {
        console.error("List banks error:", err)
        return fail(res, "Could not load banks", 500)
    }
})

// ─── POST /payments/:slug/resolve-account — confirm account name ─────────────
router.post("/:slug/resolve-account", resolveOrg, requireAdmin, async (req, res) => {
    const { accountNumber, bankCode } = req.body
    if (!accountNumber || !bankCode) return fail(res, "Account number and bank required")

    try {
        const data = await resolveAccount(accountNumber, bankCode)
        return ok(res, { accountName: data.account_name })
    } catch (err) {
        return fail(res, err.message || "Could not resolve account", 400)
    }
})

// ─── POST /payments/:slug/subaccount — create + store the org subaccount ─────
router.post("/:slug/subaccount", resolveOrg, requireAdmin, async (req, res) => {
    const { businessName, bankCode, bankName, accountNumber } = req.body
    if (!businessName || !bankCode || !accountNumber) {
        return fail(res, "Business name, bank, and account number are required")
    }

    try {
        // Confirm org is active before creating anything
        const orgResult = await query(
            `SELECT is_active, paystack_subaccount_code FROM organizations WHERE id = $1`,
            [req.orgId]
        )
        if (orgResult.rows.length === 0) return fail(res, "Organization not found", 404)
        if (!orgResult.rows[0].is_active) return fail(res, "Organization is deactivated", 403)

        // Create the Paystack subaccount
        const sub = await createSubaccount({ businessName, bankCode, accountNumber })

        // Store the code + settlement details on the org record
        await query(
            `UPDATE organizations
       SET paystack_subaccount_code  = $1,
           settlement_bank_name      = $2,
           settlement_account_number = $3,
           settlement_business_name  = $4
       WHERE id = $5`,
            [sub.subaccount_code, bankName || null, accountNumber, businessName, req.orgId]
        )

        await query(
            `INSERT INTO audit_logs (org_id, event_type, message, actor)
       VALUES ($1, 'admin', 'Payment account configured for paid voting', $2)`,
            [req.orgId, req.adminEmail]
        )

        return ok(res, {
            message: "Payment account configured",
            subaccountCode: sub.subaccount_code,
            businessName,
        })
    } catch (err) {
        console.error("Create subaccount error:", err)
        return fail(res, err.message || "Could not set up payment account", 500)
    }
})

// ─── GET /payments/:slug/account — fetch current settlement info ─────────────
router.get("/:slug/account", resolveOrg, requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT paystack_subaccount_code, settlement_bank_name,
              settlement_account_number, settlement_business_name
       FROM organizations WHERE id = $1`,
            [req.orgId]
        )
        const o = result.rows[0]
        return ok(res, {
            configured: !!o.paystack_subaccount_code,
            bankName: o.settlement_bank_name,
            accountNumber: o.settlement_account_number,
            businessName: o.settlement_business_name,
        })
    } catch (err) {
        return fail(res, "Server error", 500)
    }
})

export default router