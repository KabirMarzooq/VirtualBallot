import { BarChart3, Fingerprint, ArrowRight, Lock, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSlug } from "../context/SlugContext";
import CountdownWidget from "../components/ballot/CountdownWidget";
import VBLoader from "../components/ui/VBLoader";
import { voterLogin } from "../api";

export default function LoginPage() {
  const slug = useSlug();
  const {
    electionConfig, branding,
    setCurrentUser, setElectionId, setOrgId,
    showAlert, appLoading, loadElectionForSlug,
  } = useApp();

  const [loginInput, setLoginInput] = useState("");
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (slug) loadElectionForSlug(slug); }, [slug]);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <VBLoader size="lg" label="Loading election..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 sm:p-10">
          {/* Branding */}
          <div className="text-center mb-10">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.institutionName || "Logo"}
                className="w-24 h-24 rounded-3xl object-cover mx-auto mb-6 shadow-2xl border-4 border-slate-800"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-4xl font-black text-white">
                  {branding.institutionName ? branding.institutionName.slice(0, 2).toUpperCase() : "VB"}
                </span>
              </div>
            )}
            {branding.institutionName && (
              <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">
                {branding.institutionName}
              </p>
            )}
            <h1 className="text-3xl font-black text-white">
              {branding.electionName || "Virtual Ballot"}
            </h1>
            <p className="text-slate-500 text-lg mt-1">Your voice matters.</p>
          </div>

          <CountdownWidget electionConfig={electionConfig} />

          {electionConfig.status === "ENDED" && (
            <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-slate-400">
                Voting has closed. Results are being tallied.
              </p>
            </div>
          )}

          {/* Results button */}
          {(electionConfig.status === "ACTIVE" || electionConfig.status === "ENDED") && (
            <div className="mb-6">
              <button
                onClick={() => electionConfig.isPublished && navigate(`/vote/${slug}/results`)}
                disabled={!electionConfig.isPublished}
                title={!electionConfig.isPublished ? "Results will appear here once the admin broadcasts them" : "View live election results"}
                className={`w-full font-bold py-4 rounded-2xl border flex items-center justify-center gap-2 transition-colors ${
                  electionConfig.isPublished
                    ? "bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30 cursor-pointer"
                    : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                {electionConfig.isPublished ? "View Live Results" : "Results not yet broadcast"}
              </button>
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-xs font-bold text-slate-600 uppercase">Or</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>
            </div>
          )}

          {/* Login form */}
          <div className="space-y-5">
            <div className="bg-slate-800 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                Matric Number
              </label>
              <div className="flex items-center gap-3">
                <Fingerprint className="text-slate-500 w-5 h-5 shrink-0" />
                <input
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loginInput && handleLogin()}
                  className="w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600"
                  placeholder="U/25/..."
                  autoFocus
                />
              </div>
            </div>
            <button
              onClick={handleLogin}
              disabled={!loginInput || loading}
              title="Verify matric number and proceed to vote"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <VBLoader size="sm" />
              ) : (
                <>
                  {electionConfig.status === "NOT_STARTED" ? "Check Status" : "Start Voting"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            {electionConfig.registryLocked ? (
              <button
                disabled
                className="px-6 py-2 rounded-full bg-slate-800 text-slate-500 font-bold text-sm flex items-center gap-2 mx-auto cursor-not-allowed"
              >
                <Lock className="w-4 h-4" /> Registration Closed
              </button>
            ) : (
              <button
                onClick={() => navigate(`/vote/${slug}/register`)}
                title="Activate your voter account"
                className="px-6 py-2 rounded-full bg-blue-600/20 text-blue-400 font-bold text-sm hover:bg-blue-600/30 transition-colors cursor-pointer border border-blue-600/20"
              >
                Activate Account
              </button>
            )}
          </div>
        </div>

        <p className="text-center mt-3">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="text-slate-600 hover:text-slate-400 text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3" /> Virtual Ballot Home
          </button>
        </p>
      </div>
    </div>
  );
}
