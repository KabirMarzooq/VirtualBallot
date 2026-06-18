import {
  Activity,
  Archive,
  CheckCircle,
  Circle,
  ArrowRight,
  Palette,
  UserSquare2,
  Users,
  Vote,
} from "lucide-react";
import { getMeta } from "../../constants";
import { getPositions, getTurnout } from "../../utils";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function OverviewTab({ onSwitchTab }) {
  const {
    users,
    candidates,
    electionConfig,
    electionHistory,
    timeLeft,
    activityLog,
    branding,
  } = useApp();
  const { total, accredited, voted, pct } = getTurnout(users);
  const isRosterless = electionConfig.votingMode === "OPEN";
  const totalVotesCast = candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
  const positions = getPositions(candidates);

  // Determine setup completion — drives the checklist
  const hasBranding = !!(branding?.electionName || branding?.institutionName);
  const hasCandidates = candidates.length > 0;
  const hasVoters = total > 0;
  const isReadyToStart = hasBranding && hasCandidates && hasVoters;
  const isFirstTime =
    !hasBranding &&
    !hasCandidates &&
    !hasVoters &&
    electionConfig.status === "NOT_STARTED" &&
    activityLog.length === 0;

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* ── Setup checklist — only shown when election hasn't started yet ── */}
      {electionConfig.status === "NOT_STARTED" && (
        <div
          className={`rounded-2xl border p-6 ${
            isReadyToStart
              ? "bg-green-900/20 border-green-700/40"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-white font-black text-lg">
                {isFirstTime
                  ? "Welcome! Let's set up your election 👋"
                  : isReadyToStart
                  ? "You're ready to start the election ✓"
                  : "Complete setup before starting"}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                {isFirstTime
                  ? "Complete these steps in order and you'll be ready to go."
                  : isReadyToStart
                  ? "All steps complete. Head to the Election tab to set a timer and go live."
                  : "Finish the remaining steps below before starting the election."}
              </p>
            </div>
            {isReadyToStart && (
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-white fill-white" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {[
              {
                done: hasBranding,
                icon: Palette,
                label: "Add your organization branding",
                sub: "Set your election name, institution name, and logo",
                tab: "branding",
                cta: "Go to Branding →",
              },
              {
                done: hasCandidates,
                icon: UserSquare2,
                label: "Add candidates",
                sub: `${candidates.length} candidate${
                  candidates.length !== 1 ? "s" : ""
                } added${
                  hasCandidates ? "" : " — add at least one per position"
                }`,
                tab: "candidates",
                cta: "Go to Candidates →",
              },
              {
                done: hasVoters,
                icon: Users,
                label: "Upload voter roster",
                sub: `${total} voter${total !== 1 ? "s" : ""} registered${
                  hasVoters ? "" : " — upload a CSV file to add eligible voters"
                }`,
                tab: "voters",
                cta: "Go to Voters →",
              },
              {
                done: false, // always shows — it's the final action
                icon: Vote,
                label: "Start the election",
                sub: isReadyToStart
                  ? "Set a duration and go live"
                  : "Complete the steps above first",
                tab: "election",
                cta: "Go to Election →",
                locked: !isReadyToStart,
              },
            ].map(({ done, icon: Icon, label, sub, tab, cta, locked }) => (
              <div
                key={label}
                className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  done
                    ? "bg-green-900/20 border border-green-800/40"
                    : locked
                    ? "bg-slate-700/30 border border-slate-700/30 opacity-50"
                    : "bg-slate-700/50 border border-slate-600/50 hover:border-slate-500"
                }`}
              >
                {/* Check / circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-green-500"
                      : locked
                      ? "bg-slate-700"
                      : "bg-slate-600"
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${
                        locked ? "text-slate-600" : "text-slate-300"
                      }`}
                    />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      done
                        ? "text-green-300 line-through decoration-green-600"
                        : locked
                        ? "text-slate-500"
                        : "text-white"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>

                {/* CTA button — only when not done and not locked */}
                {!done && !locked && (
                  <button
                    onClick={() => onSwitchTab?.(tab)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Go to ${tab} tab`}
                  >
                    {cta} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI strip */}
      {/* KPI strip */}
      <div
        className={`grid gap-3 ${
          isRosterless ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5"
        }`}
      >
        {(isRosterless
          ? [
              {
                label: "Total Votes",
                value: totalVotesCast,
                color: "text-green-300",
                bg: "bg-blue-600",
              },
              {
                label: "Candidates",
                value: candidates.length,
                color: "text-indigo-300",
                bg: "bg-slate-800",
              },
            ]
          : [
              {
                label: "Registered",
                value: total,
                color: "text-white",
                bg: "bg-blue-600",
              },
              {
                label: "Accredited",
                value: accredited,
                color: "text-blue-200",
                bg: "bg-slate-800",
              },
              {
                label: "Votes Cast",
                value: voted,
                color: "text-green-300",
                bg: "bg-slate-800",
              },
              {
                label: "Turnout",
                value: `${pct}%`,
                color: "text-amber-300",
                bg: "bg-slate-800",
              },
              {
                label: "Candidates",
                value: candidates.length,
                color: "text-indigo-300",
                bg: "bg-slate-800",
              },
            ]
        ).map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-2xl p-5 border border-white/10`}
          >
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p className={`text-4xl font-mono font-bold ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status + turnout bar */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                electionConfig.status === "ACTIVE"
                  ? "bg-green-500 animate-pulse"
                  : electionConfig.status === "ENDED"
                  ? "bg-red-500"
                  : "bg-amber-500"
              }`}
            />
            <span className="font-bold text-white uppercase text-sm">
              {electionConfig.status.replace("_", " ")}
            </span>
            {electionConfig.status === "ACTIVE" && (
              <span className="font-mono text-blue-400 text-sm">
                {timeLeft}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {electionConfig.isPublished && (
              <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
                Broadcasting
              </span>
            )}
            {electionConfig.registryLocked && (
              <span className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30">
                Registry Locked
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {voted} of {total} voters have cast their ballot
        </p>
      </div>

      {/* Live tally per position */}
      {candidates.some((c) => c.votes > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {positions.map((pos) => {
            const pcs = candidates
              .filter((c) => c.position === pos)
              .sort((a, b) => b.votes - a.votes);
            const tot = pcs.reduce((s, c) => s + c.votes, 0);
            return (
              <div
                key={pos}
                className="bg-slate-800 rounded-2xl p-5 border border-slate-700"
              >
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  {pos}
                </p>
                {pcs.map((c, i) => {
                  const pct = tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                  return (
                    <div key={c.id} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          {i === 0 && tot > 0 && (
                            <span className="text-yellow-400 text-xs">★</span>
                          )}
                          <span className="text-sm font-bold text-white">
                            {c.name}
                          </span>
                        </div>
                        <span className="text-sm font-mono text-slate-400">
                          {c.votes} · {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${c.color} h-2 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Activity feed */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">
              Recent Activity
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {activityLog.length} total events
          </span>
        </div>
        <div className="divide-y divide-slate-700/50 max-h-56 overflow-y-auto">
          {activityLog.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No activity yet.
            </p>
          ) : (
            [...activityLog]
              .reverse()
              .slice(0, 8)
              .map((e) => {
                const meta = getMeta(e.type);
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-slate-700/20"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {e.message}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {e.timestamp}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              })
          )}
        </div>
        {activityLog.length > 8 && (
          <div className="px-5 py-2 border-t border-slate-700 text-center">
            <span className="text-xs text-slate-500">
              +{activityLog.length - 8} more in Audit Log tab
            </span>
          </div>
        )}
      </div>

      {/* Past elections */}
      {electionHistory.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-white">Past Elections</span>
          </div>
          {electionHistory.map((a) => (
            <div
              key={a.id}
              className="px-5 py-4 border-b border-slate-700/50 last:border-0"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400">{a.date}</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full font-mono">
                  {a.totalVotes} votes
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {getPositions(a.candidates).map((pos) => {
                  const w = a.candidates
                    .filter((c) => c.position === pos)
                    .sort((a, b) => b.votes - a.votes)[0];
                  return (
                    <div key={pos} className="bg-slate-700/50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">
                        {pos}
                      </p>
                      <div className="flex items-center gap-2">
                        {w && (
                          <img
                            src={w.image}
                            className="w-6 h-6 rounded-full"
                            alt=""
                          />
                        )}
                        <p className="text-sm font-bold text-white">
                          {w?.name ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
