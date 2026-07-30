import { useState, useEffect } from "react";
import { Telescope, ShieldCheck, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import { observerLogin, fetchElection, ORG_SLUG } from "../api";

export default function ObserverLoginPage() {
  const { setAccessToken, setElectionId, addLog } = useApp();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || ORG_SLUG;
  const [branding, setBranding] = useState(null);

  // The org slug is known up front (from the invite link), so we can show
  // its real branding before the observer even authenticates.
  useEffect(() => {
    let active = true;
    fetchElection(slug)
      .then((data) => active && setBranding(data.branding))
      .catch(() => active && setBranding(null));
    return () => { active = false; };
  }, [slug]);

  const submit = async () => {
    if (!pin) return;
    setLoading(true);
    setError("");
    try {
      const data = await observerLogin(pin, slug);
      setAccessToken(data.accessToken);
      sessionStorage.setItem("vb_observer_token", data.accessToken);
      sessionStorage.setItem("vb_observer_slug", slug);
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
    <AuthBackground>
      <div className="w-full max-w-[360px] text-slate-800">
        <div
          className={`bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7 ${
            shake ? "vb-shake" : ""
          }`}
        >
          {/* Crest */}
          <div className="text-center">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.institutionName || "Logo"}
                className="w-14 h-14 rounded-xl object-cover mx-auto shadow-sm"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
                <Telescope className="w-7 h-7" />
              </div>
            )}
            {branding?.institutionName && (
              <p className="text-[11px] leading-4 font-semibold text-blue-600 uppercase tracking-[0.1em] mt-4">
                {branding.institutionName}
              </p>
            )}
            <h1 className={`text-[22px] leading-7 font-semibold text-slate-900 text-center ${branding?.institutionName ? "mt-1" : "mt-4"}`}>
              Observer Portal
            </h1>
            <p className="text-[13px] leading-5 text-slate-600 text-center mt-1">
              Accredited scrutineers only
            </p>
          </div>

          {/* Read-only role note */}
          <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 mt-5">
            <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-4 text-slate-600">
              Read-only access — you can watch the live tally, vote ledger, and
              audit stream, but nothing can be changed from this portal.
            </p>
          </div>

          {/* PIN */}
          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
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
              maxLength={8}
              autoFocus
              placeholder="••••"
              className={`w-full min-h-[56px] font-mono text-[26px] font-semibold text-center tracking-[0.5em] indent-[0.5em] bg-white border rounded-xl outline-none transition-all placeholder:text-slate-300 ${
                error
                  ? "border-red-500 text-red-600"
                  : "border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100"
              }`}
            />
            {error ? (
              <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-2">
                {error}
              </p>
            ) : (
              <p className="text-[11px] leading-4 text-slate-400 text-center mt-2">
                Your electoral commission shares this PIN with accredited
                observers.
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!pin || loading}
            title="Authenticate as observer"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <VBLoader size="sm" /> Verifying…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Enter as observer
              </>
            )}
          </button>

          {/* Foot link */}
          <div className="mt-5 pt-4 border-t border-slate-200 text-center">
            <button
              onClick={() => navigate("/admin/login")}
              title="Back to admin commission portal"
              className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              ← Back to commission portal
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
