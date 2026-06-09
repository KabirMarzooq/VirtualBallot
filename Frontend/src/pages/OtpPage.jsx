import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import VBLoader from "../components/ui/VBLoader";
import { verifyOtp } from "../api";
import { useSlug } from "../context/SlugContext";

export default function OtpPage() {
  const { currentUser, electionId, orgId, setAccessToken, showAlert } = useApp();
  const navigate = useNavigate();
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);
  const slug = useSlug();

  if (!currentUser) { navigate(`/vote/${slug}`); return null; }

  const handleVerify = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    setError(false);
    try {
      const data = await verifyOtp(currentUser.id, electionId, orgId, otp, slug);
      setAccessToken(data.accessToken);
      navigate(`/vote/${slug}/ballot`);
    } catch (err) {
      setError(true);
      setOtp("");
      showAlert("Incorrect Code", err.message);
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = currentUser.email
    ? currentUser.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "your registered email";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl text-center">
          <ProgressBar step={1} />

          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Check your Email</h2>
            <p className="text-slate-400">
              A verification code was sent to{" "}
              <span className="font-bold text-slate-200">{maskedEmail}</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && otp.length >= 4 && handleVerify()}
                placeholder="• • • • • •"
                autoFocus
                className={`w-full text-center text-4xl font-black tracking-[0.4em] py-6 rounded-2xl bg-slate-800 border-2 outline-none placeholder:text-slate-700 text-white transition-all ${
                  error ? "border-red-500 bg-red-950/30" : "border-transparent focus:border-blue-500"
                }`}
              />
              {error && (
                <p className="text-red-400 text-xs font-bold mt-2">Incorrect code. Please try again.</p>
              )}
            </div>
            <button
              onClick={handleVerify}
              disabled={otp.length < 4 || loading}
              title="Verify the OTP and proceed to ballot"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <VBLoader size="sm" /> : "Verify & Proceed to Ballot"}
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Didn't receive a code? Check your spam folder, or{" "}
            <button
              onClick={() => navigate(`/vote/${slug}`)}
              title="Return to login and try again"
              className="underline font-bold text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              go back and try again
            </button>
            .
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            title="Back to voter login"
            className="mt-4 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors cursor-pointer"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
