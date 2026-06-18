// ─── Time Formatting ──────────────────────────────────────────────────────────

export const formatCountdown = (totalMs) => {
    if (totalMs <= 0) return { d: "0", h: "00", m: "00", s: "00" }
    return {
        d: String(Math.floor(totalMs / 86400000)),
        h: String(Math.floor((totalMs % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0"),
    }
}

export const formatTimeLeft = (ms) => {
    if (ms <= 0) return "00h : 00m : 00s"
    const { d, h, m, s } = formatCountdown(ms)
    // Only show the days segment when there's at least a day left
    return Number(d) > 0
        ? `${d}d : ${h}h : ${m}m : ${s}s`
        : `${h}h : ${m}m : ${s}s`
}

// ─── Email Validation ──────────────────────────────────────────────────

export const isValidEmail = (email) =>
    typeof email === "string" &&
    email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ─── ID / Receipt Generation ──────────────────────────────────────────────────

export const genReceiptId = () =>
    "VB-" + Math.random().toString(36).slice(2, 11).toUpperCase()

export const genSerialId = (prefix = "BLT") =>
    prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase()

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

export const parseVoterCSV = (text) => {
    const lines = text.split("\n").map((l) => l.replace(/\r/g, "").trim()).filter(Boolean)
    if (lines.length === 0) return []

    // Split a CSV row into columns, handling quoted fields
    const splitRow = (row) => {
        const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
        return cols ? cols.map((c) => c.replace(/^"|"$/g, "").trim()) : []
    }

    const firstRow = splitRow(lines[0]).map((c) => c.toLowerCase())

    // Detect a header row: any cell contains "matric", "name", or "email"
    const headerKeywords = ["matric", "name", "email", "mail"]
    const hasHeader = firstRow.some((cell) =>
        headerKeywords.some((k) => cell.includes(k))
    )

    // Work out which column index holds which field
    let matricIdx = 0, nameIdx = 1, emailIdx = 2  // positional defaults
    if (hasHeader) {
        firstRow.forEach((cell, i) => {
            if (cell.includes("matric")) matricIdx = i
            else if (cell.includes("name")) nameIdx = i
            else if (cell.includes("email") || cell.includes("mail")) emailIdx = i
        })
    }

    const dataLines = hasHeader ? lines.slice(1) : lines

    return dataLines
        .map((row) => {
            const cols = splitRow(row)
            if (cols.length < 2) return null

            const matric = cols[matricIdx]?.toUpperCase() || ""
            const name = cols[nameIdx] || ""
            let email = cols[emailIdx] || null
            if (email && (email.trim() === "-" || email.trim() === "")) email = null
            // Drop malformed emails to null rather than storing junk;
            // the voter can add a valid one at registration.
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) email = null

            return matric && name ? { matric, name, email } : null
        })
        .filter(Boolean)
}

export const buildVoterCSV = (voters) => {
    const rows = ["Matric,Name,Email,Voted", ...voters.map((u) => `${u.matric},${u.name},${u.email ?? ""},${u.hasVoted}`)]
    return rows.join("\n")
}

export const downloadCSV = (content, filename) => {
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(content)
    a.download = filename
    a.click()
}

// ─── Local Storage helpers (safe) ────────────────────────────────────────────

export const safeGetLocal = (key) => {
    try { return localStorage.getItem(key) } catch { return null }
}

export const safeSetLocal = (key, value) => {
    try { localStorage.setItem(key, value) } catch { /* noop */ }
}

export const safeRemoveLocal = (key) => {
    try { localStorage.removeItem(key) } catch { /* noop */ }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const maskMatric = (matric) =>
    matric.slice(0, 3) + "***" + matric.slice(-2)

export const getPositions = (candidates) =>
    Array.from(new Set(candidates.map((c) => c.position)))

export const getTurnout = (users) => {
    const voters = users.filter((u) => u.role !== "ADMIN")
    const voted = voters.filter((u) => u.hasVoted)
    const accredited = voters.filter((u) => u.email)  // verified + email added
    return {
        total: voters.length,                          // Registered (full roster)
        accredited: accredited.length,                 // Accredited (verified, can vote)
        voted: voted.length,
        pct: voters.length > 0 ? Math.round((voted.length / voters.length) * 100) : 0,
    }
}

/** Returns true if the top two candidates in a sorted array are tied */
export const isTied = (sortedCandidates) => {
    if (sortedCandidates.length < 2) return false;
    return sortedCandidates[0].votes === sortedCandidates[1].votes && sortedCandidates[0].votes > 0;
}

/**
 * Generate a lightweight device fingerprint for open (DEVICE-tier) voting.
 * Combines stable browser/device signals into a single hash.
 * Not foolproof — it's a deterrent against casual double-voting, not a
 * security guarantee. The backend IP check + DB unique index back it up.
 */
export const getDeviceFingerprint = async () => {
    const signals = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || "",
        navigator.platform || "",
    ].join("|")

    // Hash via SubtleCrypto for a compact, stable string
    const buf = new TextEncoder().encode(signals)
    const hashBuf = await crypto.subtle.digest("SHA-256", buf)
    return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)
}