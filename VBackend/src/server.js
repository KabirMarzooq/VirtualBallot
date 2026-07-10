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
import paymentRoutes from "./routes/payments.js"
import paidRoutes from "./routes/paid.js"
import chainRoutes from "./routes/chain.js"
import chatRoutes from "./routes/chat.js"
import rosterApprovalRoutes from "./routes/rosterApproval.js"
import { startChainAnchorJob } from "./jobs/chainAnchor.js"
import { query } from "./db/pool.js"

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

  // ── Existing election room handlers (keep as-is) ──────────────────────────
  socket.on("join:election", (electionId) => {
    socket.join(`election:${electionId}`)
  })

  socket.on("leave:election", (electionId) => {
    socket.leave(`election:${electionId}`)
  })

  // ── Chat: voter joins their conversation room ─────────────────────────────
  // Called by the voter widget on mount so they receive auto:reply
  // and staff:reply events in real time.
  socket.on("join:chat:convo", ({ conversationId }) => {
    socket.join(`chat:convo:${conversationId}`)
  })

  socket.on("leave:chat:convo", ({ conversationId }) => {
    socket.leave(`chat:convo:${conversationId}`)
  })

  // ── Chat: staff joins their org room ─────────────────────────────────────
  // Called by the staff dashboard on mount.
  // Staff can handle any election under their org, so one room covers all.
  // Tracks presence in-memory so the dashboard shows who's online.
  socket.on("join:chat:org", ({ orgId, staffId, staffName }) => {
    socket.join(`chat:org:${orgId}`)
    socket.data.orgId    = orgId
    socket.data.staffId  = staffId
    socket.data.staffName = staffName

    // Build current online list and broadcast to org room
    const online = getOnlineStaff(io, orgId)
    io.to(`chat:org:${orgId}`).emit("staff:presence", { online })
  })

  // ── Typing indicators ─────────────────────────────────────────────────────
  // Voter typing → staff dashboard shows indicator on that conversation card
  socket.on("voter:typing", ({ conversationId, orgId }) => {
    socket.to(`chat:org:${orgId}`).emit("voter:typing", { conversationId })
  })

  // Staff typing → voter widget shows "typing…"
  socket.on("staff:typing", ({ conversationId }) => {
    socket.to(`chat:convo:${conversationId}`).emit("staff:typing")
  })

  // ── Disconnect: update presence + schedule auto-release ──────────────────
  socket.on("disconnect", async () => {
    const { orgId, staffId } = socket.data
    if (!orgId || !staffId) return

    // Broadcast updated presence list
    const online = getOnlineStaff(io, orgId)
    io.to(`chat:org:${orgId}`).emit("staff:presence", { online })

    // Auto-release any claimed chats after 2 minutes (grace for refreshes).
    setTimeout(async () => {
      try {
        // Check staff is still offline (they may have reconnected in grace window)
        const stillOnline = getOnlineStaff(io, orgId).some((s) => s.staffId === staffId)
        if (stillOnline) return

        const result = await query(
          `UPDATE chat_conversations
           SET assigned_staff_id = NULL, status = 'escalated'
           WHERE assigned_staff_id = $1 AND status = 'claimed'
           RETURNING id`,
          [staffId]
        )
        for (const row of result.rows) {
          io.to(`chat:org:${orgId}`).emit("chat:released", {
            conversationId: row.id,
            reason: "auto-release: staff disconnected",
          })
        }
      } catch (err) {
        console.error("Auto-release error:", err)
      }
    }, 2 * 60 * 1000) // 2 minutes
  })
})

// ── Helper: get online staff for an org from Socket.io room state ─────────────
// Returns [{ staffId, staffName }] for all sockets currently in chat:org:{orgId}
function getOnlineStaff(io, orgId) {
  const room = io.sockets.adapter.rooms.get(`chat:org:${orgId}`)
  if (!room) return []

  const online = []
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId)
    if (s?.data?.staffId) {
      online.push({ staffId: s.data.staffId, staffName: s.data.staffName })
    }
  }
  // Deduplicate (same staff member in multiple tabs)
  return [...new Map(online.map((s) => [s.staffId, s])).values()]
}

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────

// Paystack webhook MUST receive the raw body for signature verification —
// register it before express.json() so the body isn't parsed.
app.use("/paid/webhook", express.raw({ type: "application/json" }))
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
app.use("/payments", paymentRoutes)
app.use("/paid", paidRoutes)
app.use("/chain", chainRoutes)
app.use("/chat", authLimiter, chatRoutes)
app.use("/roster-approval", rosterApprovalRoutes)

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
  startChainAnchorJob()
})

export default app