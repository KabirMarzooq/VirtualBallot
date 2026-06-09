import { useState } from "react";
import { Telescope, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import VBLoader from "../components/ui/VBLoader";
import { observerLogin, ORG_SLUG } from "../api";

export default function ObserverLoginPage() {
  const { setAccessToken, setElectionId, addLog } = useApp();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || ORG_SLUG;

  const submit = async () => {
    if (!pin) return;
    setLoading(true);
    setError("");
    try {
      const data = await observerLogin(pin, slug);
      setAccessToken(data.accessToken);
      setElectionId(data.electionId);
      addLog("Observer authenticated and entered dashboard", "admin");
      navigate(`/observer?slug=${slug}`);
    } catch (err) {
      setError(err.message);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div
          className={`bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-teal-900/60 transition-transform ${
            shake ? "animate-bounce" : ""
          }`}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-teal-900/40">
              <Telescope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Observer Portal</h1>
            <p className="text-slate-400 text-sm mt-1">
              Accredited scrutineers only
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                Observer PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && pin && submit()}
                maxLength={6}
                autoFocus
                placeholder="••••"
                className={`w-full bg-slate-800 text-white text-center text-3xl font-mono tracking-[0.5em] py-5 rounded-2xl border-2 outline-none transition-all placeholder:text-slate-700 ${
                  error
                    ? "border-red-500 text-red-400"
                    : "border-slate-700 focus:border-teal-500"
                }`}
              />
              {error && (
                <p className="text-red-400 text-xs font-bold text-center mt-2">
                  {error}
                </p>
              )}
            </div>
            <button
              onClick={submit}
              disabled={!pin || loading}
              title="Authenticate as observer"
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <VBLoader size="sm" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Enter as Observer
                </>
              )}
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate("/admin/login")}
              title="Back to admin commission portal"
              className="text-slate-600 hover:text-slate-400 text-sm font-bold transition-colors cursor-pointer"
            >
              ← Back to commission portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
