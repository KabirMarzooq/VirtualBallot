import {
  BarChart3,
  Fingerprint,
  ArrowRight,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSlug } from "../context/SlugContext";
import CountdownWidget from "../components/ballot/CountdownWidget";
import VBLoader from "../components/ui/VBLoader";
import PageShell from "../components/layout/PageShell";
import { voterLogin } from "../api";

export default function LoginPage() {
  const slug = useSlug();
  const {
    electionConfig,
    branding,
    setCurrentUser,
    setElectionId,
    setOrgId,
    showAlert,
    appLoading,
    loadElectionForSlug,
  } = useApp();

  const [loginInput, setLoginInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load this org's election data when the page mounts
  useEffect(() => {
    if (slug) loadElectionForSlug(slug);
  }, [slug]);

  const handleLogin = async () => {
    const input = loginInput.trim().toUpperCase();
    if (!input) return;
    setLoading(true);
    try {
      const data = await voterLogin(input, slug);
      setCurrentUser({ ...data.voter, role: "voter" });
      setElectionId(data.electionId);
      setOrgId(data.orgId);
      navigate(`/vote/${slug}/otp`);
    } catch (err) {
      showAlert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (appLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center mt-40">
          <VBLoader size="lg" label="Loading election..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-md mx-auto mt-8 sm:mt-16">
        <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white">
          {/* Branding */}
          <div className="text-center mb-10">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.institutionName || "Logo"}
                className="w-24 h-24 rounded-3xl object-cover mx-auto mb-6 shadow-2xl border-4 border-white"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-4xl font-black text-white">
                  {branding.institutionName
                    ? branding.institutionName.slice(0, 2).toUpperCase()
                    : "VB"}
                </span>
              </div>
            )}
            {branding.institutionName && (
              <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">
                {branding.institutionName}
              </p>
            )}
            <h1 className="text-3xl font-black text-slate-800">
              {branding.electionName || "Virtual Ballot"}
            </h1>
            <p className="text-slate-500 text-lg mt-1">Your voice matters.</p>
          </div>

          <CountdownWidget electionConfig={electionConfig} />

          {electionConfig.status === "ENDED" && (
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-slate-500">
                Voting has closed. Results are being tallied.
              </p>
            </div>
          )}

          {/* Results button — always visible when active/ended, disabled until broadcast */}
          {(electionConfig.status === "ACTIVE" ||
            electionConfig.status === "ENDED") && (
            <div className="mb-6">
              <button
                onClick={() =>
                  electionConfig.isPublished &&
                  navigate(`/vote/${slug}/results`)
                }
                disabled={!electionConfig.isPublished}
                title={
                  !electionConfig.isPublished
                    ? "Results will appear here once the admin broadcasts them"
                    : ""
                }
                className={`w-full font-bold py-4 rounded-2xl border flex items-center justify-center gap-2 transition-colors ${
                  electionConfig.isPublished
                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                {electionConfig.isPublished
                  ? "View Live Results"
                  : "Results not yet broadcast"}
              </button>
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Or
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            </div>
          )}

          {/* Login form */}
          <div className="space-y-6">
            <div className="bg-slate-50 focus-within:bg-white p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">
                Matric Number
              </label>
              <div className="flex items-center gap-3">
                <Fingerprint className="text-slate-400 w-5 h-5 shrink-0" />
                <input
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && loginInput && handleLogin()
                  }
                  className="w-full bg-transparent text-lg font-bold text-slate-800 outline-none"
                  placeholder="U/25/..."
                  autoFocus
                />
              </div>
            </div>
            <button
              onClick={handleLogin}
              disabled={!loginInput || loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <VBLoader size="sm" />
              ) : (
                <>
                  {electionConfig.status === "NOT_STARTED"
                    ? "Check Status"
                    : "Start Voting"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            {electionConfig.registryLocked ? (
              <button
                disabled
                className="px-6 py-2 rounded-full bg-slate-100 text-slate-400 font-bold text-sm flex items-center gap-2 mx-auto cursor-not-allowed"
              >
                <Lock className="w-4 h-4" /> Registration Closed
              </button>
            ) : (
              <button
                onClick={() => navigate(`/vote/${slug}/register`)}
                className="px-6 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Activate Account
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate("/admin/login")}
          className="flex items-center gap-2 mx-auto mt-6 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Electoral Commission Portal
        </button>
      </div>
    </PageShell>
  );
}
