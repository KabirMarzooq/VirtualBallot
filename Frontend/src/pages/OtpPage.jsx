import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import VBLoader from "../components/ui/VBLoader";
import PageShell from "../components/layout/PageShell";
import { verifyOtp } from "../api";
import { useSlug } from "../context/SlugContext"

export default function OtpPage() {
  const { currentUser, electionId, orgId, setAccessToken, showAlert } =
    useApp();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const slug = useSlug()

  if (!currentUser) { navigate(`/vote/${slug}`); return null }

  const handleVerify = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    setError(false);
    try {
      const data = await verifyOtp(currentUser.id, electionId, orgId, otp, slug);
      // Store the JWT in memory — this is the voter's ballot access token
      setAccessToken(data.accessToken);
      navigate(`/vote/${slug}/ballot`)
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
    <PageShell>
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-white text-center">
          <ProgressBar step={1} />
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Check your Email
            </h2>
            <p className="text-slate-500">
              A verification code was sent to{" "}
              <span className="font-bold text-slate-700">{maskedEmail}</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setError(false);
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && otp.length >= 4 && handleVerify()
                }
                placeholder="• • • • • •"
                autoFocus
                className={`w-full text-center text-4xl font-black tracking-[0.4em] py-6 rounded-2xl bg-slate-50 border-2 outline-none placeholder:text-slate-300 text-slate-800 transition-all ${
                  error
                    ? "border-red-400 bg-red-50"
                    : "border-transparent focus:border-blue-200"
                }`}
              />
              {error && (
                <p className="text-red-500 text-xs font-bold mt-2">
                  Incorrect code. Please try again.
                </p>
              )}
            </div>
            <button
              onClick={handleVerify}
              disabled={otp.length < 4 || loading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <VBLoader size="sm" /> : "Verify & Proceed to Ballot"}
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Didn't receive a code? Check your spam folder, or{" "}
            <button
              onClick={() => navigate(`/vote/${slug}`)}
              className="underline font-bold"
            >
              go back and try again
            </button>
            .
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            className="mt-4 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </PageShell>
  );
}
