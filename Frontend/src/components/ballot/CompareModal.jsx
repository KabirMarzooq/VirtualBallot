import { X, SplitSquareHorizontal, CheckCircle } from "lucide-react";
import { ACCENT_MAP } from "../../constants";

function CandidatePanel({ candidate, ballot, onSelect, pos, onClose }) {
  const isSelected = ballot[pos] === candidate.id;
  const accent =
    ACCENT_MAP[candidate.color] ?? ACCENT_MAP["from-blue-400 to-blue-600"];

  return (
    <div
      className={`flex-1 flex flex-col rounded-4xl transition-all duration-300 overflow-hidden ${
        isSelected
          ? `bg-white ring-4 ${accent.ring} shadow-xl`
          : "bg-slate-50 border border-slate-100"
      }`}
    >
      {/* Coloured header */}
      <div className={`${accent.bg} px-6 pt-6 pb-8 relative`}>
        {isSelected && (
          <div className="absolute top-4 right-4 bg-white/20 rounded-full p-1">
            <CheckCircle className="w-5 h-5 text-white fill-white" />
          </div>
        )}
        <img
          src={candidate.image}
          alt={candidate.name}
          className="w-20 h-20 rounded-2xl object-cover bg-white/20 shadow-xl mx-auto border-4 border-white/30"
        />
      </div>

      {/* Name */}
      <div className="px-5 pt-4 pb-3 text-center border-b border-slate-100">
        <h3 className="text-lg font-black text-slate-900 leading-tight">
          {candidate.name}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {candidate.position}
        </p>
        {isSelected && (
          <span
            className={`inline-block mt-2 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${accent.light} ${accent.text} border`}
          >
            Your current selection
          </span>
        )}
      </div>

      {/* Manifesto */}
      <div className="flex-1 px-5 py-4">
        {candidate.manifesto?.trim() ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-5 rounded-full ${accent.bar}`} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Manifesto
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {candidate.manifesto}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-300 italic text-center mt-4">
            No manifesto provided
          </p>
        )}
      </div>

      {/* Action */}
      <div className="px-5 pb-5 pt-2">
        {isSelected ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Keep this choice
          </button>
        ) : (
          <button
            onClick={() => {
              onSelect(pos, candidate.id);
              onClose();
            }}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors ${accent.btn}`}
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
  ballot,
  onSelect,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-5 h-5 text-slate-400" />
            <div>
              <h2 className="text-base font-black text-slate-800 leading-tight">
                Compare candidates
              </h2>
              <p className="text-xs text-slate-400 font-medium">{pos}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Panels */}
        <div className="flex items-stretch p-5 gap-4">
          <CandidatePanel
            candidate={candidateA}
            ballot={ballot}
            onSelect={onSelect}
            pos={pos}
            onClose={onClose}
          />
          <div className="flex items-center justify-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                vs
              </span>
            </div>
          </div>
          <CandidatePanel
            candidate={candidateB}
            ballot={ballot}
            onSelect={onSelect}
            pos={pos}
            onClose={onClose}
          />
        </div>

        <div className="px-7 pb-5 text-center">
          <p className="text-xs text-slate-400">
            Tap a candidate's button to select them and return to the ballot.
          </p>
        </div>
      </div>
    </div>
  );
}
