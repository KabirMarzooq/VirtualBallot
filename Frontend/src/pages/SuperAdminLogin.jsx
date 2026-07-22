import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Eye, EyeOff } from "lucide-react";
import AuthBackground from "../components/layout/AuthBackground";
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
    <AuthBackground variant="dark">
      <div className="w-full max-w-[360px]">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:px-7">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
            <Terminal className="w-7 h-7" />
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-white text-center mt-4">
            Platform Admin
          </h1>
          <p className="text-[13px] leading-5 text-slate-400 text-center mt-1">
            Internal access only
          </p>

          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              className="w-full min-h-[48px] text-sm text-white bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25 transition-all"
              placeholder="superadmin@virtualballot.app"
            />
          </div>

          <div className="mt-4">
            <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
              Secret key
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={secret}
                onChange={(e) => { setSecret(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full min-h-[48px] text-sm font-mono text-white bg-slate-900 border border-slate-600 rounded-lg px-4 pr-11 py-3 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25 transition-all"
                placeholder="Your secret key from .env"
              />
              <button
                onClick={() => setShow((v) => !v)}
                title={show ? "Hide secret key" : "Show secret key"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[11px] leading-4 font-medium text-red-400 text-center mt-3">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !secret}
            title="Sign in to the platform console"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? <VBLoader size="sm" /> : "Access platform console"}
          </button>

          <div className="mt-5 pt-4 border-t border-slate-700 text-center">
            <button
              onClick={() => navigate("/")}
              title="Back to Virtual Ballot home"
              className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-400/10 rounded-lg transition-all cursor-pointer"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Deliberately subtle — not meant to be found easily */}
        <p className="text-center text-[11px] text-slate-300/40 mt-4 select-none">
          Platform administration portal
        </p>
      </div>
    </AuthBackground>
  );
}
