import { useState } from "react";
import { ShieldAlert, Lock, Telescope, Mail, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import { adminLogin, fetchAdminOverview } from "../api";
import { isValidEmail } from "../utils";

export default function AdminLoginPage() {
  const {
    setCurrentUser,
    setAccessToken,
    setElectionId,
    setOrgId,
    setOrgSlug,
    setUsers,
    setCandidates,
    setActivityLog,
    setElectionConfig,
    setBranding,
    addLog,
  } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const justRegistered = location.state?.registered;

  const submit = async () => {
    if (!email || !password) return;
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    try {
      // 1. Login — get token
      const loginData = await adminLogin(email.trim().toLowerCase(), password);
      const token = loginData.accessToken;
      setAccessToken(token);
      sessionStorage.setItem("vb_admin_refresh", loginData.refreshToken);
      setElectionId(loginData.electionId);
      setOrgId(loginData.org.id);
      setOrgSlug(loginData.org.slug);

      // 2. Fetch full admin overview in one call
      const overview = await fetchAdminOverview(token, loginData.org.slug);

      // 3. Hydrate context with real DB data
      setElectionConfig({
        status: overview.election.status,
        isPublished: overview.election.isPublished,
        registryLocked: overview.election.registryLocked,
        showCountdown: overview.election.showCountdown,
        endsAt: overview.election.endsAt,
        votingMode: overview.election.votingMode || "CLOSED",
        fraudTier: overview.election.fraudTier || "EMAIL",
        voteType: overview.election.voteType || "STANDARD",
        pricingModel: overview.election.pricingModel || "FIXED",
        pricePerVote: overview.election.pricePerVote || 0,
        voteBundles: overview.election.voteBundles || [],
      });
      setBranding({
        electionName: overview.election.name,
        institutionName: loginData.org.name,
        logoUrl: loginData.org.logo_url || "",
      });
      // Map backend shape → frontend shape
      setCandidates(
        overview.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          image: c.image_url,
          manifesto: c.manifesto || "",
          color: c.color,
          votes: c.vote_count,
        }))
      );
      setUsers(
        overview.voters.map((v) => ({
          id: v.id,
          matric: v.matric,
          name: v.name,
          email: v.email,
          hasVoted: v.has_voted,
          votedAt: v.voted_at,
          role: "STUDENT",
        }))
      );
      setActivityLog(
        overview.auditLog.map((e) => ({
          id: e.id,
          type: e.event_type,
          message: e.message,
          timestamp: new Date(e.created_at).toLocaleTimeString(),
          date: new Date(e.created_at).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          }),
          iso: e.created_at,
        }))
      );

      setCurrentUser({
        email: email,
        role: "ADMIN",
        name: "Admin",
      });
      addLog("Admin authenticated and entered console", "admin");
      navigate("/admin");
    } catch (err) {
      setError(err.message);
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  // Shared field chrome — mirrors the Organization registration screen.
  const wrapBase =
    "flex items-center gap-2.5 bg-white border rounded-lg px-3.5 min-h-[48px] transition-all";
  const wrapNeutral =
    "border-slate-300 focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-100";
  const bareInput =
    "flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400";

  return (
    <AuthBackground>
      <div className="w-full max-w-[420px] text-slate-800 py-6">
        {/* Just-registered success banner */}
        {justRegistered && (
          <div className="bg-green-50 border border-green-600/30 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle
                className="w-4 h-4 text-green-600 shrink-0 mt-0.5"
                strokeWidth={2.4}
              />
              <div>
                <p className="text-[13px] leading-5 font-semibold text-green-600">
                  Organization registered
                </p>
                <p className="text-[11px] leading-4 text-slate-600 mt-0.5">
                  Sign in to access your dashboard.
                </p>
              </div>
            </div>
            {location.state?.slug && (
              <div className="flex items-center gap-3 bg-white border border-green-600/30 rounded-lg px-3 py-2 mt-2.5">
                <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  VB
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-[0.1em]">
                    Your voter URL
                  </p>
                  <p className="font-mono text-xs text-slate-800 break-all mt-0.5">
                    {window.location.origin}/vote/{location.state.slug}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className={`bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7 ${
            shake ? "vb-shake" : ""
          }`}
        >
          {/* Crest */}
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-slate-900 text-center mt-3.5">
            Commission Portal
          </h1>
          <p className="text-[13px] leading-5 text-slate-600 text-center mt-1">
            Electoral officers only
          </p>

          {/* Email */}
          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Email
            </label>
            <div className={`${wrapBase} ${wrapNeutral}`}>
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="admin@org.edu.ng"
                autoFocus
                className={bareInput}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mt-4">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Password
            </label>
            <div
              className={`${wrapBase} ${
                error ? "border-red-500 bg-red-50" : wrapNeutral
              }`}
            >
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••"
                className={`${bareInput} ${error ? "text-red-600" : ""}`}
              />
            </div>
            {error && (
              <p className="text-[11px] leading-4 font-medium text-red-600 mt-1.5">
                {error}
              </p>
            )}
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={() => navigate("/admin/forgot-password")}
                title="Reset your admin password"
                className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!email || !password || loading}
            title="Sign in to the commission console"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <VBLoader size="sm" /> Signing in…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Authenticate
              </>
            )}
          </button>

          {/* Observer access — temporarily unavailable */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col items-center">
            <button
              onClick={() => navigate("/observer/login")}
              title="Observer access is temporarily unavailable"
              disabled={true}
              className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 rounded-lg flex items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <Telescope className="w-3.5 h-3.5" /> Observer / Scrutineer access
            </button>
            <p className="text-[10px] leading-4 text-slate-400 -mt-1">
              Observer access is temporarily unavailable
            </p>
          </div>
        </div>

        {/* Foot links */}
        <p className="text-center text-[13px] text-slate-600 mt-4">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => navigate("/org/register")}
            title="Register your organization"
            className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer transition-colors"
          >
            Register your organization
          </button>
        </p>
        <div className="flex justify-center mt-1">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="min-h-[44px] px-3 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3" /> Virtual Ballot Home
          </button>
        </div>
      </div>
    </AuthBackground>
  );
}
