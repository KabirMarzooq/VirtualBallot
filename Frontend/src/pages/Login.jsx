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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <VBLoader size="lg" label="Loading election..." />
      </div>
    );
  }

  const ended = electionConfig.status === "ENDED";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-[420px]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-8 sm:px-7">
          {/* Branding */}
          <div className="text-center">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.institutionName || "Logo"}
                className="w-12 h-12 rounded-xl object-cover mx-auto shadow-sm"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-lg font-bold text-white tracking-tight">
                  {branding.institutionName ? branding.institutionName.slice(0, 2).toUpperCase() : "VB"}
                </span>
              </div>
            )}
            {branding.institutionName && (
              <p className="text-[11px] leading-4 font-semibold text-blue-600 uppercase tracking-[0.1em] mt-4">
                {branding.institutionName}
              </p>
            )}
            <h1 className="text-[28px] leading-9 font-semibold text-slate-900 mt-1">
              {branding.electionName || "Virtual Ballot"}
            </h1>
            <p className="text-[13px] leading-5 text-slate-400 mt-1">Your vote matters.</p>
          </div>

          <div className="mt-6">
            <CountdownWidget electionConfig={electionConfig} />
          </div>

          {/* Ended notice */}
          {ended && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                Voting has closed
              </p>
              <p className="text-base text-slate-400 font-medium mt-1">
                {electionConfig.isPublished
                  ? "Official results are out"
                  : "Results are being tallied"}
              </p>
            </div>
          )}

          {/* Results button */}
          {(electionConfig.status === "ACTIVE" || ended) && electionConfig.isPublished && (
            <button
              onClick={() => navigate(`/vote/${slug}/results`)}
              title="View official election results"
              className="w-full mt-6 min-h-[48px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              {ended ? "View official results" : "View live results"}
            </button>
          )}

          {/* Login form — hidden once voting has ended */}
          {!ended && (
            <>
              <div className="mt-6">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Matric number
                </label>
                <div className="relative">
                  <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loginInput && handleLogin()}
                    className="w-full min-h-[48px] text-sm text-slate-800 bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-3 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                    placeholder="U/25/0412"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!loginInput || loading}
                title="Verify matric number and proceed to vote"
                className="w-full mt-4 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    {electionConfig.status === "NOT_STARTED" ? "Check status" : "Start voting"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              {/* Divider + activation */}
              <div className="flex items-center gap-3 mt-7">
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-medium text-slate-400">New to Virtual Ballot?</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              {electionConfig.registryLocked ? (
                <div
                  title="The registry is locked — registration has closed"
                  className="w-full mt-2 min-h-[44px] text-slate-400 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" /> Registration closed
                </div>
              ) : (
                <button
                  onClick={() => navigate(`/vote/${slug}/register`)}
                  title="Activate your voter account"
                  className="w-full mt-2 min-h-[44px] text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer"
                >
                  Activate your account
                </button>
              )}
            </>
          )}
        </div>

        {/* Foot link */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="min-h-[44px] px-3 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3" /> Virtual Ballot Home
          </button>
        </div>
      </div>
    </div>
  );
}
