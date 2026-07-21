import { CheckCircle, Mail, BarChart3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import { useSlug } from "../context/SlugContext";
import { emailReceipt } from "../api";
import VBLoader from "../components/ui/VBLoader";

export default function ReceiptPage() {
  const {
    receiptHash,
    verificationHash,
    orgSlug,
    emailSent,
    setEmailSent,
    setCurrentUser,
    resetBallotSession,
    accessToken,
    showAlert,
  } = useApp();
  const [emailing, setEmailing] = useState(false);
  const [copied, setCopied] = useState(null); // "id" | "hash" | null
  const navigate = useNavigate();
  const slug = useSlug();

  if (!receiptHash) {
    navigate(`/vote/${slug}`);
    return null;
  }

  const copy = (what, value) => {
    navigator.clipboard.writeText(value);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleEmail = async () => {
    setEmailing(true);
    try {
      await emailReceipt(receiptHash, accessToken);
      setEmailSent(true);
    } catch (err) {
      showAlert("Failed to Send", err.message);
    } finally {
      setEmailing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-8 sm:px-7 text-center">
          <ProgressBar step={4} />

          {/* Self-drawing success checkmark */}
          <div className="w-[72px] h-[72px] bg-green-50 border-[1.5px] border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M20 6 9 17l-5-5"
                className="vb-draw"
                style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
              />
            </svg>
          </div>

          <h2 className="text-[22px] leading-7 font-semibold text-slate-900 mt-4">
            Your vote is in
          </h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            Thanks for taking part in this election.
          </p>

          {/* Receipt ID */}
          <div className="mt-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                Receipt ID
              </span>
              <button
                onClick={() => copy("id", receiptHash)}
                title="Copy your receipt ID"
                className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                  copied === "id"
                    ? "text-green-600"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                {copied === "id" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-[13px] leading-5 font-semibold text-slate-900 break-all mt-2">
              {receiptHash}
            </p>
            <p className="text-[11px] leading-4 text-slate-400 mt-2">
              Keep this ID — use it any time to confirm your vote was recorded.
            </p>
          </div>

          {/* Cryptographic proof */}
          {verificationHash && (
            <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 uppercase tracking-[0.08em]">
                <ShieldCheck className="w-3 h-3" strokeWidth={2.4} />
                Cryptographic proof
              </div>
              <p className="text-[11px] leading-4 text-slate-600 mt-2">
                Your vote's fingerprint in the tamper-evident ledger. Anyone can
                confirm it was recorded and never altered — without seeing your
                choices.
              </p>
              <p className="font-mono text-[11px] leading-4 text-slate-600 break-all bg-slate-50 rounded-lg px-3 py-2 mt-3">
                {verificationHash}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copy("hash", verificationHash)}
                  title="Copy the verification hash"
                  className={`text-xs font-semibold min-h-[36px] px-3 rounded-lg border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied === "hash"
                      ? "border-green-200 bg-green-50 text-green-600"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                  }`}
                >
                  {copied === "hash" ? "✓ Copied" : "Copy hash"}
                </button>
                <a
                  href={`/verify/${orgSlug}?hash=${encodeURIComponent(verificationHash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the public vote verifier"
                  className="text-xs font-semibold min-h-[36px] px-3 rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  Verify my vote →
                </a>
              </div>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => navigate(`/vote/${slug}/results`)}
            title="View live election results"
            className="w-full mt-6 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" /> See live results
          </button>

          {emailSent ? (
            <div className="w-full mt-2 min-h-[48px] bg-green-50 border border-green-200 text-green-600 font-semibold text-sm rounded-lg flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Receipt emailed
            </div>
          ) : (
            <button
              onClick={handleEmail}
              disabled={emailing}
              title="Send receipt to your registered email"
              className="w-full mt-2 min-h-[48px] bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {emailing ? (
                <>
                  <VBLoader size="sm" /> Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" /> Email me this receipt
                </>
              )}
            </button>
          )}

          <button
            onClick={handleLogout}
            title="Log out and return to voter login"
            className="mt-2 min-h-[44px] px-4 text-[13px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
