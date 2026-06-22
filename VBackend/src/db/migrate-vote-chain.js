import { query } from "./pool.js"

const run = async () => {
    console.log("Running vote-chain migration...")

    await query(`
    CREATE TABLE IF NOT EXISTS vote_chain (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      seq           BIGINT NOT NULL,
      vote_type     TEXT NOT NULL,
      candidate_id  UUID NOT NULL,
      position      TEXT NOT NULL,
      receipt_id    TEXT NOT NULL,
      data_hash     TEXT NOT NULL,
      prev_hash     TEXT NOT NULL,
      chain_hash    TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (election_id, seq)
    )
  `)

    await query(`
    CREATE TABLE IF NOT EXISTS chain_anchors (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        head_hash    TEXT NOT NULL,
        chain_length BIGINT NOT NULL,
        anchored_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chain_anchors_election ON chain_anchors(election_id, anchored_at);
  `)

    await query(`
    CREATE INDEX IF NOT EXISTS idx_vote_chain_election ON vote_chain(election_id, seq)
  `)
    await query(`
    CREATE INDEX IF NOT EXISTS idx_vote_chain_receipt  ON vote_chain(receipt_id)
  `)
    await query(`
    CREATE INDEX IF NOT EXISTS idx_vote_chain_hash     ON vote_chain(chain_hash)
  `)

    console.log("✓ Vote-chain migration complete")
    process.exit(0)
}

run().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})