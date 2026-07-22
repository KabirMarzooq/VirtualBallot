import { useState } from "react";
import { KeyRound, Mail, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthBackground from "../components/layout/AuthBackground";
import { adminForgotPassword } from "../api";
import VBLoader from "../components/ui/VBLoader";
import { isValidEmail } from "../utils";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    try {
      await adminForgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground variant="dark">
      <div className="w-full max-w-[360px]">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:px-7">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-white text-center mt-4">
            Reset password
          </h1>

          {sent ? (
            <>
              <div className="bg-green-800/20 border border-green-600/40 rounded-xl p-4 mt-5 text-center">
                <div className="w-10 h-10 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-5 h-5" strokeWidth={2.4} />
                </div>
                <p className="text-[13px] leading-5 font-semibold text-green-400">
                  Check your inbox
                </p>
                <p className="text-[11px] leading-4 text-slate-400 mt-1">
                  If <span className="font-mono text-slate-300">{email}</span>{" "}
                  is registered, a reset link is on its way. It expires in 1
                  hour — check spam if it doesn't arrive.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-700 text-center">
                <button
                  onClick={() => navigate("/admin/login")}
                  title="Back to the commission login"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-400/10 rounded-lg transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] leading-5 text-slate-400 text-center mt-1">
                We'll email a reset link to your organization's admin address
              </p>

              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
                  Admin email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="admin@org.edu.ng"
                    autoFocus
                    className={`w-full min-h-[48px] text-sm text-white bg-slate-900 border rounded-lg pl-10 pr-4 py-3 outline-none placeholder:text-slate-600 transition-all ${
                      error
                        ? "border-red-500"
                        : "border-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25"
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-[11px] leading-4 font-medium text-red-400 mt-2">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!email.trim() || loading}
                title="Email me a password reset link"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Send reset link"}
              </button>

              <div className="mt-5 pt-4 border-t border-slate-700 text-center">
                <button
                  onClick={() => navigate("/admin/login")}
                  title="Back to the commission login"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-400/10 rounded-lg transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthBackground>
  );
}
