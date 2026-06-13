import { CheckCircle, Mail, PartyPopper, BarChart3 } from "lucide-react";
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
    showConfetti,
    emailSent,
    setEmailSent,
    setCurrentUser,
    resetBallotSession,
    accessToken,
    showAlert,
  } = useApp();
  const [emailing, setEmailing] = useState(false);
  const navigate = useNavigate();
  const slug = useSlug();

  if (!receiptHash) {
    navigate(`/vote/${slug}`);
    return null;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {showConfetti && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <PartyPopper className="w-16 h-16 text-yellow-400" />
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl text-center">
          <ProgressBar step={3} />

          <div className="w-24 h-24 bg-green-500/20 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>

          <h2 className="text-3xl font-black text-white">You voted! 🎉</h2>
          <p className="text-slate-400 font-medium mt-2">
            Thanks for participating in this election.
          </p>

          {/* Receipt box */}
          <div className="my-8 bg-slate-800 border border-slate-700 p-6 rounded-3xl text-left">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2 text-center">
              Your Receipt ID
            </p>
            <p className="font-mono text-blue-400 font-bold break-all text-sm text-center">
              {receiptHash}
            </p>
            <p className="text-xs text-slate-600 text-center mt-3">
              Keep this ID — you can use it to verify your vote was recorded
              correctly.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={async () => {
                setEmailing(true);
                try {
                  await emailReceipt(receiptHash, accessToken);
                  setEmailSent(true);
                } catch (err) {
                  showAlert("Failed to Send", err.message);
                } finally {
                  setEmailing(false);
                }
              }}
              disabled={emailSent || emailing}
              title={
                emailSent
                  ? "Receipt already emailed"
                  : "Send receipt to your registered email"
              }
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                emailSent
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {emailSent ? (
                <>
                  <CheckCircle className="w-5 h-5" /> Receipt Emailed
                </>
              ) : emailing ? (
                <>
                  <VBLoader size="sm" /> Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" /> Email me this receipt
                </>
              )}
            </button>

            <button
              onClick={() => navigate(`/vote/${slug}/results`)}
              title="View live election results"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-5 h-5" /> See Live Results
            </button>

            <button
              onClick={handleLogout}
              title="Log out and return to voter login"
              className="w-full mt-2 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors py-2 cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
