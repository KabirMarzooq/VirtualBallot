import crypto from "crypto"
import { query } from "../db/pool.js"

const sha256 = (input) =>
    crypto.createHash("sha256").update(input).digest("hex")

/**
 * appendToChain — adds one vote to an election's tamper-evident chain.
 *
 * MUST be called inside an existing transaction (pass the same `client`),
 * AFTER the vote row itself has been inserted, so it shares the commit.
 *
 * Uses a per-election advisory lock so concurrent votes chain strictly in
 * order and never fork. The lock auto-releases when the transaction ends.
 *
 * @param {object} client  - the pg client already inside BEGIN
 * @param {object} v       - { electionId, voteType, candidateId, position, receiptId }
 * @returns {object} { seq, chainHash } — chainHash is the voter's verifiable code
 */
export async function appendToChain(client, v) {
    const { electionId, voteType, candidateId, position, receiptId } = v

    // 1. Lock this election's chain so only one vote appends at a time.
    //    hashtext() turns the UUID into the integer the lock function needs.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [electionId])

    // 2. Find the current tail of the chain (highest seq) for this election.
    const tail = await client.query(
        `SELECT seq, chain_hash FROM vote_chain
     WHERE election_id = $1 ORDER BY seq DESC LIMIT 1`,
        [electionId]
    )

    const seq = tail.rows.length ? Number(tail.rows[0].seq) + 1 : 1
    const prevHash = tail.rows.length ? tail.rows[0].chain_hash : "GENESIS"

    // 3. Hash this vote's own content (the immutable facts of the vote).
    //    No voter identity here — the chain stays privacy-preserving.
    const dataHash = sha256(
        [electionId, voteType, candidateId, position, receiptId].join("|")
    )

    // 4. The chain link: this entry's hash is built from seq + its data + the
    //    previous link. Change any earlier vote and every chain_hash after it
    //    stops matching — that's the cascade.
    const chainHash = sha256([seq, dataHash, prevHash].join("|"))

    // 5. Store the link.
    await client.query(
        `INSERT INTO vote_chain
       (election_id, seq, vote_type, candidate_id, position, receipt_id,
        data_hash, prev_hash, chain_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [electionId, seq, voteType, candidateId, position, receiptId,
            dataHash, prevHash, chainHash]
    )

    return { seq, chainHash }
}

/**
 * recomputeChain — rebuilds an election's entire chain from its stored vote
 * data and checks every link. This is the heart of verification: it proves
 * whether the chain on the server is internally consistent or was tampered.
 *
 * @returns { intact: boolean, length: number, brokenAt: number|null }
 */
export async function recomputeChain(client, electionId) {
    const rows = (
        await client.query(
            `SELECT seq, vote_type, candidate_id, position, receipt_id,
                data_hash, prev_hash, chain_hash
         FROM vote_chain WHERE election_id = $1 ORDER BY seq ASC`,
            [electionId]
        )
    ).rows

    let prevHash = "GENESIS"
    for (const row of rows) {
        // Recompute this entry's data hash from its stored facts
        const dataHash = sha256(
            [electionId, row.vote_type, row.candidate_id, row.position, row.receipt_id].join("|")
        )
        // Recompute the chain hash from seq + data + the previous link
        const chainHash = sha256([row.seq, dataHash, prevHash].join("|"))

        // Two checks: the stored data_hash must match (vote content unchanged),
        // and the recomputed chain_hash must match (link unbroken).
        if (dataHash !== row.data_hash || chainHash !== row.chain_hash || prevHash !== row.prev_hash) {
            return { intact: false, length: rows.length, brokenAt: Number(row.seq) }
        }
        prevHash = row.chain_hash
    }

    return { intact: true, length: rows.length, brokenAt: null, headHash: prevHash }
}

/**
 * anchorChain — snapshots an election's current head hash into chain_anchors.
 * This is the "external memory" of the chain: if anyone later regenerates the
 * chain, its new head won't match these timestamped anchors, exposing the swap.
 * The more places this head hash is copied (anchors table, observer emails),
 * the harder it is to quietly rewrite history.
 */
export async function anchorChain(electionId) {
    const tail = await query(
        `SELECT seq, chain_hash FROM vote_chain
       WHERE election_id = $1 ORDER BY seq DESC LIMIT 1`,
        [electionId]
    )
    if (tail.rows.length === 0) return null  // nothing to anchor yet

    const headHash = tail.rows[0].chain_hash
    const length = Number(tail.rows[0].seq)

    // Skip if the head hasn't changed since the last anchor (no new votes)
    const last = await query(
        `SELECT head_hash FROM chain_anchors
       WHERE election_id = $1 ORDER BY anchored_at DESC LIMIT 1`,
        [electionId]
    )
    if (last.rows.length && last.rows[0].head_hash === headHash) {
        return { headHash, length, unchanged: true }
    }

    await query(
        `INSERT INTO chain_anchors (election_id, head_hash, chain_length)
       VALUES ($1, $2, $3)`,
        [electionId, headHash, length]
    )
    return { headHash, length, unchanged: false }
}

export { sha256 }