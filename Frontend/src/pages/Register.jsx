import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import { checkEligibility, registerVoter } from "../api";
import { useSlug } from "../context/SlugContext";
import { isValidEmail } from "../utils";

export default function RegisterPage() {
  const { electionConfig, showAlert } = useApp();
  const navigate = useNavigate();
  const slug = useSlug();

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [voterInfo, setVoterInfo] = useState(null);
  const [matric, setMatric]       = useState("");
  const [email, setEmail]         = useState("");
  const [matricError, setMatricError] = useState("");
  const [emailError, setEmailError]   = useState("");

  // ── Registry locked ──────────────────────────────────────────────────────
  if (electionConfig.registryLocked) {
    return (
      <AuthBackground>
        <div className="w-full max-w-[420px] bg-white border border-blue-200 rounded-2xl shadow-lg p-8 text-center text-slate-800">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-4">Registration closed</h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            The electoral commission has locked the voter registry. If you believe
            this is a mistake, contact the commission.
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            title="Back to voter login"
            className="w-full mt-7 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer"
          >
            ← Back to login
          </button>
        </div>
      </AuthBackground>
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCheckEligibility = async () => {
    const m = matric.trim().toUpperCase();
    if (!m) return;
    setMatricError("");
    setLoading(true);
    try {
      const data = await checkEligibility(m, slug);
      setVoterInfo(data.voter);
      setStep(2);
    } catch (err) {
      setMatricError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setEmailError("");
    if (!email.trim()) { setEmailError("Please enter your email address."); return; }
    if (!isValidEmail(email)) { setEmailError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      await registerVoter(voterInfo.id, email.trim(), slug);
      showAlert("Account Activated!", "Your account is ready. You can now log in to vote.");
      navigate(`/vote/${slug}`);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const firstName = voterInfo?.name?.split(" ")[0];

  // ── Shared bits ──────────────────────────────────────────────────────────
  const stepper = (
    <div className="flex items-center justify-center mt-6">
      <div className="flex items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
            step === 2
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-blue-600 text-blue-600"
          }`}
        >
          {step === 2 ? "✓" : "1"}
        </div>
        <span className="text-[11px] font-semibold text-slate-800 ml-2 mr-3">Verify</span>
        <span className={`w-9 h-0.5 mr-3 ${step === 2 ? "bg-blue-600" : "bg-slate-200"}`} />
      </div>
      <div className="flex items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
            step === 2
              ? "bg-white border-blue-600 text-blue-600"
              : "bg-white border-slate-300 text-slate-400"
          }`}
        >
          2
        </div>
        <span className={`text-[11px] font-semibold ml-2 ${step === 2 ? "text-slate-800" : "text-slate-400"}`}>
          Complete setup
        </span>
      </div>
    </div>
  );

  const lockedField = (label, value) => (
    <div className="mt-5">
      <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">{label}</label>
      <div className="relative">
        <input
          value={value}
          readOnly
          className="w-full min-h-[48px] text-sm bg-slate-100 text-slate-600 border border-slate-300 rounded-lg pl-4 pr-10 py-3 outline-none cursor-not-allowed"
        />
        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );

  return (
    <AuthBackground>
      <div className="w-full max-w-[420px] text-slate-800">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-white tracking-tight">VB</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mt-4">
              {step === 2 && firstName ? `Almost there, ${firstName}` : "Activate your account"}
            </h1>
            <p className="text-[13px] leading-5 text-slate-600 mt-1">
              {step === 2
                ? "Confirm your details and add your email."
                : "You must be on the voter roster to participate."}
            </p>
          </div>

          {stepper}

          {/* Step 1 — verify eligibility */}
          {step === 1 && (
            <>
              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Matric number
                </label>
                <input
                  value={matric}
                  onChange={(e) => { setMatric(e.target.value); setMatricError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckEligibility()}
                  className={`w-full min-h-[48px] text-sm text-slate-800 bg-white border rounded-lg px-4 py-3 outline-none placeholder:text-slate-400 transition-all ${
                    matricError
                      ? "border-red-500 ring-[3px] ring-red-50"
                      : "border-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100"
                  }`}
                  placeholder="U/25/0412"
                  autoFocus
                />
                {matricError && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 mt-1.5">{matricError}</p>
                )}
              </div>
              <button
                onClick={handleCheckEligibility}
                disabled={!matric || loading}
                title="Check if this matric is eligible to vote"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    Check eligibility
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
              <button
                onClick={() => navigate(`/vote/${slug}`)}
                title="Return to voter login"
                className="w-full mt-2 min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[13px] font-semibold rounded-lg transition-all cursor-pointer"
              >
                ← Back to login
              </button>
            </>
          )}

          {/* Step 2 — complete setup */}
          {step === 2 && voterInfo && (
            <>
              {lockedField("Matric number", matric.trim().toUpperCase())}
              {lockedField("Full name", voterInfo.name)}
              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Email address
                </label>
                <input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  type="email"
                  className={`w-full min-h-[48px] text-sm text-slate-800 bg-white border rounded-lg px-4 py-3 outline-none placeholder:text-slate-400 transition-all ${
                    emailError
                      ? "border-red-500 ring-[3px] ring-red-50"
                      : "border-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100"
                  }`}
                  placeholder="student@university.edu.ng"
                  autoFocus
                />
                {emailError && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 mt-1.5">{emailError}</p>
                )}
              </div>
              <button
                onClick={handleRegister}
                disabled={!email || loading}
                title="Complete account activation"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
              <button
                onClick={() => { setStep(1); setEmailError(""); }}
                title="Go back to change matric number"
                className="w-full mt-2 min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[13px] font-semibold rounded-lg transition-all cursor-pointer"
              >
                ← Change matric number
              </button>
            </>
          )}
        </div>
      </div>
    </AuthBackground>
  );
}
