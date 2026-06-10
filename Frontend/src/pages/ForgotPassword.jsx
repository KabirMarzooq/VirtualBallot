import { useState } from "react";
import { ShieldAlert, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminForgotPassword } from "../api";
import VBLoader from "../components/ui/VBLoader";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Reset Password</h1>
            <p className="text-slate-400 text-sm mt-1">
              We'll send a reset link to your org email
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 bg-green-900/30 border border-green-700/40 rounded-2xl p-5 text-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-green-300 font-bold text-sm">Check your inbox</p>
                  <p className="text-green-600 text-xs mt-1">
                    If <span className="text-green-400 font-mono">{email}</span> is registered,
                    a reset link has been sent. It expires in 1 hour.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/admin/login")}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Admin Email
                </label>
                <div className="flex items-center gap-2 bg-slate-800 border-2 border-slate-700 focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="admin@org.edu.ng"
                    autoFocus
                    className="w-full bg-transparent text-white outline-none text-sm placeholder:text-slate-600"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs font-bold mt-2">{error}</p>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!email.trim() || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Send Reset Link"}
              </button>

              <button
                onClick={() => navigate("/admin/login")}
                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
