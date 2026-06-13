import crypto from "crypto"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import { Resend } from "resend";
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
export const signAccessToken = (payload) => {
  const expiryMap = {
    admin: "8h",
    observer: "8h",
    superadmin: "2h",
    voter: "15m",
  }
  const expiresIn = expiryMap[payload.role] || process.env.JWT_EXPIRES_IN || "15m"
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })
}

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


let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

/**
 * Send OTP email to a voter.
 * In development without SMTP configured, logs the OTP to console instead.
 */
export const sendOTPEmail = async ({ to, name, otp, electionName }) => {
  if (!process.env.RESEND_API_KEY || process.env.NODE_ENV !== "production") {
    console.log(`\n📧 OTP EMAIL (dev mode — not actually sent)`)
    console.log(`   To: ${to} (${name})`)
    console.log(`   OTP: ${otp}`)
    console.log(`   Election: ${electionName}\n`)
    return true
  }

  await getResend().emails.send({
    from: `Virtual Ballot <noreply@virtualballot.online>`,
    to,
    subject: `${otp} — Your Virtual Ballot verification code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;padding:40px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#2563eb;color:white;font-weight:900;font-size:20px;width:56px;height:56px;line-height:56px;border-radius:14px;text-align:center;">VB</div>
            <h2 style="margin:16px 0 4px;color:#0f172a;font-size:22px;">Your verification code</h2>
            <p style="margin:0;color:#64748b;font-size:14px;">${electionName}</p>
          </div>
          <p style="color:#475569;margin-bottom:24px;">Hi ${name},</p>
          <p style="color:#475569;margin-bottom:32px;">Enter this code to verify your identity and proceed to the ballot. It expires in ${process.env.OTP_EXPIRES_MINUTES || 5} minutes.</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
            <p style="font-family:monospace;font-size:48px;font-weight:900;letter-spacing:12px;color:#2563eb;margin:0;">${otp}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;">If you did not request this code, ignore this email. Do not share this code with anyone.</p>
        </div>
      </body>
      </html>
    `,
  })

  return true
}

/**
 * Email a voter their receipt confirmation.
 * In development without Resend configured, logs to console instead.
 */
export const sendReceiptEmail = async ({ to, name, receiptId, electionName, orgName, castAt }) => {
  if (!process.env.RESEND_API_KEY || process.env.NODE_ENV !== "production") {
    console.log(`\n📧 RECEIPT EMAIL (dev mode — not actually sent)`)
    console.log(`   To: ${to} (${name})`)
    console.log(`   Receipt: ${receiptId}`)
    console.log(`   Election: ${electionName}\n`)
    return true
  }

  const dateStr = new Date(castAt).toLocaleString("en-GB", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  })

  await getResend().emails.send({
    from: `Virtual Ballot <noreply@virtualballot.online>`,
    to,
    subject: `Your vote receipt — ${electionName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;padding:40px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#16a34a;color:white;font-weight:900;font-size:20px;width:56px;height:56px;line-height:56px;border-radius:14px;text-align:center;">✓</div>
            <h2 style="margin:16px 0 4px;color:#0f172a;font-size:22px;">Your vote was recorded</h2>
            <p style="margin:0;color:#64748b;font-size:14px;">${electionName}</p>
          </div>
          <p style="color:#475569;margin-bottom:8px;">Hi ${name},</p>
          <p style="color:#475569;margin-bottom:24px;">This confirms your vote was successfully cast and recorded in the ${orgName} election system.</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#94a3b8;margin:0 0 8px;">Receipt ID</p>
            <p style="font-family:monospace;font-size:24px;font-weight:900;letter-spacing:4px;color:#16a34a;margin:0;">${receiptId}</p>
          </div>
          <p style="color:#64748b;font-size:13px;margin-bottom:4px;"><strong>Cast at:</strong> ${dateStr}</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Keep this receipt safe. You can use it to verify your vote was counted, but it does not reveal who you voted for — your ballot remains secret.</p>
        </div>
      </body>
      </html>
    `,
  })

  return true
}

/**
 * Send a password-reset link to an admin.
 * In development without SMTP configured, logs the link to console instead.
 */
export const sendPasswordResetEmail = async ({ to, orgName, resetUrl }) => {
  if (!process.env.RESEND_API_KEY || process.env.NODE_ENV !== "production") {
    console.log(`\n📧 PASSWORD RESET EMAIL (dev mode — not actually sent)`)
    console.log(`   To: ${to} (${orgName})`)
    console.log(`   Reset URL: ${resetUrl}\n`)
    return true
  }

  await getResend().emails.send({
    from: `Virtual Ballot <noreply@virtualballot.online>`,
    to,
    subject: `Reset your Virtual Ballot admin password — ${orgName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;padding:40px;border:1px solid #e2e8f0;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:#2563eb;color:white;font-weight:900;font-size:20px;width:56px;height:56px;line-height:56px;border-radius:14px;text-align:center;">VB</div>
            <h2 style="margin:16px 0 4px;color:#0f172a;font-size:22px;">Reset your password</h2>
            <p style="margin:0;color:#64748b;font-size:14px;">${orgName}</p>
          </div>
          <p style="color:#475569;margin-bottom:24px;">We received a request to reset the admin password for your Virtual Ballot account.</p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Reset Password</a>
          </div>
          <p style="color:#64748b;font-size:13px;">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</p>
          <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">If the button doesn't work, copy this URL:<br/><span style="color:#2563eb;word-break:break-all;">${resetUrl}</span></p>
        </div>
      </body>
      </html>
    `,
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
