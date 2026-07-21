import {
  Activity,
  Archive,
  Check,
  ArrowRight,
  Lock,
  Palette,
  UserSquare2,
  Users,
  Vote,
} from "lucide-react";
import { getMeta } from "../../constants";
import { getPositions, getTurnout } from "../../utils";
import { useApp } from "../../context/AppContext";

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

  const steps = [
    {
      done: hasBranding,
      icon: Palette,
      label: "Add your organization branding",
      sub: "Set your election name, institution name, and logo",
      tab: "branding",
      cta: "Go to Branding",
    },
    {
      done: hasCandidates,
      icon: UserSquare2,
      label: "Add candidates",
      sub: `${candidates.length} candidate${
        candidates.length !== 1 ? "s" : ""
      } added${hasCandidates ? "" : " — add at least one per position"}`,
      tab: "candidates",
      cta: "Go to Candidates",
    },
    {
      done: hasVoters,
      icon: Users,
      label: "Upload voter roster",
      sub: `${total} voter${total !== 1 ? "s" : ""} registered${
        hasVoters ? "" : " — upload a CSV file to add eligible voters"
      }`,
      tab: "voters",
      cta: "Go to Voters",
    },
    {
      done: false, // always shows — it's the final action
      icon: Vote,
      label: "Start the election",
      sub: isReadyToStart
        ? "Set a duration and go live"
        : "Locked — complete the steps above first",
      tab: "election",
      cta: "Go to Election",
      locked: !isReadyToStart,
    },
  ];
  // The single next actionable step gets the blue treatment and solid CTA
  const nextStep = steps.findIndex((s) => !s.done && !s.locked);

  const statusDot =
    electionConfig.status === "ACTIVE"
      ? "bg-green-500 animate-pulse"
      : electionConfig.status === "ENDED"
      ? "bg-red-500"
      : "bg-amber-500";

  const kpis = isRosterless
    ? [
        { label: "Total votes", value: totalVotesCast, hero: true },
        { label: "Candidates", value: candidates.length, hero: false },
      ]
    : [
        { label: "Registered", value: total, hero: false },
        { label: "Accredited", value: accredited, hero: false },
        { label: "Votes cast", value: voted, hero: true },
        { label: "Turnout", value: `${pct}%`, hero: false },
        { label: "Candidates", value: candidates.length, hero: false },
      ];

  return (
    <div className="space-y-4">
      {/* ── Setup checklist — only shown when election hasn't started yet ── */}
      {electionConfig.status === "NOT_STARTED" && (
        <div
          className={`rounded-xl border p-5 ${
            isReadyToStart
              ? "bg-green-50 border-green-200"
              : "bg-white border-slate-200"
          }`}
        >
          <h3 className="text-base leading-6 font-semibold text-slate-900">
            {isFirstTime
              ? "Welcome! Let's set up your election"
              : isReadyToStart
              ? "You're ready to start the election"
              : "Complete setup before starting"}
          </h3>
          <p className="text-[13px] leading-5 text-slate-600 mt-1 mb-4">
            {isFirstTime
              ? "Complete these steps in order and you'll be ready to go."
              : isReadyToStart
              ? "All steps complete. Head to the Election tab to set a timer and go live."
              : "Finish the remaining steps below, then start the election from the Election tab."}
          </p>

          <div className="space-y-2">
            {steps.map(({ done, icon: Icon, label, sub, tab, cta, locked }, i) => {
              const isNext = i === nextStep;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    done
                      ? "bg-green-50 border-green-200"
                      : locked
                      ? "bg-white border-slate-200"
                      : isNext
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Check / icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-green-600 text-white"
                        : locked
                        ? "bg-slate-100 text-slate-400"
                        : isNext
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {done ? (
                      <Check className="w-4 h-4" strokeWidth={2.4} />
                    ) : locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-5 font-semibold ${
                        locked ? "text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {label}
                    </p>
                    <p
                      className={`text-[11px] leading-4 mt-0.5 ${
                        locked ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {sub}
                    </p>
                  </div>

                  {/* Right side: done mark or CTA */}
                  {done ? (
                    <span className="text-[11px] font-semibold text-green-600 shrink-0">
                      ✓ Done
                    </span>
                  ) : (
                    !locked && (
                      <button
                        onClick={() => onSwitchTab?.(tab)}
                        title={`Open the ${tab} tab`}
                        className={`inline-flex items-center gap-1 text-xs font-semibold min-h-[32px] px-3 rounded-lg shrink-0 transition-all cursor-pointer ${
                          isNext
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {cta} <ArrowRight className="w-3 h-3" />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div
        className={`grid gap-3 ${
          isRosterless ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5"
        }`}
      >
        {kpis.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-4 ${
              s.hero ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                s.hero ? "text-blue-100" : "text-slate-600"
              }`}
            >
              {s.label}
            </p>
            <p
              className={`text-[28px] leading-9 font-semibold tabular-nums mt-1 ${
                s.hero ? "text-white" : "text-slate-900"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status + participation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-900">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
            {electionConfig.status.replace("_", " ")}
          </span>
          {electionConfig.status === "ACTIVE" && timeLeft && (
            <span className="font-mono text-[13px] font-semibold text-blue-700">
              {timeLeft} remaining
            </span>
          )}
          <span className="flex-1" />
          {electionConfig.isPublished && (
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              Broadcasting results
            </span>
          )}
          {electionConfig.registryLocked && (
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
              Registry locked
            </span>
          )}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs leading-4 text-slate-600 mt-2">
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
                className="bg-white border border-slate-200 rounded-xl"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h4 className="text-[13px] font-semibold text-slate-900">
                    {pos}
                  </h4>
                  <span className="text-[11px] text-slate-600">
                    {tot} vote{tot !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4">
                  {pcs.map((c, i) => {
                    const cpct =
                      tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                    const lead = i === 0 && tot > 0;
                    return (
                      <div key={c.id} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[13px] font-semibold text-slate-800 flex items-center gap-2 min-w-0">
                            <span className="truncate">{c.name}</span>
                            {lead && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-px rounded-full shrink-0">
                                Leading
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                            {c.votes} · {cpct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              lead ? "bg-blue-600" : "bg-slate-400"
                            }`}
                            style={{ width: `${cpct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity feed */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h4 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Recent activity
          </h4>
          <span className="text-[11px] text-slate-400">
            {activityLog.length} total events
          </span>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {activityLog.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">
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
                    className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={`mt-[5px] w-2 h-2 rounded-full shrink-0 ${meta.dot}`}
                    />
                    <p className="flex-1 min-w-0 text-[13px] leading-5 text-slate-800 truncate">
                      {e.message}
                    </p>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${meta.lightBadge}`}
                    >
                      {meta.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 mt-0.5">
                      {e.timestamp}
                    </span>
                  </div>
                );
              })
          )}
        </div>
        {activityLog.length > 8 && (
          <p className="px-4 py-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
            +{activityLog.length - 8} more in the Audit Log tab
          </p>
        )}
      </div>

      {/* Past elections */}
      {electionHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-400" />
            <h4 className="text-[13px] font-semibold text-slate-900">
              Past elections
            </h4>
          </div>
          {electionHistory.map((a) => (
            <div
              key={a.id}
              className="px-4 py-4 border-b border-slate-100 last:border-0"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-600">{a.date}</span>
                <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {a.totalVotes} votes
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {getPositions(a.candidates).map((pos) => {
                  const w = a.candidates
                    .filter((c) => c.position === pos)
                    .sort((x, y) => y.votes - x.votes)[0];
                  return (
                    <div
                      key={pos}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                        {pos}
                      </p>
                      <div className="flex items-center gap-2">
                        {w && (
                          <img
                            src={w.image}
                            className="w-6 h-6 rounded-full object-cover bg-slate-200"
                            alt=""
                          />
                        )}
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
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
