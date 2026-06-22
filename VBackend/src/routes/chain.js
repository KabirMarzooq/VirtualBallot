import express from "express"
import { getClient, query } from "../db/pool.js"
import { recomputeChain } from "../utils/voteChain.js"
import { ok, fail } from "../utils/index.js"

const router = express.Router()

// ─── GET /chain/:slug/verify/:hash ────────────────────────────────────────────
// Public — a voter pastes their receipt's chain hash; we confirm it's in the
// chain, at what position, and whether the chain is intact up to there.
router.get("/:slug/verify/:hash", async (req, res) => {
    const { slug, hash } = req.params
    try {
        const org = await query(`SELECT id FROM organizations WHERE slug = $1`, [slug])
        if (org.rows.length === 0) return fail(res, "Organization not found", 404)

        // Find the election this org most recently ran
        const el = await query(
            `SELECT id, name FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [org.rows[0].id]
        )
        if (el.rows.length === 0) return fail(res, "No election found", 404)
        const electionId = el.rows[0].id

        const entry = await query(
            `SELECT seq, position, vote_type, created_at FROM vote_chain
       WHERE election_id = $1 AND chain_hash = $2`,
            [electionId, hash.trim()]
        )
        if (entry.rows.length === 0) {
            return ok(res, { found: false })
        }

        // Confirm the chain is intact up to this entry
        const client = await getClient()
        let integrity
        try {
            integrity = await recomputeChain(client, electionId)
        } finally {
            client.release()
        }

        return ok(res, {
            found: true,
            electionName: el.rows[0].name,
            position: entry.rows[0].position,
            voteType: entry.rows[0].vote_type,
            sequence: Number(entry.rows[0].seq),
            recordedAt: entry.rows[0].created_at,
            chainIntact: integrity.intact,
            chainLength: integrity.length,
        })
    } catch (err) {
        console.error("Chain verify error:", err)
        return fail(res, "Server error", 500)
    }
})

// ─── GET /chain/:slug/export ──────────────────────────────────────────────────
// Public — download the full chain so ANYONE can recompute it independently.
// This is what makes it verifiable without trusting us: the math is portable.
router.get("/:slug/export", async (req, res) => {
    const { slug } = req.params
    try {
        const org = await query(`SELECT id, name FROM organizations WHERE slug = $1`, [slug])
        if (org.rows.length === 0) return fail(res, "Organization not found", 404)

        const el = await query(
            `SELECT id, name FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [org.rows[0].id]
        )
        if (el.rows.length === 0) return fail(res, "No election found", 404)

        const rows = (
            await query(
                `SELECT seq, vote_type, candidate_id, position, receipt_id,
                data_hash, prev_hash, chain_hash, created_at
         FROM vote_chain WHERE election_id = $1 ORDER BY seq ASC`,
                [el.rows[0].id]
            )
        ).rows

        return ok(res, {
            organization: org.rows[0].name,
            election: el.rows[0].name,
            algorithm: "SHA-256",
            recipe: "chain_hash = SHA256(seq + '|' + data_hash + '|' + prev_hash); data_hash = SHA256(electionId + '|' + vote_type + '|' + candidate_id + '|' + position + '|' + receipt_id)",
            headHash: rows.length ? rows[rows.length - 1].chain_hash : "GENESIS",
            length: rows.length,
            chain: rows,
        })
    } catch (err) {
        return fail(res, "Server error", 500)
    }
})

export default router