import { useState } from "react";
import { Lock, Check, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthBackground from "../components/layout/AuthBackground";
import { adminResetPassword } from "../api";
import VBLoader from "../components/ui/VBLoader";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!password || !confirmPassword) return;
    setLoading(true);
    setError("");
    try {
      await adminResetPassword(token, password, confirmPassword);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pwMismatch = !!confirmPassword && password !== confirmPassword;
  const pwMatch = !!confirmPassword && password === confirmPassword;

  const pwInput =
    "w-full min-h-[48px] text-sm font-mono tracking-[0.3em] text-slate-800 bg-white border rounded-lg px-4 py-3 outline-none placeholder:text-slate-400 transition-all";

  if (!token) {
    return (
      <AuthBackground>
        <div className="w-full max-w-[360px] text-slate-800">
          <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-[13px] leading-5 font-semibold text-slate-900">
                Invalid reset link
              </p>
              <p className="text-[11px] leading-4 text-slate-600 mt-1">
                This link is missing its reset token — it may have been
                truncated by your email app. Request a fresh one below.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/forgot-password")}
              title="Request a new password reset link"
              className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center transition-all cursor-pointer"
            >
              Request a new link
            </button>
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                onClick={() => navigate("/admin/login")}
                title="Back to the commission login"
                className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-[360px] text-slate-800">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-slate-900 text-center mt-4">
            New password
          </h1>

          {done ? (
            <>
              <div className="bg-green-50 border border-green-600/30 rounded-xl p-4 mt-5 text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-5 h-5" strokeWidth={2.4} />
                </div>
                <p className="text-[13px] leading-5 font-semibold text-green-600">
                  Password updated
                </p>
                <p className="text-[11px] leading-4 text-slate-600 mt-1">
                  Your admin password has been changed. Sign in with the new
                  one.
                </p>
              </div>
              <button
                onClick={() => navigate("/admin/login")}
                title="Sign in with your new password"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Go to login →
              </button>
            </>
          ) : (
            <>
              <p className="text-[13px] leading-5 text-slate-600 text-center mt-1">
                Choose a strong password for your admin account
              </p>

              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  autoFocus
                  className={`${pwInput} border-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100`}
                />
                <p className="text-[11px] leading-4 text-slate-400 mt-2">
                  Minimum 8 characters.
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className={`${pwInput} ${
                    pwMismatch || error
                      ? "border-red-500 text-red-600"
                      : pwMatch
                      ? "border-green-600"
                      : "border-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100"
                  }`}
                />
                {pwMismatch && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 mt-2">
                    Passwords don't match yet.
                  </p>
                )}
                {pwMatch && !error && (
                  <p className="text-[11px] leading-4 font-medium text-green-600 mt-2">
                    ✓ Passwords match
                  </p>
                )}
                {error && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 mt-2 text-center">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!password || !confirmPassword || pwMismatch || loading}
                title="Save your new admin password"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Update password
                  </>
                )}
              </button>

              <div className="mt-5 pt-4 border-t border-slate-200 text-center">
                <button
                  onClick={() => navigate("/admin/forgot-password")}
                  title="Request a fresh reset link"
                  className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                >
                  Request a new reset link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthBackground>
  );
}
