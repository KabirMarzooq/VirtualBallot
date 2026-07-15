import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import VBLoader from "../components/ui/VBLoader";
import { verifyOtp } from "../api";
import { useSlug } from "../context/SlugContext";

const CODE_LENGTH = 6;

export default function OtpPage() {
  const { currentUser, electionId, orgId, setAccessToken } = useApp();
  const navigate = useNavigate();
  const slug = useSlug();

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const inputs = useRef([]);

  if (!currentUser) {
    navigate(`/vote/${slug}`);
    return null;
  }

  const otp = digits.join("");
  const complete = otp.length === CODE_LENGTH;

  const setDigit = (i, val) => {
    setError("");
    const d = val.replace(/\D/g, "");
    setDigits((prev) => {
      const next = [...prev];
      if (d.length <= 1) {
        next[i] = d;
      } else {
        // Paste: distribute digits from this box onward
        d.split("").slice(0, CODE_LENGTH - i).forEach((c, j) => { next[i + j] = c; });
      }
      return next;
    });
    if (d) {
      const target = Math.min(i + d.length, CODE_LENGTH - 1);
      inputs.current[target]?.focus();
    }
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && complete) handleVerify();
  };

  const handleVerify = async () => {
    if (!complete || loading || verified) return;
    setLoading(true);
    setError("");
    try {
      const data = await verifyOtp(currentUser.id, electionId, orgId, otp, slug);
      setAccessToken(data.accessToken);
      // Persist voter token + context so the live support chat widget can
      // authenticate and the app socket can connect on the ballot page.
      sessionStorage.setItem("vb_voter_token", data.accessToken);
      if (electionId) sessionStorage.setItem("vb_voter_election", electionId);
      if (orgId) sessionStorage.setItem("vb_voter_org", orgId);
      // Brief green success flash before moving on
      setVerified(true);
      setTimeout(() => navigate(`/vote/${slug}/ballot`), 450);
    } catch (err) {
      setError(err.message || "Incorrect or expired code. Please try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = currentUser.email
    ? currentUser.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "your registered email";

  const boxClass = verified
    ? "border-green-600 text-green-600 bg-green-50"
    : error
    ? "border-red-500 text-red-600 bg-red-50 vb-shake"
    : "border-slate-300 text-slate-900 bg-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-8 sm:px-7 text-center">
          <ProgressBar step={verified ? 2 : 1} />

          <div
            className={`w-14 h-14 rounded-xl border flex items-center justify-center mx-auto ${
              verified
                ? "bg-green-50 border-green-200 text-green-600"
                : "bg-blue-50 border-blue-100 text-blue-600"
            }`}
          >
            {verified ? <Check className="w-6 h-6" strokeWidth={2.4} /> : <Mail className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-4">
            {verified ? "Code verified" : "Check your email"}
          </h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            {verified ? (
              "Taking you to your ballot…"
            ) : (
              <>
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-slate-800">{maskedEmail}</span>
              </>
            )}
          </p>

          {/* 6-box code input */}
          <div className="flex justify-center gap-2 mt-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                autoFocus={i === 0}
                disabled={verified}
                aria-label={`Digit ${i + 1}`}
                className={`w-12 h-[52px] text-center font-mono text-[22px] font-semibold border-[1.5px] rounded-xl outline-none transition-all ${boxClass}`}
              />
            ))}
          </div>
          {error && (
            <p className="text-[11px] leading-4 font-medium text-red-600 mt-2.5">{error}</p>
          )}
          {verified && (
            <p className="text-[11px] leading-4 font-medium text-green-600 mt-2.5">✓ Verified</p>
          )}

          <button
            onClick={handleVerify}
            disabled={!complete || loading || verified}
            title="Verify the code and proceed to your ballot"
            className="w-full mt-6 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? <VBLoader size="sm" /> : verified ? "Opening ballot…" : "Verify & continue"}
          </button>

          <p className="mt-5 text-[13px] text-slate-400">
            Didn't receive it? Check spam, or{" "}
            <button
              onClick={() => navigate(`/vote/${slug}`)}
              title="Return to login — logging in again resends the code"
              className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer transition-colors"
            >
              go back to resend
            </button>
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            title="Back to voter login"
            className="mt-1 min-h-[44px] px-4 text-[13px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
