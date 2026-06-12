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

// Fallback slug used when no slug is available from URL or context.
// For voter pages the real slug always comes from the URL (/vote/:slug).
// For admin pages it comes from AppContext (set after login).
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
export const fetchElection = (slug = ORG_SLUG) =>
    request(`/elections/${slug}`)

/** Load candidates for the ballot */
export const fetchCandidates = (slug = ORG_SLUG) =>
    request(`/elections/${slug}/candidates`)

/** Load published results */
export const fetchPublicResults = (slug = ORG_SLUG) =>
    request(`/elections/${slug}/results`)

// ─── Registration ─────────────────────────────────────────────────────────────

/** Step 1: check matric is on roster and not yet registered */
export const checkEligibility = (matric, slug = ORG_SLUG) =>
    request(`/voters/${slug}/check-eligibility`, {
        method: "POST",
        body: JSON.stringify({ matric }),
    })

/** Step 2: save voter's email to complete registration */
export const registerVoter = (voterId, email, slug = ORG_SLUG) =>
    request(`/voters/${slug}/register`, {
        method: "POST",
        body: JSON.stringify({ voterId, email }),
    })

/**
 * Voter enters their matric number.
 * Backend checks the roster and sends an OTP to their email.
 * Returns: { voter: { id, name, email (masked), matric }, electionId, orgId }
 */
export const voterLogin = (matric, slug = ORG_SLUG) =>
    request(`/auth/${slug}/voter/login`, {
        method: "POST",
        body: JSON.stringify({ matric }),
    })

/**
 * Voter submits the OTP they received.
 * Returns: { accessToken }
 */
export const verifyOtp = (voterId, electionId, orgId, otp, slug = ORG_SLUG) =>
    request(`/auth/${slug}/voter/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ voterId, electionId, orgId, otp }),
    })

/**
 * Admin logs in with email + password.
 * Returns: { accessToken, org, electionId }
 */
export const adminLogin = (email, password) =>
    request(`/auth/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
    })

/** Request a password reset email for the given admin email */
export const adminForgotPassword = (email) =>
    request(`/auth/admin/forgot-password`, {
        method: "POST",
        body: JSON.stringify({ email }),
    })

/** Submit a reset token + new password to complete the reset */
export const adminResetPassword = (token, password, confirmPassword) =>
    request(`/auth/admin/reset-password`, {
        method: "POST",
        body: JSON.stringify({ token, password, confirmPassword }),
    })

/**
 * Observer logs in with PIN.
 * Returns: { accessToken, electionId }
 */
export const observerLogin = (pin, slug = ORG_SLUG) =>
    request(`/auth/${slug}/observer/login`, {
        method: "POST",
        body: JSON.stringify({ pin }),
    })

// ─── Organization Registration ────────────────────────────────────────────────

/** Register a new organization (creates admin account + blank election) */
export const registerOrg = ({ orgName, slug, adminEmail, password, confirmPassword }) =>
    request(`/auth/org/register`, {
        method: "POST",
        body: JSON.stringify({ orgName, slug, adminEmail, password, confirmPassword }),
    })

/** Check if a slug is available before the user finishes the form */
export const checkSlugAvailable = async (slug) => {
    try {
        // We try fetching the org — if it 404s, the slug is free
        await request(`/elections/${slug}`)
        return false // org exists → slug taken
    } catch (err) {
        if (err.message?.includes("not found")) return true  // slug free
        return false // any other error → treat as taken to be safe
    }
}

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

// ─── Election History ─────────────────────────────────────────────────────────

/** Fetch all ended elections for this org */
export const fetchElectionHistory = (token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/history`, {}, token)

/** Create a new blank election (archives the current one implicitly) */
export const createNewElection = (name, token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/new`, {
        method: "POST",
        body: JSON.stringify({ name }),
    }, token)

/** Upload roster with replace option */
export const uploadRoster = (voters, token, slug = ORG_SLUG, replaceExisting = false) =>
    request(`/voters/${slug}/roster`, {
        method: "POST",
        body: JSON.stringify({ voters, replaceExisting }),
    }, token)

// ─── Admin ────────────────────────────────────────────────────────────────────

/** Get full admin dashboard data */
export const fetchAdminOverview = (token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/admin/overview`, {}, token)

/** Observer read-only overview */
export const fetchObserverOverview = (token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/observer/overview`, {}, token)

/** Update organization branding (election name, institution name, logo URL) */
export const updateBranding = (patch, token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/branding`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }, token)

/** Update observer PIN */
export const updateObserverPin = (pin, token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/observer-pin`, {
        method: "PATCH",
        body: JSON.stringify({ pin }),
    }, token)

/** Update election config (status, isPublished, registryLocked, etc.) */
export const updateElectionConfig = (patch, token, slug = ORG_SLUG) =>
    request(`/elections/${slug}/config`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }, token)

/** Get full voter list */
export const fetchVoters = (token, slug = ORG_SLUG) =>
    request(`/voters/${slug}`, {}, token)

/** Remove a voter from the roster */
export const removeVoter = (voterId, token, slug = ORG_SLUG) =>
    request(`/voters/${slug}/${voterId}`, { method: "DELETE" }, token)

/** Add a candidate */
export const addCandidate = (candidate, token, slug = ORG_SLUG) =>
    request(`/candidates/${slug}`, {
        method: "POST",
        body: JSON.stringify(candidate),
    }, token)

/** Update candidate manifesto / details */
export const updateCandidate = (candidateId, patch, token, slug = ORG_SLUG) =>
    request(`/candidates/${slug}/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    }, token)

/** Remove a candidate */
export const removeCandidate = (candidateId, token, slug = ORG_SLUG) =>
    request(`/candidates/${slug}/${candidateId}`, { method: "DELETE" }, token)

// ─── Super Admin ──────────────────────────────────────────────────────────────

/** Login with .env credentials — returns a superadmin JWT */
export const superadminLogin = (email, secret) =>
    request(`/superadmin/login`, {
        method: "POST",
        body: JSON.stringify({ email, secret }),
    })

/** Platform-wide overview */
export const fetchSuperAdminOverview = (token) =>
    request(`/superadmin/overview`, {}, token)

/** Cross-org audit logs with optional filters */
export const fetchSuperAdminLogs = (token, { limit = 100, offset = 0, org = null, type = null } = {}) => {
    const params = new URLSearchParams({ limit, offset })
    if (org) params.set("org", org)
    if (type) params.set("type", type)
    return request(`/superadmin/logs?${params}`, {}, token)
}

/** Deactivate an organization */
export const deactivateOrg = (orgId, reason, token) =>
    request(`/superadmin/orgs/${orgId}/deactivate`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
    }, token)

/** Reactivate an organization */
export const reactivateOrg = (orgId, token) =>
    request(`/superadmin/orgs/${orgId}/reactivate`, { method: "PATCH" }, token)