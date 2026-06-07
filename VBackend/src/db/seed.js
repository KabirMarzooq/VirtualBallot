/**
 * db/seed.js — Creates demo data so you can test the full flow immediately.
 * Command: npm run db:seed
 *
 * Creates:
 *   - 1 organization: NUESA (slug: nuesa)
 *   - 1 election: SRC General Elections 2025
 *   - 4 voters on the roster (U/25/001 to U/25/004)
 *   - 4 candidates (2 for President, 2 for Gen. Secretary)
 *
 * Admin login: admin@nuesa.edu.ng / Admin1234!
 * Observer PIN: 5566
 */

import bcrypt from "bcryptjs"
import { query } from "./pool.js"
import dotenv from "dotenv"
dotenv.config()

async function seed() {
  console.log("🌱 Seeding demo data...")

  try {
    // 1. Create organization
    const adminHash    = await bcrypt.hash("Admin1234!", 10)
    const observerHash = await bcrypt.hash("5566", 10)

    const orgResult = await query(`
      INSERT INTO organizations (name, slug, logo_url, admin_email, admin_password, observer_pin)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [
      "Nigerian University Engineering Students Association",
      "nuesa",
      null,
      "admin@nuesa.edu.ng",
      adminHash,
      observerHash,
    ])
    const orgId = orgResult.rows[0].id
    console.log(`  ✅ Organization created: NUESA (id: ${orgId})`)

    // 2. Create election
    const electionResult = await query(`
      INSERT INTO elections (org_id, name, status)
      VALUES ($1, $2, 'NOT_STARTED')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [orgId, "SRC General Elections 2025"])

    let electionId
    if (electionResult.rows.length > 0) {
      electionId = electionResult.rows[0].id
    } else {
      const existing = await query(`SELECT id FROM elections WHERE org_id = $1 LIMIT 1`, [orgId])
      electionId = existing.rows[0].id
    }
    console.log(`  ✅ Election created (id: ${electionId})`)

    // 3. Create voter roster
    const roster = [
      { matric: "U/25/001", name: "Amina Yusuf",       email: "amina@nuesa.edu.ng"   },
      { matric: "U/25/002", name: "Chukwuemeka Obi",   email: "emeka@nuesa.edu.ng"   },
      { matric: "U/25/003", name: "Fatima Abdullahi",  email: "fatima@nuesa.edu.ng"  },
      { matric: "U/25/004", name: "Tunde Adeyemi",     email: "tunde@nuesa.edu.ng"   },
    ]

    for (const v of roster) {
      await query(`
        INSERT INTO voters (election_id, org_id, matric, name, email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (election_id, matric) DO NOTHING
      `, [electionId, orgId, v.matric, v.name, v.email])
    }
    console.log(`  ✅ ${roster.length} voters added to roster`)

    // 4. Create candidates
    const candidates = [
      {
        name: "Sarah Adebayo", position: "President",
        color: "from-blue-400 to-blue-600",
        image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        manifesto: "I will champion student welfare, improve campus infrastructure, and create direct communication channels between students and administration.",
      },
      {
        name: "Michael Okon", position: "President",
        color: "from-indigo-400 to-indigo-600",
        image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
        manifesto: "A transparent, student-first leadership. I will digitise all student services and establish a 24-hour welfare hotline.",
      },
      {
        name: "Chioma Nwachukwu", position: "Gen. Secretary",
        color: "from-teal-400 to-teal-600",
        image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma",
        manifesto: "Accurate records, open communication, and efficient administration. I will modernise our documentation systems.",
      },
      {
        name: "David Ibrahim", position: "Gen. Secretary",
        color: "from-orange-400 to-orange-600",
        image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        manifesto: "Organisation and integrity. I will implement a digital filing system and ensure no decision is made without proper documentation.",
      },
    ]

    for (const c of candidates) {
      await query(`
        INSERT INTO candidates (election_id, org_id, name, position, color, image_url, manifesto)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [electionId, orgId, c.name, c.position, c.color, c.image_url, c.manifesto])
    }
    console.log(`  ✅ ${candidates.length} candidates added`)

    console.log("")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🎉 Demo data ready! Test credentials:")
    console.log("")
    console.log("  Admin login:")
    console.log("    Email:    admin@nuesa.edu.ng")
    console.log("    Password: Admin1234!")
    console.log("")
    console.log("  Observer PIN: 5566")
    console.log("")
    console.log("  Voter matric numbers on roster:")
    roster.forEach(v => console.log(`    ${v.matric}  —  ${v.name}`))
    console.log("")
    console.log("  OTP: will be emailed (check Mailtrap if configured)")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    process.exit(0)
  } catch (err) {
    console.error("❌ Seed failed:", err.message)
    console.error(err)
    process.exit(1)
  }
}

seed()
