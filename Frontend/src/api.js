/**
 * src/api.js
 *
 * Every call to the backend lives here.
 * Pages import from this file — they never write raw fetch() calls.
 *
 * Token storage: access token in memory (appContext), never localStorage.
 * The org slug comes from the ORG_SLUG constant below.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

// Change this to your org's slug. When multi-tenancy is live this will
// come from the subdomain / URL param automatically.
export const ORG_SLUG = import.meta.env.VITE_ORG_SLUG || "nuesa"

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

async function request(path, options = {}, token = null) {
    const headers = { "Content-Type": "application/json", ...options.headers }
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
    })

    const data = await res.json()

    if (!res.ok) {
        // Throw the server's message so callers can display it directly
        throw new Error(data.message || "Something went wrong")
    }

    return data
}

// ─── Election / Branding ─────────────────────────────────────────────────────

/** Load election config + branding for the login page */
export const fetchElection = () =>
    request(`/elections/${ORG_SLUG}`)

/** Load candidates for the ballot */
export const fetchCandidates = () =>
    request(`/elections/${ORG_SLUG}/candidates`)

/** Load published results */
export const fetchResults = () =>
    request(`/elections/${ORG_SLUG}/results`)

// ─── Auth ─────────────────────────────────────────────────────────────────────

// ─── Registration ─────────────────────────────────────────────────────────────

/** Step 1: check matric is on roster and not yet registered */
export const checkEligibility = (matric) =>
    request(`/voters/${ORG_SLUG}/check-eligibility`, {
        method: "POST",
        body: JSON.stringify({ matric }),
    })

/** Step 2: save voter's email to complete registration */
export const registerVoter = (voterId, email) =>
    request(`/voters/${ORG_SLUG}/register`, {
        method: "POST",
        body: JSON.stringify({ voterId, email }),
    })

/** Fetch public results (no auth needed) */
export const fetchPublicResults = () =>
    request(`/elections/${ORG_SLUG}/results`)

/**
 * Voter enters their matric number.
 * Backend checks the roster and sends an OTP to their email.
 * Returns: { voter: { id, name, email (masked), matric }, electionId, orgId }
 */
export const voterLogin = (matric) =>
    request(`/auth/${ORG_SLUG}/voter/login`, {
        method: "POST",
        body: JSON.stringify({ matric }),
    })

/**
 * Voter submits the OTP they received.
 * Returns: { accessToken }
 */
export const verifyOtp = (voterId, electionId, orgId, otp) =>
    request(`/auth/${ORG_SLUG}/voter/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ voterId, electionId, orgId, otp }),
    })

/**
 * Admin logs in with email + password.
 * Returns: { accessToken, org, electionId }
 */
export const adminLogin = (email, password) =>
    request(`/auth/${ORG_SLUG}/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
    })

/**
 * Observer logs in with PIN.
 * Returns: { accessToken, electionId }
 */
export const observerLogin = (pin) =>
    request(`/auth/${ORG_SLUG}/observer/login`, {
        method: "POST",
        body: JSON.stringify({ pin }),
    })

// ─── Voting ───────────────────────────────────────────────────────────────────

/**
 * Submit a complete ballot.
 * selections: [ { candidateId, position }, ... ]
 * Returns: { receiptId }
 */
export const submitBallot = (selections, token) =>
    request(`/vote`, {
        method: "POST",
        body: JSON.stringify({ selections }),
    }, token)

/**
 * Verify a receipt ID exists in the ledger.
 * Returns: { receiptId, verified, castAt, positions }
 */
export const verifyReceipt = (receiptId) =>
    request(`/vote/verify/${receiptId}`)

// ─── Admin ────────────────────────────────────────────────────────────────────

/** Get full admin dashboard data */
export const fetchAdminOverview = (token) =>
    request(`/elections/${ORG_SLUG}/admin/overview`, {}, token)

/** Update election config (status, isPublished, registryLocked, etc.) */
export const updateElectionConfig = (patch, token) =>
    request(`/elections/${ORG_SLUG}/config`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }, token)

/** Upload voter roster: voters = [{ matric, name, email? }] */
export const uploadRoster = (voters, token) =>
    request(`/voters/${ORG_SLUG}/roster`, {
        method: "POST",
        body: JSON.stringify({ voters }),
    }, token)

/** Get full voter list */
export const fetchVoters = (token) =>
    request(`/voters/${ORG_SLUG}`, {}, token)

/** Remove a voter from the roster */
export const removeVoter = (voterId, token) =>
    request(`/voters/${ORG_SLUG}/${voterId}`, { method: "DELETE" }, token)

/** Add a candidate */
export const addCandidate = (candidate, token) =>
    request(`/candidates/${ORG_SLUG}`, {
        method: "POST",
        body: JSON.stringify(candidate),
    }, token)

/** Update candidate manifesto / details */
export const updateCandidate = (candidateId, patch, token) =>
    request(`/candidates/${ORG_SLUG}/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }, token)

/** Remove a candidate */
export const removeCandidate = (candidateId, token) =>
    request(`/candidates/${ORG_SLUG}/${candidateId}`, { method: "DELETE" }, token)