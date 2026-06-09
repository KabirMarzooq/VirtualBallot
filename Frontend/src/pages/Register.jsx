import { useState } from "react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PageShell from "../components/layout/PageShell";
import VBLoader from "../components/ui/VBLoader";
import { checkEligibility, registerVoter } from "../api";
import { useSlug } from "../context/SlugContext"

export default function RegisterPage() {
  const { electionConfig, showAlert } = useApp();
  const navigate = useNavigate();
  const slug = useSlug()

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // We store the voter info returned by the server after step 1
  const [voterInfo, setVoterInfo] = useState(null); // { id, name }
  const [matric, setMatric] = useState("");
  const [email, setEmail] = useState("");

  if (electionConfig.registryLocked) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white/80 p-8 rounded-3xl shadow-xl border border-white text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Registration Closed
            </h2>
            <p className="text-slate-500 mb-8">
              The electoral commission has locked the voter registry.
            </p>
            <button
              onClick={() => navigate(`/vote/${slug}`)}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // Step 1: ask the server if this matric is eligible
  const handleCheckEligibility = async () => {
    const m = matric.trim().toUpperCase();
    if (!m) return;
    setLoading(true);
    try {
      const data = await checkEligibility(m, slug);
      // Server confirmed they're on the roster — move to step 2
      setVoterInfo(data.voter); // { id, name }
      setStep(2);
    } catch (err) {
      // Server returns the exact reason: not found, already registered, etc.
      showAlert("Not Eligible", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: save their email in the database
  const handleRegister = async () => {
    if (!email.trim())
      return showAlert("Email Required", "Please enter your email address.");
    setLoading(true);
    try {
      await registerVoter(voterInfo.id, email.trim(), slug);
      showAlert(
        "Account Activated!",
        "Your account is ready. You can now log in to vote."
      );
      navigate(`/vote/${slug}`)
    } catch (err) {
      showAlert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800">
              Activate Account
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Claim your Virtual Ballot ID
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {["Verify Eligibility", "Complete Setup"].map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                      i + 1 <= step
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-bold text-center ${
                      i + 1 <= step ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i === 0 && (
                  <div
                    className={`h-0.5 w-8 mb-4 ${
                      step === 2 ? "bg-blue-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-50 focus-within:bg-blue-50/50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">
                  Matric Number
                </label>
                <input
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCheckEligibility()
                  }
                  className="w-full bg-transparent outline-none font-semibold text-slate-700 text-lg"
                  placeholder="e.g. U/25/001"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCheckEligibility}
                disabled={!matric || loading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-black transition-colors cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Verify Eligibility"}
              </button>
            </div>
          )}

          {step === 2 && voterInfo && (
            <div className="space-y-4">
              {/* Read-only confirmed fields from the server */}
              {[
                ["Matric Number", matric.trim().toUpperCase()],
                ["Full Name", voterInfo.name],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 opacity-70"
                >
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">
                    {label}
                  </label>
                  <input
                    value={val}
                    readOnly
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>
              ))}
              <div className="bg-slate-50 focus-within:bg-blue-50/50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">
                  Email Address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  type="email"
                  className="w-full bg-transparent outline-none font-semibold text-slate-700"
                  placeholder="student@university.edu.ng"
                  autoFocus
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={!email || loading}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Complete Setup →"}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors cursor-pointer"
              >
                ← Change matric number
              </button>
            </div>
          )}

          <button
            onClick={() => navigate(`/vote/${slug}`)}
            className="w-full mt-6 text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors text-center block cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    </PageShell>
  );
}
