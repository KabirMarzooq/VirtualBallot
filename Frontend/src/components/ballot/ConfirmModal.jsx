import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import VBLoader from "../ui/VBLoader";
import { submitBallot } from "../../api";
import { useSlug } from "../../context/SlugContext"

function genSerial() {
  return "BLT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function ConfirmModal() {
  const {
    ballot,
    candidates,
    setShowConfirmModal,
    accessToken,
    setReceiptHash,
    setShowConfetti,
    setCandidates,
    setCurrentUser,
    resetBallotSession,
    branding,
    showAlert,
  } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const slug = useSlug()

  const entries = Object.entries(ballot).map(([pos, id]) => ({
    pos,
    candidate: candidates.find((c) => c.id === id),
  }));

  const serial = genSerial();
  const ts = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build selections array for the API
      const selections = Object.entries(ballot).map(
        ([position, candidateId]) => ({
          candidateId,
          position,
        })
      );
      const data = await submitBallot(selections, accessToken);
      setReceiptHash(data.receiptId);
      // Optimistically update local vote counts so UI reflects immediately
      setCandidates((prev) =>
        prev.map((c) =>
          Object.values(ballot).includes(c.id)
            ? { ...c, votes: c.votes + 1 }
            : c
        )
      );
      setShowConfirmModal(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      navigate(`/vote/${slug}/receipt`)
    } catch (err) {
      showAlert("Vote Failed", err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-90 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white w-full max-w-lg my-4 shadow-2xl relative"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <span className="text-[7rem] font-black text-slate-100 rotate-[-35deg] select-none tracking-tighter leading-none z-0">
            BALLOT
          </span>
        </div>

        {/* Header strip */}
        <div className="bg-slate-900 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-black">VB</span>
            </div>
            <span className="text-white text-xs font-bold tracking-widest uppercase">
              Virtual Ballot
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-mono tracking-widest">
            OFFICIAL · CONFIDENTIAL
          </span>
        </div>

        {/* Ballot header */}
        <div className="border-b-4 border-double border-slate-800 px-8 pt-6 pb-4 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-slate-500 mb-1">
            {branding.institutionName || "Electoral Commission"}
          </p>
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">
            {branding.electionName || "Official Ballot Paper"}
          </h2>
          <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-slate-400 font-sans">
            <span>
              Serial: <span className="font-mono text-slate-600">{serial}</span>
            </span>
            <span>·</span>
            <span>{ts}</span>
          </div>
        </div>

        <div className="bg-slate-50 border-b border-slate-200 px-8 py-2">
          <p className="text-[10px] text-slate-500 text-center tracking-wide">
            Please review your selections carefully. This action is final and
            cannot be undone.
          </p>
        </div>

        {/* Selections */}
        <div className="px-8 py-6 space-y-0 relative z-10">
          {entries.map(({ pos, candidate }, i) => (
            <div
              key={pos}
              className={`py-4 ${
                i < entries.length - 1
                  ? "border-b border-dashed border-slate-200"
                  : ""
              }`}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                {pos}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 border-2 border-slate-800 flex items-center justify-center shrink-0 relative">
                  <svg
                    viewBox="0 0 20 20"
                    className="w-5 h-5 absolute"
                    fill="none"
                  >
                    <path
                      d="M4 10l5 5L16 6"
                      stroke="#1e293b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <img
                  src={candidate?.image}
                  alt={candidate?.name}
                  className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                />
                <div className="flex-1">
                  <p className="text-lg font-black text-slate-900 leading-tight">
                    {candidate?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-sans">
                    {candidate?.position}
                  </p>
                </div>
                <span className="inline-block text-[9px] bg-slate-900 text-white px-2 py-0.5 tracking-widest uppercase font-sans">
                  Selected
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-4 border-double border-slate-800 bg-slate-50 px-8 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            By casting this ballot you confirm these selections are your own and
            you have not been coerced. Your vote is secret.
          </p>
        </div>

        <div className="px-8 py-5 flex gap-3 bg-white border-t border-slate-100">
          <button
            onClick={() => setShowConfirmModal(false)}
            disabled={loading}
            className="flex-1 py-3 border-2 border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors font-sans text-sm tracking-wide disabled:opacity-40"
          >
            ← Review Again
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-slate-900 text-white font-bold hover:bg-black transition-colors font-sans text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <VBLoader size="sm" /> : "Cast My Vote →"}
          </button>
        </div>
      </div>
    </div>
  );
}
