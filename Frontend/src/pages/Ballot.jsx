import { useState, useEffect } from "react";
import { ChevronDown, ArrowRight, SplitSquareHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ProgressBar from "../components/ui/ProgressBar";
import CompareModal from "../components/ballot/CompareModal";
import ConfirmModal from "../components/ballot/ConfirmModal";
import { getPositions } from "../utils";
import { useSlug } from "../context/SlugContext";

function Avatar({ candidate, className = "w-[52px] h-[52px] text-base" }) {
  const initials = candidate.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (candidate.image) {
    return (
      <img
        src={candidate.image}
        alt={candidate.name}
        className={`${className} rounded-full object-cover bg-slate-200 shrink-0`}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-full flex items-center justify-center text-white font-semibold shrink-0 bg-gradient-to-br ${candidate.color || "from-blue-400 to-blue-600"}`}
    >
      {initials}
    </div>
  );
}

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
  const [expanded, setExpanded] = useState({});
  const [compareState, setCompareState] = useState(null);
  const slug = useSlug();

  useEffect(() => {
    if (!currentUser) {
      navigate(`/vote/${slug}`);
      return;
    }
    const t = setTimeout(() => {
      showAlert(
        "Session Expired",
        "Your voting session expired. Please log in again to vote."
      );
      navigate(`/vote/${slug}`);
    }, 12 * 60 * 1000); // 12 min — JWT is 15 min, this warns before expiry
    return () => clearTimeout(t);
  }, []);

  if (electionConfig.status === "ENDED") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-800 p-4">
        <p className="text-xl font-semibold text-slate-900">Voting is now closed.</p>
        <p className="text-[13px] text-slate-600">Results will be published by the commission.</p>
        <button
          onClick={() => navigate(`/vote/${slug}`)}
          title="Go to voter home"
          className="mt-2 min-h-[44px] px-5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
        >
          ← Back to login
        </button>
      </div>
    );
  }

  if (!currentUser) return null;

  const positions = getPositions(candidates);
  const selectedCount = positions.filter((p) => ballot[p]).length;
  const allSelected = selectedCount === positions.length && positions.length > 0;
  const remaining = positions.filter((p) => !ballot[p]);

  // Timer pill urgency — blue, amber under 30 min, red under 5 min.
  const secsLeft = electionConfig.endsAt
    ? Math.max(0, Math.floor((new Date(electionConfig.endsAt) - Date.now()) / 1000))
    : null;
  const timerClass =
    secsLeft !== null && secsLeft < 300
      ? "bg-red-50 border-red-200 text-red-600"
      : secsLeft !== null && secsLeft < 1800
      ? "bg-amber-50 border-amber-200 text-amber-600"
      : "bg-blue-50 border-blue-200 text-blue-700";

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCompare = (e, pos, thisId) => {
    e.stopPropagation();
    const others = candidates.filter((c) => c.position === pos && c.id !== thisId);
    const opponent = others.find((c) => c.id !== ballot[pos]) ?? others[0];
    if (!opponent) return;
    setCompareState({ pos, idA: thisId, idB: opponent.id });
  };

  const switchCompareB = (newIdB) => {
    setCompareState((prev) => ({ ...prev, idB: newIdB }));
  };

  return (
    <>
      {compareState &&
        (() => {
          const cA = candidates.find((c) => c.id === compareState.idA);
          const cB = candidates.find((c) => c.id === compareState.idB);
          const others = candidates.filter(
            (c) => c.position === compareState.pos && c.id !== compareState.idA
          );
          return cA && cB ? (
            <CompareModal
              pos={compareState.pos}
              candidateA={cA}
              candidateB={cB}
              otherCandidates={others}
              onSwitchB={switchCompareB}
              ballot={ballot}
              onSelect={toggleBallotSelection}
              onClose={() => setCompareState(null)}
            />
          ) : null;
        })()}

      {showConfirmModal && <ConfirmModal />}

      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-[720px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {branding.institutionName && (
                <p className="text-[11px] leading-4 font-semibold text-blue-600 uppercase tracking-[0.1em] truncate">
                  {branding.institutionName}
                </p>
              )}
              <h1 className="text-lg leading-6 font-semibold text-slate-900 truncate">
                {branding.electionName || "The Ballot"}
              </h1>
            </div>
            <div
              className={`flex items-center gap-2 font-mono text-[13px] font-semibold px-4 py-2 rounded-full border shrink-0 ${timerClass}`}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-current animate-pulse" />
              {timeLeft}
            </div>
          </div>
        </header>

        <div className="max-w-[720px] mx-auto px-5 pb-36 pt-7">
          <ProgressBar step={2} />
          <p className="text-[13px] leading-5 text-slate-600">
            Select one candidate per position. Read manifestos or compare side by
            side before you decide.
          </p>

          {/* Positions */}
          {positions.map((pos, pi) => {
            const posCandidates = candidates.filter((c) => c.position === pos);
            const canCompare = posCandidates.length >= 2;

            return (
              <section key={pos}>
                <div className="flex items-baseline gap-3 mt-9 mb-4">
                  <span className="font-mono text-[22px] font-bold text-slate-300">
                    {String(pi + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.06em]">
                    {pos}
                  </h3>
                  <span className="text-xs text-slate-400 ml-auto">
                    Select 1 candidate
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {posCandidates.map((candidate) => {
                    const sel = ballot[pos] === candidate.id;
                    const open = !!expanded[candidate.id];
                    const hasManifesto = !!candidate.manifesto?.trim();

                    return (
                      <div
                        key={candidate.id}
                        onClick={() => toggleBallotSelection(pos, candidate.id)}
                        className={`relative rounded-2xl shadow-sm cursor-pointer transition-all duration-200 ${
                          sel
                            ? "bg-blue-50 border-2 border-blue-600 p-[19px]"
                            : "bg-white border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md hover:-translate-y-px"
                        }`}
                      >
                        {sel && (
                          <div className="vb-pop absolute top-3 right-3 w-[26px] h-[26px] bg-blue-600 rounded-full flex items-center justify-center text-white text-[13px]">
                            ✓
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Avatar candidate={candidate} />
                          <div className="min-w-0">
                            <h4 className="text-base font-semibold text-slate-900 leading-tight truncate">
                              {candidate.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] mt-0.5">
                              {candidate.position}
                            </p>
                          </div>
                        </div>

                        <div className={`h-px my-3 ${sel ? "bg-blue-100" : "bg-slate-100"}`} />

                        {hasManifesto ? (
                          <p
                            className={`text-[13px] leading-5 text-slate-600 ${
                              open ? "" : "line-clamp-2"
                            }`}
                          >
                            {candidate.manifesto}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            No manifesto provided
                          </p>
                        )}

                        <div className="flex items-center gap-1 mt-3">
                          {hasManifesto && (
                            <button
                              onClick={(e) => toggleExpand(e, candidate.id)}
                              title={open ? "Hide manifesto" : "Read full manifesto"}
                              className={`min-h-[40px] px-3 py-2 text-[13px] font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer text-slate-600 hover:text-slate-800 ${
                                sel ? "hover:bg-blue-100" : "hover:bg-slate-100"
                              }`}
                            >
                              {open ? "Hide manifesto" : "Read manifesto"}
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  open ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                          {canCompare && (
                            <button
                              onClick={(e) => openCompare(e, pos, candidate.id)}
                              title="Compare with another candidate side by side"
                              className={`min-h-[40px] px-3 py-2 text-[13px] font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ml-auto text-slate-600 hover:text-slate-800 ${
                                sel ? "hover:bg-blue-100" : "hover:bg-slate-100"
                              }`}
                            >
                              <SplitSquareHorizontal className="w-3.5 h-3.5" />
                              Compare
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sticky submit bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgb(0_0_0/0.04)]">
          <div className="max-w-[720px] mx-auto px-5 py-3 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">
                {selectedCount} of {positions.length} position
                {positions.length !== 1 ? "s" : ""} selected
              </p>
              <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${positions.length ? (selectedCount / positions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!allSelected}
                title={
                  allSelected
                    ? "Review your selections and submit"
                    : `Select ${remaining.join(", ")} to continue`
                }
                className="min-h-[48px] px-6 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed group"
              >
                Review & submit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {!allSelected && remaining.length > 0 && (
                <p className="text-[11px] leading-4 text-slate-400 mt-1 truncate max-w-[220px]">
                  Select {remaining[0]}
                  {remaining.length > 1 ? ` +${remaining.length - 1} more` : ""} to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
