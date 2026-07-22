import { useEffect } from "react";
import { X, SplitSquareHorizontal, Check } from "lucide-react";

function CandidatePanel({ candidate, ballot, onSelect, pos, onClose }) {
  const isSelected = ballot[pos] === candidate.id;

  return (
    <div
      className={`flex-1 flex flex-col rounded-xl overflow-hidden border transition-all ${
        isSelected
          ? "border-blue-600 ring-1 ring-blue-600 shadow-md"
          : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div
        className={`relative px-4 pt-5 pb-3.5 text-center border-b border-slate-100 ${
          isSelected ? "bg-blue-50" : "bg-white"
        }`}
      >
        {isSelected && (
          <span className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-blue-600 text-white flex items-center justify-center vb-pop">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
        <img
          src={candidate.image}
          alt={candidate.name}
          className={`w-[72px] h-[72px] rounded-2xl object-cover bg-slate-200 mx-auto ${
            isSelected ? "ring-4 ring-blue-100" : ""
          }`}
        />
        <h3 className="text-base leading-[22px] font-semibold text-slate-900 mt-3">
          {candidate.name}
        </h3>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] mt-0.5">
          {candidate.position}
        </p>
        {isSelected && (
          <span className="inline-block mt-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-700 bg-white border border-blue-200 px-2.5 py-[3px] rounded-full">
            Your current selection
          </span>
        )}
      </div>

      {/* Manifesto */}
      <div className="flex-1 px-4 py-3.5">
        {candidate.manifesto?.trim() ? (
          <>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">
              <span className="w-[3px] h-3.5 rounded-sm bg-blue-600" /> Manifesto
            </p>
            <p className="text-[13px] leading-5 text-slate-600">
              {candidate.manifesto}
            </p>
          </>
        ) : (
          <p className="text-xs italic text-slate-400 text-center mt-3">
            No manifesto provided
          </p>
        )}
      </div>

      {/* Action */}
      <div className="px-4 pb-4 pt-2">
        {isSelected ? (
          <button
            onClick={onClose}
            title="Keep this candidate selected"
            className="w-full min-h-[44px] rounded-lg text-[13px] font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer"
          >
            Keep this choice
          </button>
        ) : (
          <button
            onClick={() => {
              onSelect(pos, candidate.id);
              onClose();
            }}
            title={`Select ${candidate.name}`}
            className="w-full min-h-[44px] rounded-lg text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            Vote for {candidate.name.split(" ")[0]}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CompareModal({
  pos,
  candidateA,
  candidateB,
  otherCandidates = [],
  onSwitchB,
  ballot,
  onSelect,
  onClose,
}) {
  // Escape closes — always the safe path (never changes the selection)
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm vb-fade"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Compare candidates for ${pos}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-[600px] shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] overflow-hidden vb-modal-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <SplitSquareHorizontal className="w-[18px] h-[18px] text-blue-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
                Compare candidates
              </h2>
              <p className="text-[11px] text-slate-600">{pos}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Switch second candidate — only when there's a 3rd+ candidate */}
            {otherCandidates.length > 0 && (
              <select
                value={candidateB.id}
                onChange={(e) => onSwitchB(e.target.value)}
                title="Compare against a different candidate"
                className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg min-h-[36px] px-3 outline-none cursor-pointer max-w-[150px] truncate hover:border-slate-400 transition-all"
              >
                <option value={candidateB.id}>
                  vs {candidateB.name.split(" ")[0]}
                </option>
                {otherCandidates
                  .filter((c) => c.id !== candidateB.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      vs {c.name.split(" ")[0]}
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={onClose}
              title="Close comparison"
              className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panels */}
        <div className="flex flex-col md:flex-row items-stretch gap-3 p-5">
          <CandidatePanel
            candidate={candidateA}
            ballot={ballot}
            onSelect={onSelect}
            pos={pos}
            onClose={onClose}
          />
          <div className="flex items-center justify-center shrink-0">
            <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-semibold uppercase tracking-[0.06em] flex items-center justify-center rotate-90 md:rotate-0">
              vs
            </span>
          </div>
          <CandidatePanel
            candidate={candidateB}
            ballot={ballot}
            onSelect={onSelect}
            pos={pos}
            onClose={onClose}
          />
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-[11px] text-slate-400">
            Tap a candidate's button to select them and return to the ballot.
          </p>
        </div>
      </div>
    </div>
  );
}
