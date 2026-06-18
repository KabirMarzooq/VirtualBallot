/**
 * Paystack API helper. All calls use the secret key server-side only.
 * Amounts are always in KOBO (₦1 = 100 kobo).
 */

const PAYSTACK_BASE = "https://api.paystack.co"

const getKey = () => {
    const key = process.env.PAYSTACK_SECRET_KEY
    if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set")
    return key
}

const paystackFetch = async (path, options = {}) => {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${getKey()}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    })
    const data = await res.json()
    if (!res.ok || data.status === false) {
        throw new Error(data.message || "Paystack request failed")
    }
    return data.data
}

/** List supported banks (so the org can pick from a dropdown) */
export const listBanks = () =>
    paystackFetch("/bank?currency=NGN")

/** Resolve an account number → confirms the account name before creating subaccount */
export const resolveAccount = (accountNumber, bankCode) =>
    paystackFetch(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`)

/**
 * Create a subaccount for an organization.
 * percentage_charge = 0 → the org receives 100% of the vote amount;
 * the voter covers the Paystack fee (Model A), so nothing is split away from the org.
 */
export const createSubaccount = ({ businessName, bankCode, accountNumber }) =>
    paystackFetch("/subaccount", {
        method: "POST",
        body: JSON.stringify({
            business_name: businessName,
            settlement_bank: bankCode,
            account_number: accountNumber,
            percentage_charge: 0,
        }),
    })

/** Initialize a transaction. amountKobo includes the Paystack fee (Model A). */
export const initializeTransaction = ({ email, amountKobo, reference, subaccountCode, metadata, callbackUrl }) =>
    paystackFetch("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
            email,
            amount: amountKobo,
            reference,
            subaccount: subaccountCode,
            bearer: "subaccount",       // fee bearer config; with percentage_charge 0 + fee added on top, org still nets full vote amount

            // Bank transfer listed first so it's the default the voter sees;
            // card and USSD still available if they prefer.
            channels: ["bank_transfer", "card", "ussd", "bank"],
            callback_url: callbackUrl,
            metadata,
        }),
    })

/** Verify a transaction by reference (server-side source of truth) */
export const verifyTransaction = (reference) =>
    paystackFetch(`/transaction/verify/${reference}`)

/**
 * Given the vote amount (kobo) the org should receive, compute the Paystack
 * fee (kobo) to add on top so the voter covers it (Model A).
 * Nigerian pricing: 1.5% + ₦100, ₦100 waived under ₦2,500, fee capped at ₦2,000.
 */
export const calculatePaystackFee = (amountKobo) => {
    const FLAT = 10000          // ₦100 in kobo
    const RATE = 0.015
    const CAP = 200000          // ₦2,000 in kobo
    const WAIVE_THRESHOLD = 250000 // ₦2,500 in kobo

    const applyFlat = amountKobo >= WAIVE_THRESHOLD
    // Solve so that (amount + fee) - paystackCut = amount, i.e. fee covers the cut.
    // Paystack cut on the total = RATE*total + (flat if total>=threshold)
    // Closed-form approximation that overshoots slightly to never under-collect:
    let fee = Math.ceil(amountKobo * RATE) + (applyFlat ? FLAT : 0)
    if (fee > CAP) fee = CAP
    return fee
}