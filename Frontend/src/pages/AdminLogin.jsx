import { useState } from "react";
import { ShieldAlert, Lock, Telescope, Mail, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import VBLoader from "../components/ui/VBLoader";
import { adminLogin, fetchAdminOverview } from "../api";

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
    setLoading(true);
    setError("");
    try {
      // 1. Login — get token
      const loginData = await adminLogin(email.trim().toLowerCase(), password);
      const token = loginData.accessToken;
      setAccessToken(token);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {justRegistered && (
          <div className="mb-5 p-4 bg-green-900/30 border border-green-700/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-green-300 text-sm font-bold">
                  Organization registered!
                </p>
                <p className="text-green-600 text-xs">
                  Sign in to access your dashboard.
                </p>
              </div>
            </div>
            {location.state?.slug && (
              <div className="bg-slate-900/60 rounded-xl px-3 py-2 mt-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                  Your voter URL
                </p>
                <p className="text-xs font-mono text-blue-400 break-all">
                  {window.location.origin}/vote/{location.state.slug}
                </p>
              </div>
            )}
          </div>
        )}
        <div
          className={`bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 transition-transform ${
            shake ? "animate-bounce" : ""
          }`}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">
              Commission Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Electoral officers only
            </p>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="flex items-center gap-2 bg-slate-800 border-2 border-slate-700 focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
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
                  className="w-full bg-transparent text-white outline-none text-sm placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
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
                className={`w-full bg-slate-800 text-white text-center text-xl font-mono tracking-[0.3em] py-4 rounded-xl border-2 outline-none transition-all placeholder:text-slate-700 ${
                  error
                    ? "border-red-500 text-red-400"
                    : "border-slate-700 focus:border-blue-500"
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
              disabled={!email || !password || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <VBLoader size="sm" />
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Authenticate
                </>
              )}
            </button>
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

          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate("/observer/login")}
              title="Observer / Scrutineer access"
              disabled={true}
              className="text-teal-600 hover:text-teal-400 text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Telescope className="w-3.5 h-3.5" /> Observer / Scrutineer Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
