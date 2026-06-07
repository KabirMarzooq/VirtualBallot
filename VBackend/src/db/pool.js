import pg from "pg"
import dotenv from "dotenv"
dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DB_URL,
  // Connection pool settings — good defaults for a small-medium election
  max: 20,               // max 20 simultaneous DB connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on("connect", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("✅ PostgreSQL connected")
  }
})

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message)
})

// Helper: run a query
export const query = (text, params) => pool.query(text, params)

// Helper: get a client for transactions
export const getClient = () => pool.connect()

export default pool
