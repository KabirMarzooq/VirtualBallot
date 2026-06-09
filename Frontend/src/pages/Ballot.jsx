import { useState, useEffect } from "react";
import { Clock, CheckCircle, FileText, ChevronDown, SplitSquareHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import CompareModal from "../components/ballot/CompareModal";
import ConfirmModal from "../components/ballot/ConfirmModal";
import { getPositions } from "../utils";
import { useSlug } from "../context/SlugContext";

export default function BallotPage() {
  const {
    electionConfig, timeLeft, candidates,
    ballot, toggleBallotSelection,
    showConfirmModal, setShowConfirmModal,
    currentUser, showAlert, branding,
  } = useApp();
  const navigate = useNavigate();
  const [expanded, setExpanded]       = useState({});
  const [compareState, setCompareState] = useState(null);
  const slug = useSlug();

  useEffect(() => {
    if (!currentUser) { navigate(`/vote/${slug}`); return; }
    const t = setTimeout(() => {
      showAlert("Session Expired", "Your session expired due to inactivity.");
      navigate(`/vote/${slug}`);
    }, 120_000);
    return () => clearTimeout(t);
  }, []);

  if (electionConfig.status === "ENDED") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-2xl font-bold text-slate-400">Voting is now closed.</p>
        <button
          onClick={() => navigate(`/vote/${slug}`)}
          title="Go to voter home"
          className="text-blue-400 font-bold hover:text-blue-300 cursor-pointer transition-colors"
        >
          Go home
        </button>
      </div>
    );
  }

  if (!currentUser) return null;

  const positions   = getPositions(candidates);
  const allSelected = positions.every((p) => ballot[p]);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCompare = (e, pos, thisId) => {
    e.stopPropagation();
    const others   = candidates.filter((c) => c.position === pos && c.id !== thisId);
    const opponent = others.find((c) => c.id !== ballot[pos]) ?? others[0];
    if (!opponent) return;
    setCompareState({ pos, idA: thisId, idB: opponent.id });
  };

  return (
    <>
      {compareState && (() => {
        const cA = candidates.find((c) => c.id === compareState.idA);
        const cB = candidates.find((c) => c.id === compareState.idB);
        return cA && cB ? (
          <CompareModal
            pos={compareState.pos} candidateA={cA} candidateB={cB}
            ballot={ballot} onSelect={toggleBallotSelection}
            onClose={() => setCompareState(null)}
          />
        ) : null;
      })()}

      {showConfirmModal && <ConfirmModal />}

      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 pb-32 pt-8">
          <ProgressBar step={2} />

          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              {branding.institutionName && (
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
                  {branding.institutionName}
                </p>
              )}
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                {branding.electionName || "The Ballot"}
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Select your candidates — read manifestos or <span className="font-bold text-slate-400">compare</span> side by side
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="font-mono font-bold text-white text-sm">{timeLeft}</span>
            </div>
          </header>

          {/* Positions */}
          {positions.map((pos) => {
            const posCandidates = candidates.filter((c) => c.position === pos);
            const canCompare    = posCandidates.length >= 2;

            return (
              <section key={pos} className="mb-10">
                <div className="flex items-center gap-3 mb-6 px-1">
                  <div className="h-px bg-slate-800 flex-1" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{pos}</h3>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  {posCandidates.map((candidate) => {
                    const sel          = ballot[pos] === candidate.id;
                    const open         = !!expanded[candidate.id];
                    const hasManifesto = !!candidate.manifesto?.trim();

                    return (
                      <div
                        key={candidate.id}
                        className={`rounded-3xl transition-all duration-300 relative overflow-hidden ${
                          sel
                            ? "bg-slate-800 ring-4 ring-blue-500/30 shadow-2xl shadow-blue-500/10"
                            : "bg-slate-900 border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Selection row */}
                        <div
                          onClick={() => toggleBallotSelection(pos, candidate.id)}
                          className="flex items-center gap-5 p-6 cursor-pointer group"
                        >
                          <img
                            src={candidate.image}
                            alt={candidate.name}
                            className="w-16 h-16 rounded-2xl object-cover bg-slate-700 shadow-lg shrink-0 group-hover:rotate-3 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-lg leading-tight">{candidate.name}</h4>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                              {candidate.position}
                            </p>
                          </div>
                          {sel && (
                            <div className="text-blue-400 bg-blue-500/20 p-2 rounded-full shrink-0">
                              <CheckCircle className="w-6 h-6 fill-blue-500 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="px-6 pb-5 flex items-center gap-2 flex-wrap">
                          {hasManifesto && (
                            <button
                              onClick={(e) => toggleExpand(e, candidate.id)}
                              title={open ? "Hide manifesto" : "Read candidate manifesto"}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                open
                                  ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {open ? "Hide" : "Read manifesto"}
                              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                            </button>
                          )}

                          {canCompare && (
                            <button
                              onClick={(e) => openCompare(e, pos, candidate.id)}
                              title="Compare with another candidate side by side"
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700 hover:bg-violet-600/20 hover:text-violet-400 hover:border-violet-600/30 transition-all cursor-pointer"
                            >
                              <SplitSquareHorizontal className="w-3.5 h-3.5" /> Compare
                            </button>
                          )}

                          {!hasManifesto && !canCompare && (
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                              No manifesto
                            </span>
                          )}
                        </div>

                        {/* Manifesto panel */}
                        {hasManifesto && open && (
                          <div className="mx-4 mb-5 p-4 bg-slate-800/60 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-1.5 h-4 rounded-full bg-gradient-to-b ${candidate.color}`} />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manifesto</p>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">{candidate.manifesto}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Sticky submit bar */}
          <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-20">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!allSelected}
              title={allSelected ? "Review your selections and submit" : `Select all ${positions.length} positions to continue`}
              className={`max-w-md w-full py-4 rounded-full font-bold text-lg shadow-2xl transition-all cursor-pointer ${
                allSelected
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {allSelected
                ? "Review & Submit →"
                : `Select all ${positions.length} position${positions.length !== 1 ? "s" : ""} to continue`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
