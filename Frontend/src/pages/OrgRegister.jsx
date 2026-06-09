import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Link,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import PageShell from "../components/layout/PageShell";
import VBLoader from "../components/ui/VBLoader";
import { registerOrg, checkSlugAvailable } from "../api";

// Turns "Nigerian University Engineering" → "nigerian-university-engineering"
const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);

export default function OrgRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    orgName: "",
    slug: "",
    adminEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [slugEdited, setSlugEdited] = useState(false); // true once user manually edits slug
  const [slugStatus, setSlugStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = org details, 2 = admin credentials

  // Auto-generate slug from org name (unless user has manually edited it)
  useEffect(() => {
    if (!slugEdited && form.orgName) {
      setForm((f) => ({ ...f, slug: toSlug(f.orgName) }));
    }
  }, [form.orgName, slugEdited]);

  // Debounced slug availability check
  useEffect(() => {
    if (!form.slug || form.slug.length < 3) {
      setSlugStatus(null);
      return;
    }
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
    if (!form.slug.trim()) return setError("URL slug is required");
    if (slugStatus === "taken")
      return setError("This URL is already taken — choose a different one");
    if (slugStatus === "checking")
      return setError("Still checking availability — please wait a moment");
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.adminEmail.trim()) return setError("Admin email is required");
    if (!form.password) return setError("Password is required");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match");

    setLoading(true);
    setError("");
    try {
      await registerOrg(form);
      navigate("/admin/login", {
        state: { registered: true, email: form.adminEmail, slug: form.slug },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // The preview URL shown to the user
  const baseUrl = window.location.origin;
  const voteUrl = `${baseUrl}/vote/${form.slug || "your-org"}`;

  return (
    <PageShell>
      <div className="max-w-lg mx-auto mt-8 mb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-2xl font-black text-white">VB</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">
            Register your organization
          </h1>
          <p className="text-slate-500 mt-2">
            Set up your Virtual Ballot account in two steps
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8 px-2">
          {["Organization details", "Admin credentials"].map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                    i + 1 < step
                      ? "bg-blue-600 border-blue-600 text-white"
                      : i + 1 === step
                      ? "bg-white border-blue-500 text-blue-600"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[11px] mt-1 font-bold text-center ${
                    i + 1 <= step ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i === 0 && (
                <div
                  className={`h-0.5 w-10 mb-5 mx-1 transition-colors ${
                    step === 2 ? "bg-blue-400" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl">
          {/* ── Step 1: Org details ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Organization Name
                </label>
                <div className="flex items-center gap-3 bg-slate-50 focus-within:bg-blue-50/50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                  <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    value={form.orgName}
                    onChange={set("orgName")}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    placeholder="e.g. University of Nigeria Engineering Students"
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Slug field with availability indicator */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Your Voting URL
                </label>
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    slugStatus === "taken"
                      ? "bg-red-50 border-red-200"
                      : slugStatus === "available"
                      ? "bg-green-50 border-green-200"
                      : "bg-slate-50 border-transparent focus-within:bg-blue-50/50 focus-within:border-blue-200"
                  }`}
                >
                  <Link className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex items-center gap-0 flex-1 min-w-0">
                    <span className="text-slate-400 text-sm font-medium whitespace-nowrap shrink-0">
                      {window.location.host}/vote/
                    </span>
                    <input
                      value={form.slug}
                      onChange={set("slug")}
                      onKeyDown={(e) => e.key === "Enter" && nextStep()}
                      placeholder="your-org"
                      className="flex-1 bg-transparent outline-none font-bold text-slate-700 min-w-0"
                    />
                  </div>
                  {/* Availability indicator */}
                  <div className="shrink-0">
                    {slugStatus === "checking" && <VBLoader size="sm" />}
                    {slugStatus === "available" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {slugStatus === "taken" && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-xs mt-1.5 ml-1 font-medium ${
                    slugStatus === "taken"
                      ? "text-red-500"
                      : slugStatus === "available"
                      ? "text-green-600"
                      : "text-slate-400"
                  }`}
                >
                  {slugStatus === "taken" && "This URL is already taken"}
                  {slugStatus === "available" && "✓ This URL is available"}
                  {!slugStatus &&
                    "Voters will use this URL to access your election"}
                </p>
              </div>

              {/* URL preview card */}
              {form.slug && (
                <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-black">VB</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Your voter URL
                    </p>
                    <p className="text-sm font-mono text-blue-400 truncate">
                      {voteUrl}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm font-bold text-center">
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
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 group disabled:opacity-50 hover:bg-black transition-colors cursor-pointer"
              >
                Continue
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* ── Step 2: Admin credentials ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Admin Email
                </label>
                <div className="flex items-center gap-3 bg-slate-50 focus-within:bg-blue-50/50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                  <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={set("adminEmail")}
                    placeholder="admin@yourorg.edu.ng"
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="flex items-center gap-3 bg-slate-50 focus-within:bg-blue-50/50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                  <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Confirm Password
                </label>
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    form.confirmPassword &&
                    form.password !== form.confirmPassword
                      ? "bg-red-50 border-red-200"
                      : form.confirmPassword &&
                        form.password === form.confirmPassword
                      ? "bg-green-50 border-green-200"
                      : "bg-slate-50 border-transparent focus-within:bg-blue-50/50 focus-within:border-blue-200"
                  }`}
                >
                  <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Repeat your password"
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                  />
                  {form.confirmPassword &&
                    form.password === form.confirmPassword && (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    )}
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center">
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  "Create Organization Account →"
                )}
              </button>

              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                className="w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/admin/login")}
            className="text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </PageShell>
  );
}
