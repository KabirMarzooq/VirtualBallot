import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  FileText,
  ChevronDown,
  SplitSquareHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PageShell from "../components/layout/PageShell";
import ProgressBar from "../components/ui/ProgressBar";
import CompareModal from "../components/ballot/CompareModal";
import ConfirmModal from "../components/ballot/ConfirmModal";
import { getPositions } from "../utils";
import { useSlug } from "../context/SlugContext"

export default function BallotPage() {
  const {
    electionConfig,
    timeLeft,
    candidates,
    ballot,
    toggleBallotSelection,
    showConfirmModal,
    setShowConfirmModal,
    currentUser,
    showAlert,
    branding,
  } = useApp();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState({}); // { candidateId: bool }
  const [compareState, setCompareState] = useState(null); // { pos, idA, idB }
  const slug = useSlug()

  // Auto-logout after 2 minutes of inactivity on ballot screen
  useEffect(() => {
    if (!currentUser) {
      navigate(`/vote/${slug}`);
      return;
    }
    const t = setTimeout(() => {
      showAlert("Session Expired", "Your session expired due to inactivity.");
      navigate(`/vote/${slug}`);
    }, 120_000);
    return () => clearTimeout(t);
  }, []);

  if (electionConfig.status === "ENDED") {
    return (
      <PageShell>
        <div className="text-center mt-40">
          <p className="text-2xl font-bold text-slate-400">
            Voting is now closed.
          </p>
          <button
            onClick={() => navigate(`/vote/${slug}`)}
            className="mt-4 text-blue-600 font-bold hover:underline"
          >
            Go home
          </button>
        </div>
      </PageShell>
    );
  }

  if (!currentUser) return null;

  const positions = getPositions(candidates);
  const allSelected = positions.every((p) => ballot[p]);

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCompare = (e, pos, thisId) => {
    e.stopPropagation();
    const others = candidates.filter(
      (c) => c.position === pos && c.id !== thisId
    );
    const opponent = others.find((c) => c.id !== ballot[pos]) ?? others[0];
    if (!opponent) return;
    setCompareState({ pos, idA: thisId, idB: opponent.id });
  };

  return (
    <>
      {/* Compare modal */}
      {compareState &&
        (() => {
          const cA = candidates.find((c) => c.id === compareState.idA);
          const cB = candidates.find((c) => c.id === compareState.idB);
          return cA && cB ? (
            <CompareModal
              pos={compareState.pos}
              candidateA={cA}
              candidateB={cB}
              ballot={ballot}
              onSelect={toggleBallotSelection}
              onClose={() => setCompareState(null)}
            />
          ) : null;
        })()}

      {/* Confirm / ballot paper modal */}
      {showConfirmModal && <ConfirmModal />}

      <PageShell>
        <div className="max-w-4xl mx-auto pb-32">
          <ProgressBar step={2} />

          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 px-1 gap-4">
            <div>
              {branding.institutionName && (
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                  {branding.institutionName}
                </p>
              )}
              <h1 className="text-3xl sm:text-4xl font-black text-slate-800">
                {branding.electionName || "The Ballot"}
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Select your candidates — read manifestos or{" "}
                <span className="font-bold">compare</span> side by side
              </p>
            </div>
            <div className="bg-white/80 px-4 py-2 rounded-full border border-white flex items-center gap-2 shrink-0 shadow-sm">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-mono font-bold text-slate-700 text-sm">
                {timeLeft}
              </span>
            </div>
          </header>

          {/* Positions */}
          {positions.map((pos) => {
            const posCandidates = candidates.filter((c) => c.position === pos);
            const canCompare = posCandidates.length >= 2;

            return (
              <section key={pos} className="mb-10">
                {/* Position divider */}
                <div className="flex items-center gap-3 mb-6 px-1">
                  <div className="h-px bg-slate-200 flex-1" />
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {pos}
                  </h3>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {posCandidates.map((candidate) => {
                    const sel = ballot[pos] === candidate.id;
                    const open = !!expanded[candidate.id];
                    const hasManifesto = !!candidate.manifesto?.trim();

                    return (
                      <div
                        key={candidate.id}
                        className={`rounded-4xl transition-all duration-300 relative overflow-hidden ${
                          sel
                            ? "bg-white ring-4 ring-blue-500/20 shadow-2xl"
                            : "bg-white shadow-sm border border-slate-100 hover:shadow-md hover:border-transparent"
                        }`}
                      >
                        {/* Selection row */}
                        <div
                          onClick={() =>
                            toggleBallotSelection(pos, candidate.id)
                          }
                          className="flex items-center gap-5 p-6 cursor-pointer group"
                        >
                          <img
                            src={candidate.image}
                            alt={candidate.name}
                            className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shadow-lg shrink-0 group-hover:rotate-3 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-lg leading-tight">
                              {candidate.name}
                            </h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                              {candidate.position}
                            </p>
                          </div>
                          {sel && (
                            <div className="text-blue-500 bg-blue-50 p-2 rounded-full shrink-0">
                              <CheckCircle className="w-6 h-6 fill-blue-500 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="px-6 pb-4 flex items-center gap-2 flex-wrap">
                          {hasManifesto && (
                            <button
                              onClick={(e) => toggleExpand(e, candidate.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                                open
                                  ? "bg-blue-50 text-blue-600 border-blue-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {open ? "Hide" : "Read manifesto"}
                              <ChevronDown
                                className={`w-3 h-3 transition-transform duration-200 ${
                                  open ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}

                          {canCompare && (
                            <button
                              onClick={(e) => openCompare(e, pos, candidate.id)}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                            >
                              <SplitSquareHorizontal className="w-3.5 h-3.5" />
                              Compare
                            </button>
                          )}

                          {!hasManifesto && !canCompare && (
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                              No manifesto
                            </span>
                          )}
                        </div>

                        {/* Manifesto panel */}
                        {hasManifesto && open && (
                          <div className="mx-4 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-1.5 h-4 rounded-full bg-linear-to-b ${candidate.color}`}
                              />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Manifesto
                              </p>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {candidate.manifesto}
                            </p>
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
              className={`max-w-md w-full py-4 rounded-full font-bold text-lg shadow-2xl transition-all ${
                allSelected
                  ? "bg-slate-900 text-white hover:bg-black"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {allSelected
                ? "Review & Submit →"
                : `Select all ${positions.length} position${
                    positions.length !== 1 ? "s" : ""
                  } to continue`}
            </button>
          </div>
        </div>
      </PageShell>
    </>
  );
}
