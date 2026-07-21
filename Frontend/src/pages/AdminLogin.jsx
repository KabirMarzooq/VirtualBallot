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

  return (
    <AuthBackground variant="dark">
      <div className="w-full max-w-[360px]">
        {/* Just-registered success banner */}
        {justRegistered && (
          <div className="bg-green-800/20 border border-green-600/40 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle
                className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
                strokeWidth={2.4}
              />
              <div>
                <p className="text-[13px] leading-5 font-semibold text-green-400">
                  Organization registered
                </p>
                <p className="text-[11px] leading-4 text-slate-400 mt-0.5">
                  Sign in to access your dashboard.
                </p>
              </div>
            </div>
            {location.state?.slug && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 mt-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-0.5">
                  Your voter URL
                </p>
                <p className="text-[11px] font-mono text-blue-400 break-all">
                  {window.location.origin}/vote/{location.state.slug}
                </p>
              </div>
            )}
          </div>
        )}

        <div
          className={`bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:px-7 ${
            shake ? "vb-shake" : ""
          }`}
        >
          {/* Crest */}
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-white text-center mt-4">
            Commission Portal
          </h1>
          <p className="text-[13px] leading-5 text-slate-400 text-center mt-1">
            Electoral officers only
          </p>

          {/* Email */}
          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                className="w-full min-h-[48px] text-sm text-white bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              className={`w-full min-h-[48px] text-sm font-mono tracking-[0.3em] bg-slate-900 border rounded-lg px-4 py-3 outline-none transition-all placeholder:text-slate-600 ${
                error
                  ? "border-red-500 text-red-400"
                  : "border-slate-600 text-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25"
              }`}
            />
            {error && (
              <p className="text-[11px] leading-4 font-medium text-red-400 mt-2">
                {error}
              </p>
            )}
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={() => navigate("/admin/forgot-password")}
                title="Reset your admin password"
                className="text-[11px] font-semibold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!email || !password || loading}
            title="Sign in to the commission console"
            className={`w-full mt-5 min-h-[48px] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-white ${
              loading
                ? "bg-blue-600"
                : "bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
            }`}
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

          {/* Footer links */}
          <div className="mt-5 pt-4 border-t border-slate-700 flex flex-col items-center gap-1">
            <button
              onClick={() => navigate("/")}
              title="Back to Virtual Ballot home"
              className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-400/10 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3" /> Virtual Ballot Home
            </button>
            <button
              onClick={() => navigate("/observer/login")}
              title="Observer access is temporarily unavailable"
              disabled={true}
              className="min-h-[44px] px-4 text-[11px] font-semibold text-slate-500 rounded-lg flex items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <Telescope className="w-3.5 h-3.5" /> Observer / Scrutineer access
            </button>
            <p className="text-[10px] leading-4 text-slate-400 -mt-1">
              Observer access is temporarily unavailable
            </p>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
