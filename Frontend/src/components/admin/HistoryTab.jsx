import { useState, useEffect } from "react";
import {
  Archive,
  Trophy,
  Calendar,
  X,
  Download,
  Users,
  Vote,
  Clock,
  TrendingUp,
  Medal,
  ChevronRight,
  UserX,
  UserCheck,
  BarChart3,
  Scale,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchElectionHistory } from "../../api";
import VBLoader from "../ui/VBLoader";
import {
  shapePosition,
  buildResultsDocument,
  printDocument,
} from "../../pages/Results";

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ElectionDetailModal({ election, branding, onClose }) {
  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  const formatTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatDuration = (start, end) => {
    if (!start || !end) return "—";
    const ms = new Date(end) - new Date(start);
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Group candidates by position
  const byPosition = {};
  (election.candidates || []).forEach((c) => {
    if (!byPosition[c.position]) byPosition[c.position] = [];
    byPosition[c.position].push(c);
  });
  // Sort each group by votes desc
  Object.keys(byPosition).forEach((pos) => {
    byPosition[pos].sort((a, b) => b.votes - a.votes);
  });

  const isRosterless = election.votingMode === "OPEN";
  const totalVotesCast = (election.candidates || []).reduce(
    (s, c) => s + (c.votes || 0),
    0
  );

  const handleDownload = () => {
    const blocks = Object.keys(byPosition).map((p) =>
      shapePosition(p, election.candidates || [])
    );
    printDocument(
      buildResultsDocument({
        title: election.name,
        subtitle: `${branding?.institutionName || "Organization"} · Official Election Report`,
        meta: `${formatDate(election.startedAt)} · ${formatTime(
          election.startedAt
        )}–${formatTime(election.endsAt)} · duration ${formatDuration(
          election.startedAt,
          election.endsAt
        )}`,
        blocks,
        stats: isRosterless
          ? [
              { label: "Total votes", value: totalVotesCast },
              { label: "Candidates", value: (election.candidates || []).length },
              { label: "Positions", value: Object.keys(byPosition).length },
            ]
          : [
              { label: "Registered", value: election.totalVoters },
              { label: "Accredited", value: election.accredited ?? 0 },
              { label: "Votes cast", value: election.votesCast },
              { label: "Turnout", value: `${election.turnout}%` },
            ],
      })
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto vb-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${election.name} — official election report`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] my-6 vb-modal-pop"
      >
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-4 min-w-0">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="logo"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-[15px] font-semibold text-white">
                  {branding?.institutionName?.slice(0, 2).toUpperCase() || "VB"}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.1em]">
                {branding?.institutionName || "Organization"}
              </p>
              <h2 className="text-base leading-6 font-semibold text-slate-900 truncate">
                {election.name}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Election Report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              title="Open a printable copy of this report"
              className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Election Meta ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: Calendar,
                label: "Date",
                value: formatDate(election.startedAt),
              },
              {
                icon: Clock,
                label: "Duration",
                value: formatDuration(election.startedAt, election.endsAt),
              },
              {
                icon: Clock,
                label: "Started",
                value: formatTime(election.startedAt),
              },
              {
                icon: Clock,
                label: "Ended",
                value: formatTime(election.endsAt),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    {s.label}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Voter Stats ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
              {isRosterless ? "Vote Statistics" : "Voter Statistics"}
            </p>
            <div
              className={`grid gap-3 ${
                isRosterless ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5"
              }`}
            >
              {(isRosterless
                ? [
                    {
                      icon: Vote,
                      label: "Total Votes",
                      value: totalVotesCast,
                      color: "text-green-600",
                    },
                    {
                      icon: BarChart3,
                      label: "Candidates",
                      value: (election.candidates || []).length,
                      color: "text-blue-600",
                    },
                  ]
                : [
                    {
                      icon: Users,
                      label: "Registered",
                      value: election.totalVoters,
                      color: "text-slate-900",
                    },
                    {
                      icon: UserCheck,
                      label: "Accredited",
                      value: election.accredited ?? 0,
                      color: "text-blue-600",
                    },
                    {
                      icon: Vote,
                      label: "Votes Cast",
                      value: election.votesCast,
                      color: "text-green-600",
                    },
                    {
                      icon: UserX,
                      label: "Did Not Vote",
                      value:
                        election.didNotVote ??
                        election.totalVoters - election.votesCast,
                      color: "text-red-600",
                    },
                    {
                      icon: TrendingUp,
                      label: "Turnout",
                      value: `${election.turnout}%`,
                      color: "text-blue-600",
                    },
                  ]
              ).map((s) => (
                <div
                  key={s.label}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <s.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                      {s.label}
                    </p>
                  </div>
                  <p className={`text-2xl font-semibold font-mono ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Turnout bar — roster elections only */}
            {!isRosterless && (
              <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    Participation
                  </p>
                  <p className="font-mono text-[11px] text-slate-600">
                    {election.votesCast} / {election.totalVoters}
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Results by Position ─────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
              Results by Position
            </p>
            <div className="space-y-4">
              {Object.entries(byPosition).map(([pos, candidates]) => (
                <div
                  key={pos}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-[0.08em]">
                      {pos}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {candidates[0]?.total || 0} total votes
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {(() => {
                      const topVotes = candidates[0]?.votes ?? 0;
                      const tiedCandidates =
                        topVotes > 0
                          ? candidates.filter((c) => c.votes === topVotes)
                          : [];
                      if (tiedCandidates.length < 2) return null;
                      return (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-600/30 rounded-xl px-4 py-3">
                          <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs leading-[18px] font-medium text-amber-700">
                            {tiedCandidates.length}-way tie —{" "}
                            {tiedCandidates.map((c) => c.name).join(", ")} each
                            have {topVotes} vote{topVotes !== 1 ? "s" : ""}.
                            Commission decision required.
                          </p>
                        </div>
                      );
                    })()}
                    {(() => {
                      const topVotes = candidates[0]?.votes ?? 0;
                      const isTied =
                        topVotes > 0 &&
                        candidates.filter((c) => c.votes === topVotes).length >
                          1;
                      return candidates.map((c, i) => {
                        const isTopTied = isTied && c.votes === topVotes;
                        const isSoleWinner = !isTied && i === 0 && topVotes > 0;
                        return (
                          <div
                            key={c.name}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isSoleWinner
                                ? "bg-blue-50 border-blue-200"
                                : isTopTied
                                ? "bg-amber-50 border-amber-600/30"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            {/* Rank */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isSoleWinner
                                  ? "bg-blue-600 text-white"
                                  : isTopTied
                                  ? "bg-amber-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-600"
                              }`}
                            >
                              {isSoleWinner ? (
                                <Trophy className="w-3.5 h-3.5" />
                              ) : isTopTied ? (
                                <Scale className="w-3.5 h-3.5" />
                              ) : (
                                i + 1
                              )}
                            </div>
                            {/* Photo */}
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-[13px] font-semibold text-slate-600">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-[13px] font-semibold text-slate-900 truncate">
                                  {c.name}
                                </p>
                                {isSoleWinner && (
                                  <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                    Winner
                                  </span>
                                )}
                                {isTopTied && (
                                  <span className="text-[10px] font-semibold bg-amber-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                    Tied
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    isSoleWinner
                                      ? "bg-blue-600"
                                      : isTopTied
                                      ? "bg-amber-600"
                                      : "bg-slate-400"
                                  }`}
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="text-right shrink-0 min-w-[60px]">
                              <p
                                className={`font-mono text-[15px] font-semibold ${
                                  isSoleWinner
                                    ? "text-blue-600"
                                    : isTopTied
                                    ? "text-amber-600"
                                    : "text-slate-600"
                                }`}
                              >
                                {c.pct}%
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {c.votes} votes
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Winners Summary Table ────────────────────────────────────────── */}
          {election.winners.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
                Winners Summary
              </p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        #
                      </th>
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Winner
                      </th>
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Position
                      </th>
                      <th className="text-right px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Votes
                      </th>
                      <th className="text-right px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.winners.map((w) => (
                      <tr
                        key={w.position}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Medal className="w-4 h-4 text-blue-600" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {w.image_url ? (
                              <img
                                src={w.image_url}
                                alt={w.winner}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-semibold text-slate-600">
                                  {w.winner.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-slate-900">
                                {w.winner}
                              </span>
                              {w.tied && (
                                <span className="text-[10px] font-semibold bg-amber-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                  Tie
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-medium text-slate-600 uppercase tracking-[0.06em]">
                            {w.position}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono text-[13px] font-semibold text-green-600">
                            {w.votes}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono text-[13px] font-semibold text-blue-600">
                            {w.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main HistoryTab ──────────────────────────────────────────────────────────
export default function HistoryTab() {
  const { accessToken, orgSlug, branding } = useApp();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // election open in modal

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchElectionHistory(accessToken, orgSlug);
        setHistory(data.elections);
      } catch (err) {
        console.error("History load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, orgSlug]);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">
          Election History
        </h3>
        <p className="text-xs leading-[18px] text-slate-600 mt-0.5">
          All concluded elections for your organization
        </p>
      </div>

      {/* ── History List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <VBLoader size="lg" label="Loading history..." />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900">
            No concluded elections yet
          </p>
          <p className="text-xs leading-[18px] text-slate-600 mt-1 max-w-sm mx-auto">
            Once an election ends, it will appear here with full results,
            turnout stats, and winner information.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((election) => (
            <div
              key={election.id}
              className="bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Logo / initials */}
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="logo"
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-semibold text-white">
                      {branding?.institutionName?.slice(0, 2).toUpperCase() ||
                        "VB"}
                    </span>
                  </div>
                )}

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">
                    {election.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(election.startedAt)}
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Users className="w-3 h-3 text-slate-400" />
                      {election.votesCast}/{election.totalVoters} voted
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <BarChart3 className="w-3 h-3 text-slate-400" />
                      {election.turnout}% turnout
                    </span>
                  </div>
                </div>

                {/* Quick winner preview */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  {election.winners.slice(0, 2).map((w) => (
                    <div
                      key={w.position}
                      className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1"
                    >
                      <Trophy className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-blue-700 truncate max-w-[100px]">
                        {w.winner}
                      </span>
                    </div>
                  ))}
                  {election.winners.length > 2 && (
                    <span className="text-[11px] font-medium text-slate-400">
                      +{election.winners.length - 2} more
                    </span>
                  )}
                </div>

                {/* View button */}
                <button
                  onClick={() => setSelected(election)}
                  title="View the full election report"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer shrink-0"
                >
                  View <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Slim turnout bar at bottom of card */}
              <div className="px-5 pb-4">
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1 rounded-full"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {selected && (
        <ElectionDetailModal
          election={selected}
          branding={branding}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
