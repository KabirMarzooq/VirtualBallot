import { CheckCircle, Mail, PartyPopper, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import PageShell from "../components/layout/PageShell";
import { useSlug } from "../context/SlugContext"

export default function ReceiptPage() {
  const {
    receiptHash,
    showConfetti,
    emailSent,
    setEmailSent,
    setCurrentUser,
    resetBallotSession,
  } = useApp();
  const navigate = useNavigate();
  const slug = useSlug()

  // Guard: no receipt means they didn't go through voting
  if (!receiptHash) {
    navigate(`/vote/${slug}`)
    return null;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`)
  };

  const handleEmailReceipt = () => {
    // In production: POST to API to send email
    setEmailSent(true);
  };

  return (
    <PageShell>
      <div className="max-w-md mx-auto mt-12 sm:mt-20 text-center relative">
        {/* Confetti icon */}
        {showConfetti && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <PartyPopper className="w-16 h-16 text-yellow-400" />
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-white">
          <ProgressBar step={3} />

          {/* Success icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h2 className="text-3xl font-black text-slate-800">You voted! 🎉</h2>
          <p className="text-slate-500 font-medium mt-2">
            Thanks for participating in this election.
          </p>

          {/* Receipt box */}
          <div className="my-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 text-center">
              Your Receipt ID
            </p>
            <p className="font-mono text-blue-600 font-bold break-all text-sm text-center">
              {receiptHash}
            </p>
            <p className="text-xs text-slate-400 text-center mt-3">
              Keep this ID — you can use it to verify your vote was recorded
              correctly.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleEmailReceipt}
              disabled={emailSent}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors ${
                emailSent
                  ? "bg-green-100 text-green-600 cursor-default"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {emailSent ? (
                <>
                  <CheckCircle className="w-5 h-5" /> Receipt Emailed
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" /> Email me this receipt
                </>
              )}
            </button>

            <button
              onClick={() => navigate(`/vote/${slug}/results`)}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black shadow-xl flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart3 className="w-5 h-5" /> See Live Results
            </button>

            <button
              onClick={handleLogout}
              className="w-full mt-2 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors py-2"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
