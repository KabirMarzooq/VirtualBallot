import { useState } from "react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import VBLoader from "../components/ui/VBLoader";
import { checkEligibility, registerVoter } from "../api";
import { useSlug } from "../context/SlugContext";

export default function RegisterPage() {
  const { electionConfig, showAlert } = useApp();
  const navigate = useNavigate();
  const slug = useSlug();

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [voterInfo, setVoterInfo] = useState(null);
  const [matric, setMatric]       = useState("");
  const [email, setEmail]         = useState("");

  if (electionConfig.registryLocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Registration Closed</h2>
          <p className="text-slate-400 mb-8">
            The electoral commission has locked the voter registry.
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            title="Back to voter login"
            className="text-blue-400 font-bold hover:text-blue-300 cursor-pointer transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleCheckEligibility = async () => {
    const m = matric.trim().toUpperCase();
    if (!m) return;
    setLoading(true);
    try {
      const data = await checkEligibility(m, slug);
      setVoterInfo(data.voter);
      setStep(2);
    } catch (err) {
      showAlert("Not Eligible", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim()) return showAlert("Email Required", "Please enter your email address.");
    setLoading(true);
    try {
      await registerVoter(voterInfo.id, email.trim(), slug);
      showAlert("Account Activated!", "Your account is ready. You can now log in to vote.");
      navigate(`/vote/${slug}`);
    } catch (err) {
      showAlert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <span className="text-xl font-black text-white">VB</span>
          </div>
          <h1 className="text-3xl font-black text-white">Activate Account</h1>
          <p className="text-slate-500 font-medium mt-1">Claim your Virtual Ballot ID</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6 px-2">
          {["Verify Eligibility", "Complete Setup"].map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                    i + 1 <= step
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-bold text-center ${i + 1 <= step ? "text-blue-400" : "text-slate-600"}`}>
                  {label}
                </span>
              </div>
              {i === 0 && (
                <div className={`h-0.5 w-8 mb-4 transition-colors ${step === 2 ? "bg-blue-500" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">
                  Matric Number
                </label>
                <input
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckEligibility()}
                  className="w-full bg-transparent outline-none font-semibold text-white text-lg placeholder:text-slate-600"
                  placeholder="e.g. U/25/001"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCheckEligibility}
                disabled={!matric || loading}
                title="Check if this matric is eligible to vote"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Verify Eligibility"}
              </button>
            </div>
          )}

          {step === 2 && voterInfo && (
            <div className="space-y-4">
              {[["Matric Number", matric.trim().toUpperCase()], ["Full Name", voterInfo.name]].map(([label, val]) => (
                <div key={label} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 opacity-70">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">{label}</label>
                  <input
                    value={val}
                    readOnly
                    className="w-full bg-transparent outline-none font-semibold text-slate-300 cursor-not-allowed"
                  />
                </div>
              ))}
              <div className="bg-slate-800 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">
                  Email Address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  type="email"
                  className="w-full bg-transparent outline-none font-semibold text-white placeholder:text-slate-600"
                  placeholder="student@university.edu.ng"
                  autoFocus
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={!email || loading}
                title="Complete account activation"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : "Complete Setup →"}
              </button>
              <button
                onClick={() => setStep(1)}
                title="Go back to change matric number"
                className="w-full text-slate-500 text-sm font-bold hover:text-slate-300 transition-colors cursor-pointer"
              >
                ← Change matric number
              </button>
            </div>
          )}

          <button
            onClick={() => navigate(`/vote/${slug}`)}
            title="Return to voter login"
            className="w-full mt-6 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors text-center block cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
