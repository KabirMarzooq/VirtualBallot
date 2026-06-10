import express from "express"
import { query } from "../db/pool.js"
import { requireAdmin, requireObserver, resolveOrg } from "../middleware/auth.js"
import { ok, fail } from "../utils/index.js"

const router = express.Router()

// ─── GET /elections/:slug ─────────────────────────────────────────────────────
// Public — returns election config + branding for the login page
router.get("/:slug", resolveOrg, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT e.*, o.name AS org_name, o.logo_url, o.slug
       FROM elections e
       JOIN organizations o ON o.id = e.org_id
       WHERE e.org_id = $1
       ORDER BY e.created_at DESC LIMIT 1`,
      [req.orgId]
    )

    if (electionResult.rows.length === 0) {
      return fail(res, "No election found for this organization", 404)
    }

    const e = electionResult.rows[0]

    return ok(res, {
      election: {
        id: e.id,
        name: e.name,
        status: e.status,
        isPublished: e.is_published,
        registryLocked: e.registry_locked,
        showCountdown: e.show_countdown,
        endsAt: e.ends_at,
      },
      branding: {
        electionName: e.name,
        institutionName: e.org_name,
        logoUrl: e.logo_url || "",
        slug: e.slug,
      },
    })
  } catch (err) {
    console.error("Get election error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /elections/:slug/candidates ─────────────────────────────────────────
// Public — returns all candidates for the ballot
router.get("/:slug/candidates", resolveOrg, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const electionId = electionResult.rows[0].id

    const candidatesResult = await query(
      `SELECT id, name, position, image_url, manifesto, color, vote_count
       FROM candidates WHERE election_id = $1
       ORDER BY position, name`,
      [electionId]
    )

    return ok(res, { candidates: candidatesResult.rows })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── GET /elections/:slug/results ─────────────────────────────────────────────
// Public but only returns data if election is published
router.get("/:slug/results", resolveOrg, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT id, status, is_published FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const election = electionResult.rows[0]

    // Only return full results if broadcast or ended
    if (!election.is_published && election.status !== "ENDED") {
      return ok(res, { published: false, candidates: [] })
    }

    const candidatesResult = await query(
      `SELECT id, name, position, image_url, color, vote_count
       FROM candidates WHERE election_id = $1
       ORDER BY position, vote_count DESC`,
      [election.id]
    )

    // Voter stats
    const statsResult = await query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE has_voted = TRUE) AS voted
       FROM voters WHERE election_id = $1`,
      [election.id]
    )

    return ok(res, {
      published: true,
      candidates: candidatesResult.rows,
      stats: {
        total: Number(statsResult.rows[0].total),
        voted: Number(statsResult.rows[0].voted),
      },
    })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── PATCH /elections/:slug/branding — Admin: update election name + org branding ──
router.patch("/:slug/branding", resolveOrg, requireAdmin, async (req, res) => {
  const { electionName, institutionName, logoUrl } = req.body

  try {
    // Update election name if provided
    if (electionName !== undefined) {
      const electionResult = await query(
        `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [req.orgId]
      )
      if (electionResult.rows.length > 0) {
        await query(
          `UPDATE elections SET name = $1, updated_at = NOW() WHERE id = $2`,
          [electionName.trim(), electionResult.rows[0].id]
        )
      }
    }

    // Update org-level branding (institution name + logo)
    const updates = []
    const values = []
    let idx = 1

    if (institutionName !== undefined) { updates.push(`name = $${idx++}`); values.push(institutionName.trim()) }
    if (logoUrl !== undefined) { updates.push(`logo_url = $${idx++}`); values.push(logoUrl || null) }

    if (updates.length > 0) {
      values.push(req.orgId)
      await query(
        `UPDATE organizations SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      )
    }

    await query(
      `INSERT INTO audit_logs (org_id, event_type, message, actor)
       VALUES ($1, 'admin', 'Branding updated', $2)`,
      [req.orgId, req.adminEmail]
    )

    return ok(res, { message: "Branding updated" })
  } catch (err) {
    console.error("Branding update error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── PATCH /elections/:slug/observer-pin — Admin: change the observer PIN ────
router.patch("/:slug/observer-pin", resolveOrg, requireAdmin, async (req, res) => {
  const { pin } = req.body

  if (!pin || pin.toString().length < 4) {
    return fail(res, "PIN must be at least 4 characters")
  }

  try {
    const bcrypt = await import("bcryptjs")
    const pinHash = await bcrypt.default.hash(pin.toString(), 10)

    await query(
      `UPDATE organizations SET observer_pin = $1 WHERE id = $2`,
      [pinHash, req.orgId]
    )

    await query(
      `INSERT INTO audit_logs (org_id, event_type, message, actor)
       VALUES ($1, 'admin', 'Observer PIN updated', $2)`,
      [req.orgId, req.adminEmail]
    )

    return ok(res, { message: "Observer PIN updated" })
  } catch (err) {
    console.error("Observer PIN update error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── PATCH /elections/:slug/config — Admin: update election settings ──────────
router.patch("/:slug/config", resolveOrg, requireAdmin, async (req, res) => {
  const { status, isPublished, registryLocked, showCountdown, endsAt } = req.body

  try {
    const updates = []
    const values = []
    let idx = 1

    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status) }
    if (isPublished !== undefined) { updates.push(`is_published = $${idx++}`); values.push(isPublished) }
    if (registryLocked !== undefined) { updates.push(`registry_locked = $${idx++}`); values.push(registryLocked) }
    if (showCountdown !== undefined) { updates.push(`show_countdown = $${idx++}`); values.push(showCountdown) }
    if (endsAt !== undefined) { updates.push(`ends_at = $${idx++}`); values.push(endsAt) }

    if (status === "ACTIVE") {
      updates.push(`started_at = $${idx++}`)
      values.push(new Date())
    }

    updates.push(`updated_at = $${idx++}`)
    values.push(new Date())

    if (updates.length === 1) return fail(res, "No valid fields to update")

    const electionResult = await query(
      `SELECT id FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const electionId = electionResult.rows[0].id

    values.push(electionId)
    await query(
      `UPDATE elections SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    )

    return ok(res, { message: "Election config updated" })
  } catch (err) {
    console.error("Update config error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── GET /elections/:slug/admin/overview — Admin: full dashboard data ─────────
router.get("/:slug/admin/overview", resolveOrg, requireAdmin, async (req, res) => {
  try {
    const electionResult = await query(
      `SELECT * FROM elections WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )
    if (electionResult.rows.length === 0) return fail(res, "No election found", 404)
    const election = electionResult.rows[0]

    const [candidatesResult, votersResult, auditResult] = await Promise.all([
      query(`SELECT * FROM candidates WHERE election_id = $1 ORDER BY position, name`, [election.id]),
      query(`SELECT id, matric, name, email, has_voted, voted_at FROM voters WHERE election_id = $1 ORDER BY name`, [election.id]),
      query(`SELECT * FROM audit_logs WHERE election_id = $1 ORDER BY created_at DESC LIMIT 100`, [election.id]),
    ])

    return ok(res, {
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        isPublished: election.is_published,
        registryLocked: election.registry_locked,
        showCountdown: election.show_countdown,
        endsAt: election.ends_at,
        startedAt: election.started_at,
      },
      candidates: candidatesResult.rows,
      voters: votersResult.rows,
      auditLog: auditResult.rows,
    })
  } catch (err) {
    return fail(res, "Server error", 500)
  }
})

// ─── GET /elections/:slug/history ─────────────────────────────────────────────
// Admin: all past elections for this org, with winner summaries
router.get("/:slug/history", resolveOrg, requireAdmin, async (req, res) => {
  try {
    // Get all elections except the current (most recent) one
    const result = await query(
      `SELECT e.id, e.name, e.status, e.started_at, e.ends_at, e.created_at,
              COUNT(DISTINCT v.id) FILTER (WHERE v.has_voted = TRUE) AS votes_cast,
              COUNT(DISTINCT v.id) AS total_voters,
              COUNT(DISTINCT c.id) AS candidate_count
       FROM elections e
       LEFT JOIN voters    v ON v.election_id = e.id
       LEFT JOIN candidates c ON c.election_id = e.id
       WHERE e.org_id = $1
         AND e.status = 'ENDED'
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [req.orgId]
    )

    // For each ended election, get the winners per position
    const elections = await Promise.all(result.rows.map(async (e) => {
      const winnersResult = await query(
        `SELECT position,
                name,
                image_url,
                vote_count,
                (SELECT SUM(vote_count) FROM candidates WHERE election_id = $1 AND position = c.position) AS position_total
         FROM candidates c
         WHERE election_id = $1
         ORDER BY position, vote_count DESC`,
        [e.id]
      )

      // Pick the candidate per position
      const positions = {}
      const allCandidates = []

      winnersResult.rows.forEach(c => {
        const pct = c.position_total > 0
          ? Math.round((c.vote_count / c.position_total) * 100)
          : 0

        allCandidates.push({
          name: c.name,
          position: c.position,
          image_url: c.image_url,
          votes: Number(c.vote_count),
          total: Number(c.position_total),
          pct,
        })

        if (!positions[c.position]) {
          positions[c.position] = {
            position: c.position,
            winner: c.name,
            image_url: c.image_url,
            votes: Number(c.vote_count),
            total: Number(c.position_total),
            pct,
            tied: false,
          }
        } else if (Number(c.vote_count) === positions[c.position].votes) {
          // Tie — append name
          positions[c.position].tied = true;
          positions[c.position].winner = positions[c.position].winner + " & " + c.name;
          positions[c.position].image_url = null; // can't show one photo for two
        }
      })

      return {
        id: e.id,
        name: e.name,
        status: e.status,
        startedAt: e.started_at,
        endsAt: e.ends_at,
        createdAt: e.created_at,
        votesCast: Number(e.votes_cast),
        totalVoters: Number(e.total_voters),
        didNotVote: Number(e.total_voters) - Number(e.votes_cast),
        candidateCount: Number(e.candidate_count),
        turnout: e.total_voters > 0
          ? Math.round((e.votes_cast / e.total_voters) * 100)
          : 0,
        winners: Object.values(positions),
        candidates: allCandidates,
      }
    }))

    return ok(res, { elections })
  } catch (err) {
    console.error("History error:", err)
    return fail(res, "Server error", 500)
  }
})

// ─── POST /elections/:slug/new ────────────────────────────────────────────────
// Admin: archive current election and create a fresh one
router.post("/:slug/new", resolveOrg, requireAdmin, async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return fail(res, "Election name is required")

  try {
    // Verify current election is not ACTIVE before allowing a new one
    const currentResult = await query(
      `SELECT id, status FROM elections
       WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.orgId]
    )

    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0]
      if (current.status === "ACTIVE") {
        return fail(res, "Cannot create a new election while one is still active. End it first.", 400)
      }
      // Mark the current election as ENDED so it shows in history
      // (it may already be ENDED, or it may be NOT_STARTED — either way archive it)
      if (current.status !== "ENDED") {
        await query(
          `UPDATE elections SET status = 'ENDED', ends_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [current.id]
        )
      }
    }

    // Create the new blank election
    const newResult = await query(
      `INSERT INTO elections (org_id, name, status)
       VALUES ($1, $2, 'NOT_STARTED')
       RETURNING id, name, status`,
      [req.orgId, name.trim()]
    )
    const newElection = newResult.rows[0]

    // Audit log
    await query(
      `INSERT INTO audit_logs (org_id, election_id, event_type, message, actor)
       VALUES ($1, $2, 'system', $3, $4)`,
      [req.orgId, newElection.id, `New election created: "${name.trim()}"`, req.adminEmail]
    )

    return ok(res, {
      message: "New election created successfully",
      election: newElection,
    }, 201)
  } catch (err) {
    console.error("New election error:", err)
    return fail(res, "Server error", 500)
  }
})

export default router