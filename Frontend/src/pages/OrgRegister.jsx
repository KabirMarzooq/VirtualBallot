import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import { registerOrg, checkSlugAvailable } from "../api";
import { isValidEmail } from "../utils";

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
    if (!isValidEmail(form.adminEmail.trim())) { setError("Please enter a valid email address."); return; }
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

  const pwMismatch =
    !!form.confirmPassword && form.password !== form.confirmPassword;
  const pwMatch =
    !!form.confirmPassword && form.password === form.confirmPassword;

  const wrapBase =
    "flex items-center gap-2.5 min-h-[48px] px-3.5 bg-white border rounded-lg transition-all";
  const wrapNeutral =
    "border-slate-300 focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-100";
  const bareInput =
    "flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400";

  return (
    <AuthBackground>
      <div className="w-full max-w-[420px] text-slate-800 py-6">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7">
          {/* Header */}
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white text-[15px] font-bold">
            VB
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-slate-900 text-center mt-3.5">
            Register your organization
          </h1>
          <p className="text-[13px] leading-5 text-slate-600 text-center mt-1">
            Set up your Virtual Ballot account in two steps
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-center mt-5">
            <div className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                  step === 2
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-blue-600 text-blue-700"
                }`}
              >
                {step === 2 ? <Check className="w-3.5 h-3.5" strokeWidth={2.6} /> : "1"}
              </div>
              <span className="text-[11px] font-semibold text-slate-800 ml-2 mr-3">
                Organization
              </span>
              <span
                className={`w-9 h-0.5 mr-3 ${
                  step === 2 ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            </div>
            <div className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                  step === 2
                    ? "bg-white border-blue-600 text-blue-700"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                2
              </div>
              <span
                className={`text-[11px] font-semibold ml-2 ${
                  step === 2 ? "text-slate-800" : "text-slate-400"
                }`}
              >
                Admin account
              </span>
            </div>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Organization name
                </label>
                <div className={`${wrapBase} ${wrapNeutral}`}>
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    value={form.orgName}
                    onChange={set("orgName")}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    placeholder="e.g. University of Nigeria Engineering Students"
                    className={bareInput}
                    autoFocus
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Your voting URL
                </label>
                <div
                  className={`${wrapBase} ${
                    slugStatus === "taken"
                      ? "border-red-500 bg-red-50"
                      : slugStatus === "available"
                      ? "border-green-600 bg-green-50"
                      : wrapNeutral
                  }`}
                >
                  <span className="font-mono text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {window.location.host}/vote/
                  </span>
                  <input
                    value={form.slug}
                    onChange={set("slug")}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    placeholder="your-org"
                    className={`${bareInput} font-mono font-semibold ${
                      slugStatus === "taken" ? "text-red-600" : ""
                    }`}
                  />
                  <span className="shrink-0">
                    {slugStatus === "checking" && <VBLoader size="sm" />}
                    {slugStatus === "available" && (
                      <Check className="w-4 h-4 text-green-600" strokeWidth={2.4} />
                    )}
                    {slugStatus === "taken" && (
                      <X className="w-4 h-4 text-red-600" strokeWidth={2.4} />
                    )}
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-4 font-medium mt-1.5 ${
                    slugStatus === "taken"
                      ? "text-red-600"
                      : slugStatus === "available"
                      ? "text-green-600"
                      : "text-slate-400"
                  }`}
                >
                  {slugStatus === "taken" &&
                    "This URL is already taken — try adding your school or year, e.g. student-union-unn."}
                  {slugStatus === "available" && "✓ This URL is available"}
                  {slugStatus === "checking" && "Checking availability…"}
                  {!slugStatus &&
                    "Voters will use this URL to access your election."}
                </p>
              </div>

              {/* URL preview */}
              {form.slug && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3 mt-4">
                  <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    VB
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-[0.1em]">
                      Your voter URL
                    </p>
                    <p className="font-mono text-xs text-slate-800 truncate mt-0.5">
                      {window.location.origin}/vote/{form.slug || "your-org"}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-3">
                  {error}
                </p>
              )}

              <button
                onClick={nextStep}
                disabled={
                  !form.orgName ||
                  !form.slug ||
                  slugStatus === "taken" ||
                  slugStatus === "checking"
                }
                title="Proceed to admin account setup"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                Continue
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Admin email
                </label>
                <div className={`${wrapBase} ${wrapNeutral}`}>
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={set("adminEmail")}
                    placeholder="admin@yourorg.edu.ng"
                    className={bareInput}
                    autoFocus
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Password
                </label>
                <div className={`${wrapBase} ${wrapNeutral}`}>
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder="••••••••"
                    className={bareInput}
                  />
                </div>
                <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
                  Minimum 8 characters.
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Confirm password
                </label>
                <div
                  className={`${wrapBase} ${
                    pwMismatch
                      ? "border-red-500 bg-red-50"
                      : pwMatch
                      ? "border-green-600 bg-green-50"
                      : wrapNeutral
                  }`}
                >
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Repeat your password"
                    className={bareInput}
                  />
                  {pwMatch && (
                    <Check className="w-4 h-4 text-green-600 shrink-0" strokeWidth={2.4} />
                  )}
                </div>
                {pwMismatch && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 mt-1.5">
                    Passwords don't match yet.
                  </p>
                )}
                {pwMatch && (
                  <p className="text-[11px] leading-4 font-medium text-green-600 mt-1.5">
                    ✓ Passwords match
                  </p>
                )}
              </div>

              {error && (
                <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-3">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !form.adminEmail ||
                  !form.password ||
                  !form.confirmPassword
                }
                title="Create your organization account"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Create organization account →"}
              </button>

              <p className="text-[11px] leading-4 text-slate-400 text-center mt-2.5">
                By creating an account, you agree to our{" "}
                <button
                  onClick={() => navigate("/terms")}
                  className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"
                >
                  Terms of Use
                </button>{" "}
                and{" "}
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>

              <button
                onClick={() => { setStep(1); setError(""); }}
                title="Go back to organization details"
                className="w-full mt-2 min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[13px] font-semibold rounded-lg transition-all cursor-pointer"
              >
                ← Back to organization details
              </button>
            </>
          )}
        </div>

        {/* Foot links */}
        <p className="text-center text-[13px] text-slate-600 mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/admin/login")}
            title="Sign in to your admin console"
            className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer transition-colors"
          >
            Sign in
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
