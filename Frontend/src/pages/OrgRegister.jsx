import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Mail, Lock, Link, CheckCircle, XCircle, ArrowRight, ShieldAlert,
} from "lucide-react";
import VBLoader from "../components/ui/VBLoader";
import { registerOrg, checkSlugAvailable } from "../api";

const toSlug = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 30);

export default function OrgRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    orgName: "", slug: "", adminEmail: "", password: "", confirmPassword: "",
  });
  const [slugEdited, setSlugEdited]   = useState(false);
  const [slugStatus, setSlugStatus]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [step, setStep]               = useState(1);

  useEffect(() => {
    if (!slugEdited && form.orgName) setForm((f) => ({ ...f, slug: toSlug(f.orgName) }));
  }, [form.orgName, slugEdited]);

  useEffect(() => {
    if (!form.slug || form.slug.length < 3) { setSlugStatus(null); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const available = await checkSlugAvailable(form.slug);
      setSlugStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug]);

  const set = (key) => (e) => {
    setError("");
    if (key === "slug") setSlugEdited(true);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const nextStep = () => {
    if (!form.orgName.trim()) return setError("Organization name is required");
    if (!form.slug.trim())    return setError("URL slug is required");
    if (slugStatus === "taken")    return setError("This URL is already taken — choose a different one");
    if (slugStatus === "checking") return setError("Still checking availability — please wait a moment");
    setError(""); setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.adminEmail.trim())     return setError("Admin email is required");
    if (!form.password)              return setError("Password is required");
    if (form.password.length < 8)    return setError("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match");
    setLoading(true); setError("");
    try {
      await registerOrg(form);
      navigate("/admin/login", { state: { registered: true, email: form.adminEmail, slug: form.slug } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const baseUrl  = window.location.origin;
  const voteUrl  = `${baseUrl}/vote/${form.slug || "your-org"}`;

  const inputCls = "bg-slate-800 border-2 border-transparent focus-within:border-blue-500 rounded-2xl p-4 transition-all";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/20">
            <span className="text-2xl font-black text-white">VB</span>
          </div>
          <h1 className="text-3xl font-black text-white">Register your organization</h1>
          <p className="text-slate-500 mt-2">Set up your Virtual Ballot account in two steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6 px-2">
          {["Organization details", "Admin credentials"].map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                    i + 1 < step
                      ? "bg-blue-600 border-blue-600 text-white"
                      : i + 1 === step
                      ? "bg-slate-900 border-blue-500 text-blue-400"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[11px] mt-1 font-bold text-center ${i + 1 <= step ? "text-blue-400" : "text-slate-600"}`}>
                  {label}
                </span>
              </div>
              {i === 0 && (
                <div className={`h-0.5 w-10 mb-5 mx-1 transition-colors ${step === 2 ? "bg-blue-500" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Organization Name
                </label>
                <div className={`flex items-center gap-3 ${inputCls}`}>
                  <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    value={form.orgName}
                    onChange={set("orgName")}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    placeholder="e.g. University of Nigeria Engineering Students"
                    className="w-full bg-transparent outline-none font-semibold text-white placeholder:font-normal placeholder:text-slate-600"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Your Voting URL
                </label>
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    slugStatus === "taken"
                      ? "bg-red-950/30 border-red-500/50"
                      : slugStatus === "available"
                      ? "bg-green-950/30 border-green-500/50"
                      : "bg-slate-800 border-transparent focus-within:border-blue-500"
                  }`}
                >
                  <Link className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-slate-500 text-sm font-medium whitespace-nowrap shrink-0">
                      {window.location.host}/vote/
                    </span>
                    <input
                      value={form.slug}
                      onChange={set("slug")}
                      onKeyDown={(e) => e.key === "Enter" && nextStep()}
                      placeholder="your-org"
                      className="flex-1 bg-transparent outline-none font-bold text-white min-w-0"
                    />
                  </div>
                  <div className="shrink-0">
                    {slugStatus === "checking"  && <VBLoader size="sm" />}
                    {slugStatus === "available" && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {slugStatus === "taken"     && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                </div>
                <p className={`text-xs mt-1.5 ml-1 font-medium ${
                  slugStatus === "taken" ? "text-red-400" : slugStatus === "available" ? "text-green-400" : "text-slate-600"
                }`}>
                  {slugStatus === "taken"     && "This URL is already taken"}
                  {slugStatus === "available" && "✓ This URL is available"}
                  {!slugStatus               && "Voters will use this URL to access your election"}
                </p>
              </div>

              {/* URL preview */}
              {form.slug && (
                <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3 border border-slate-700">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-black">VB</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Your voter URL</p>
                    <p className="text-sm font-mono text-blue-400 truncate">{voteUrl}</p>
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}

              <button
                onClick={nextStep}
                disabled={!form.orgName || !form.slug || slugStatus === "taken" || slugStatus === "checking"}
                title="Proceed to admin credentials setup"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 group disabled:opacity-50 transition-colors cursor-pointer"
              >
                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Email</label>
                <div className={`flex items-center gap-3 ${inputCls}`}>
                  <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={set("adminEmail")}
                    placeholder="admin@yourorg.edu.ng"
                    className="w-full bg-transparent outline-none font-semibold text-white placeholder:font-normal placeholder:text-slate-600"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <div className={`flex items-center gap-3 ${inputCls}`}>
                  <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-transparent outline-none font-semibold text-white placeholder:font-normal placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm Password</label>
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? "bg-red-950/30 border-red-500/50"
                      : form.confirmPassword && form.password === form.confirmPassword
                      ? "bg-green-950/30 border-green-500/50"
                      : "bg-slate-800 border-transparent focus-within:border-blue-500"
                  }`}
                >
                  <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Repeat your password"
                    className="w-full bg-transparent outline-none font-semibold text-white placeholder:font-normal placeholder:text-slate-600"
                  />
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  )}
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading || !form.adminEmail || !form.password || !form.confirmPassword}
                title="Create your organization account"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Create Organization Account →"}
              </button>

              <button
                onClick={() => { setStep(1); setError(""); }}
                title="Go back to organization details"
                className="w-full text-slate-500 text-sm font-bold hover:text-slate-300 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/admin/login")}
            title="Sign in to your admin console"
            className="text-blue-400 font-bold hover:text-blue-300 cursor-pointer transition-colors"
          >
            Sign in
          </button>
        </p>

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
