import crypto from "crypto"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
dotenv.config()

// ─── OTP ──────────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP */
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString()
}

/** Hash an OTP for safe storage */
export const hashOTP = (otp) => bcrypt.hash(otp, 10)

/** Verify an OTP against its stored hash */
export const verifyOTP = (otp, hash) => bcrypt.compare(otp, hash)

// ─── JWT ──────────────────────────────────────────────────────────────────────

/** Sign a short-lived access token (15 min) */
export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  })

/** Sign a longer-lived refresh token (7 days) */
export const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  })

/** Verify and decode an access token. Returns payload or throws. */
export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET)

/** Verify and decode a refresh token. Returns payload or throws. */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

// ─── Email ────────────────────────────────────────────────────────────────────

let transporter = null

const getTransporter = () => {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

/**
 * Send OTP email to a voter.
 * In development without SMTP configured, logs the OTP to console instead.
 */
export const sendOTPEmail = async ({ to, name, otp, electionName }) => {
  // If no SMTP configured, just log to console (dev mode)
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.mailtrap.io") {
    console.log(`\n📧 OTP EMAIL (dev mode — not actually sent)`)
    console.log(`   To: ${to} (${name})`)
    console.log(`   OTP: ${otp}`)
    console.log(`   Election: ${electionName}\n`)
    return true
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #f8fafc;">
      <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #2563eb; color: white; font-weight: 900; font-size: 20px; width: 56px; height: 56px; line-height: 56px; border-radius: 14px; text-align: center;">VB</div>
          <h2 style="margin: 16px 0 4px; color: #0f172a; font-size: 22px;">Your verification code</h2>
          <p style="margin: 0; color: #64748b; font-size: 14px;">${electionName}</p>
        </div>
        <p style="color: #475569; margin-bottom: 24px;">Hi ${name},</p>
        <p style="color: #475569; margin-bottom: 32px;">Enter this code to verify your identity and proceed to the ballot. It expires in ${process.env.OTP_EXPIRES_MINUTES || 5} minutes.</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <p style="font-family: monospace; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #2563eb; margin: 0;">${otp}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request this code, ignore this email. Do not share this code with anyone.</p>
      </div>
    </body>
    </html>
  `

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "noreply@virtualballot.app",
    to,
    subject: `${otp} — Your Virtual Ballot verification code`,
    html,
  })

  return true
}

// ─── Receipt ID ───────────────────────────────────────────────────────────────

export const generateReceiptId = () =>
  "VB-" + crypto.randomBytes(5).toString("hex").toUpperCase()

// ─── Response helpers ────────────────────────────────────────────────────────

export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, ...data })

export const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message })
