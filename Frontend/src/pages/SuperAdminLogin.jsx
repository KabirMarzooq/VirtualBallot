import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Eye, EyeOff } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import VBLoader from "../components/ui/VBLoader";
import { superadminLogin } from "../api";

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !secret) return setError("Both fields are required");
    setLoading(true);
    setError("");
    try {
      const data = await superadminLogin(email.trim(), secret);
      // Store token in sessionStorage — superadmin sessions don't persist
      sessionStorage.setItem("sa_token", data.accessToken);
      navigate("/superadmin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-sm mx-auto">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-900/40">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Platform Admin</h1>
            <p className="text-slate-500 text-sm mt-1">Internal access only</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 text-white rounded-xl px-4 py-3 outline-none text-sm transition-colors"
                placeholder="superadmin@virtualballot.app"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 text-white rounded-xl px-4 py-3 pr-11 outline-none text-sm transition-colors font-mono"
                  placeholder="Your secret key from .env"
                />
                <button
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-bold text-center">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !email || !secret}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? <VBLoader size="sm" /> : "Access Platform Console"}
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full mt-6 text-slate-600 hover:text-slate-400 text-sm font-bold text-center transition-colors cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Deliberately subtle — not meant to be found easily */}
        <p className="text-center text-xs text-slate-800 mt-4 select-none">
          Platform administration portal
        </p>
      </div>
    </PageShell>
  );
}
