import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
dotenv.config()

import authRoutes       from "./routes/auth.js"
import electionRoutes   from "./routes/elections.js"
import voteRoutes       from "./routes/vote.js"
import voterRoutes      from "./routes/voters.js"
import candidateRoutes  from "./routes/candidates.js"

const app  = express()
const PORT = process.env.PORT || 5000

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }))    // 2mb enough for a large CSV roster
app.use(express.urlencoded({ extended: true }))

// ── Global rate limiter ───────────────────────────────────────────────────────
// 100 requests per minute per IP — prevents basic abuse
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use(globalLimiter)

// Stricter limiter for auth routes (prevent OTP brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,               // 20 attempts per 15 min
  message:  { success: false, message: "Too many login attempts, please wait 15 minutes" },
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth",       authLimiter, authRoutes)
app.use("/elections",  electionRoutes)
app.use("/vote",       voteRoutes)
app.use("/voters",     voterRoutes)
app.use("/candidates", candidateRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "Virtual Ballot API",
    time:    new Date().toISOString(),
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ success: false, message: "Internal server error" })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🗳️  Virtual Ballot API running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Env:    ${process.env.NODE_ENV || "development"}`)
  console.log(`   CORS:   ${process.env.FRONTEND_URL || "http://localhost:5173"}\n`)
})

export default app
