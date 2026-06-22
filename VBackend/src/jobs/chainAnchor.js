import { query } from "../db/pool.js"
import { anchorChain } from "../utils/voteChain.js"

/**
 * Periodically anchor every ACTIVE election's chain head.
 * Runs on an interval; lightweight (one query + maybe one insert per election).
 */
export function startChainAnchorJob(intervalMs = 10 * 60 * 1000) {
    const run = async () => {
        try {
            const active = await query(
                `SELECT id FROM elections WHERE status = 'ACTIVE'`
            )
            for (const row of active.rows) {
                try {
                    const result = await anchorChain(row.id)
                    // Only email when a genuinely new anchor was written (head changed)
                    if (result && !result.unchanged) {
                        await emailAnchorToAdmin(row.id, result)
                    }
                } catch (e) {
                    console.error(`Anchor failed for election ${row.id}:`, e.message)
                }
            }
        } catch (e) {
            console.error("Chain anchor job error:", e.message)
        }
    }

    // Run once shortly after boot, then on the interval
    setTimeout(run, 30_000)
    const handle = setInterval(run, intervalMs)
    console.log(`⛓  Chain anchor job started (every ${intervalMs / 60000} min)`)
    return handle
}

import { sendAnchorEmail } from "../utils/index.js"

async function emailAnchorToAdmin(electionId, anchor) {
    try {
        const info = await query(
            `SELECT e.name AS election_name, o.name AS org_name, o.admin_email
       FROM elections e JOIN organizations o ON o.id = e.org_id
       WHERE e.id = $1`,
            [electionId]
        )
        if (info.rows.length === 0 || !info.rows[0].admin_email) return
        await sendAnchorEmail({
            to: info.rows[0].admin_email,
            orgName: info.rows[0].org_name,
            electionName: info.rows[0].election_name,
            headHash: anchor.headHash,
            chainLength: anchor.length,
            anchoredAt: new Date(),
        })
    } catch (e) {
        console.error("Anchor email failed:", e.message)
    }
}