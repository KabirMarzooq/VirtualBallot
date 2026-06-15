import express from "express"
import { createServer } from "http"
import { Server as SocketIO } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
dotenv.config()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://virtualballot.online",
  "https://www.virtualballot.online",
  "http://localhost:5173",
].filter(Boolean)

import authRoutes from "./routes/auth.js"
import electionRoutes from "./routes/elections.js"
import voteRoutes from "./routes/vote.js"
import voterRoutes from "./routes/voters.js"
import candidateRoutes from "./routes/candidates.js"
import superadminRoutes from "./routes/superadmin.js"
import openRoutes from "./routes/open.js"

const app = express()
const httpServer = createServer(app)   // ← wrap Express in an HTTP server
const PORT = process.env.PORT || 5000

// ── Socket.io ─────────────────────────────────────────────────────────────────
export const io = new SocketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  // Client joins a room for their specific election
  // Room name format: "election:{electionId}"
  socket.on("join:election", (electionId) => {
    socket.join(`election:${electionId}`)
  })

  socket.on("leave:election", (electionId) => {
    socket.leave(`election:${electionId}`)
  })
})

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))

// ── Rate limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts, please wait 15 minutes" },
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authLimiter, authRoutes)
app.use("/elections", electionRoutes)
app.use("/vote", voteRoutes)
app.use("/voters", voterRoutes)
app.use("/candidates", candidateRoutes)
app.use("/superadmin", superadminRoutes)
app.use("/open", openRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Virtual Ballot API",
    time: new Date().toISOString(),
  })
})

// ── 404 + error handlers ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
})

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ success: false, message: "Internal server error" })
})

// ── Start ─────────────────────────────────────────────────────────────────────
// IMPORTANT: listen on httpServer, not app — this is what enables WebSockets
httpServer.listen(PORT, () => {
  console.log(`\n🗳️  Virtual Ballot API running on port ${PORT}`)
  console.log(`   Health:    http://localhost:${PORT}/health`)
  console.log(`   WebSocket: ws://localhost:${PORT}`)
  console.log(`   Env:       ${process.env.NODE_ENV || "development"}`)
  console.log(`   CORS:      ${process.env.FRONTEND_URL || "http://localhost:5173"}\n`)
})

export default app