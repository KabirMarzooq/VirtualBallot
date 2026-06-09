// ─── Time Formatting ──────────────────────────────────────────────────────────

export const formatCountdown = (totalMs) => {
    if (totalMs <= 0) return { h: "00", m: "00", s: "00" }
    return {
        h: String(Math.floor(totalMs / 3600000)).padStart(2, "0"),
        m: String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0"),
    }
}

export const formatTimeLeft = (ms) => {
    if (ms <= 0) return "00h : 00m : 00s"
    const { h, m, s } = formatCountdown(ms)
    return `${h}h : ${m}m : ${s}s`
}

// ─── ID / Receipt Generation ──────────────────────────────────────────────────

export const genReceiptId = () =>
    "VB-" + Math.random().toString(36).slice(2, 11).toUpperCase()

export const genSerialId = (prefix = "BLT") =>
    prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase()

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

export const parseVoterCSV = (text) => {
    const lines = text.split("\n").map((l) => l.replace(/\r/g, "").trim()).filter(Boolean)
    return lines
        // skip header row (starts with "matric" case-insensitive)
        .filter((row) => !/^matric/i.test(row))
        .map((row) => {
            // Handle quoted CSV fields properly (Excel wraps fields containing
            // commas in double quotes — e.g. "Obi, Chukwuemeka",U/25/002)
            const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
            if (!cols || cols.length < 2) return null

            const matric = cols[0].replace(/^"|"$/g, "").trim().toUpperCase()
            const name = cols[1].replace(/^"|"$/g, "").trim()
            const email = cols[2]?.replace(/^"|"$/g, "").trim() || null

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
    return {
        total: voters.length,
        voted: voted.length,
        pct: voters.length > 0 ? Math.round((voted.length / voters.length) * 100) : 0,
    }
}