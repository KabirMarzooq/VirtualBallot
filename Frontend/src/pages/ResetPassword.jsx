import { useState } from "react";
import { ShieldAlert, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
          <p className="text-white font-bold">Invalid reset link</p>
          <p className="text-slate-400 text-sm">
            This link is missing a reset token. Please request a new password reset.
          </p>
          <button
            onClick={() => navigate("/admin/forgot-password")}
            className="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors cursor-pointer"
          >
            Request new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">New Password</h1>
            <p className="text-slate-400 text-sm mt-1">
              Choose a strong password for your admin account
            </p>
          </div>

          {done ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 bg-green-900/30 border border-green-700/40 rounded-2xl p-5 text-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-green-300 font-bold text-sm">Password updated!</p>
                  <p className="text-green-600 text-xs mt-1">
                    Your admin password has been changed. You can now log in.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/admin/login")}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Go to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-slate-800 text-white text-center text-xl font-mono tracking-[0.3em] py-4 rounded-xl border-2 border-slate-700 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className={`w-full bg-slate-800 text-white text-center text-xl font-mono tracking-[0.3em] py-4 rounded-xl border-2 outline-none transition-all placeholder:text-slate-700 ${
                    error ? "border-red-500 text-red-400" : "border-slate-700 focus:border-blue-500"
                  }`}
                />
                {error && (
                  <p className="text-red-400 text-xs font-bold text-center mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!password || !confirmPassword || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Update Password
                  </>
                )}
              </button>

              <button
                onClick={() => navigate("/admin/forgot-password")}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Request a new reset link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
