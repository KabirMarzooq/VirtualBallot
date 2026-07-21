import {
  BarChart3,
  ScrollText,
  Activity,
  ShieldCheck,
  Info,
  AlertTriangle,
  Check,
} from "lucide-react";
import { getMeta } from "../../constants";
import VotePulse from "../results/VotePulse";
import { useApp } from "../../context/AppContext";
import { getPositions, maskMatric } from "../../utils";

// ─── Live Tally ────────────────────────────────────────────────────────────────
export function TallyTab() {
  const { candidates, electionConfig, electionId } = useApp();
  const positions = getPositions(candidates);

  // When election is ACTIVE → show the live VotePulse display
  if (electionConfig.status === "ACTIVE") {
    return (
      <div className="space-y-3">
        {/* Live indicator banner */}
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <p className="text-xs leading-4 font-medium text-green-700">
            Live feed active — votes appear here as they are cast.
          </p>
        </div>

        {/* Not yet broadcast warning */}
        {!electionConfig.isPublished && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs leading-4 font-medium text-amber-800">
              Results are not yet publicly broadcast — this tally is visible to
              observers only.
            </p>
          </div>
        )}

        {/* Live pulse component */}
        <VotePulse electionId={electionId} initialCandidates={candidates} />
      </div>
    );
  }

  // When election is NOT_STARTED or ENDED → show the static tally
  return (
    <div className="space-y-3">
      {electionConfig.status === "ENDED" && (
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <p className="text-xs leading-4 font-medium text-slate-800">
            The election has ended — these are the final recorded results.
          </p>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-[13px] text-slate-600">
            No candidates have been added yet.
          </p>
        </div>
      ) : (
        positions.map((pos) => {
          const pcs = candidates
            .filter((c) => c.position === pos)
            .sort((a, b) => b.votes - a.votes);
          const tot = pcs.reduce((s, c) => s + c.votes, 0);
          const topVotes = pcs[0]?.votes ?? 0;
          const tiedGroup =
            topVotes > 0 ? pcs.filter((c) => c.votes === topVotes) : [];
          const tied = tiedGroup.length > 1;
          return (
            <div
              key={pos}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                  {pos}
                </p>
                <span className="font-mono text-[11px] text-slate-600">
                  {tot} vote{tot !== 1 ? "s" : ""} recorded
                </span>
              </div>
              <div className="p-4">
                {pcs.map((c, i) => {
                  const pct = tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                  const isLead = i === 0 && tot > 0 && !tied;
                  const isTied = tied && c.votes === topVotes;
                  return (
                    <div key={c.id} className="mb-3 last:mb-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-200 shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                          <span className="truncate">{c.name}</span>
                          {isLead && (
                            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-px rounded-full shrink-0">
                              Leading
                            </span>
                          )}
                          {isTied && (
                            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-white bg-amber-600 px-1.5 py-px rounded-full shrink-0">
                              Tied
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                          {c.votes} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-[42px]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isLead
                              ? "bg-blue-600"
                              : isTied
                              ? "bg-amber-600"
                              : "bg-slate-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Vote Ledger ───────────────────────────────────────────────────────────────
export function LedgerTab() {
  const { users } = useApp();
  const ledger = users
    .filter((u) => u.hasVoted && u.role !== "ADMIN" && u.votedAt)
    .map((u, i) => ({
      seq: i + 1,
      matric: maskMatric(u.matric),
      votedAt: u.votedAt,
    }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <p className="text-xs leading-4 font-medium text-slate-800">
          Voter identities are masked for privacy. Each row confirms one unique
          vote was recorded.
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
          <span className="col-span-1">#</span>
          <span className="col-span-5">Voter (masked)</span>
          <span className="col-span-4">Time</span>
          <span className="col-span-2 text-center">Status</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {ledger.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ScrollText className="w-5 h-5" />
              </div>
              <p className="text-[13px] text-slate-600">No votes cast yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Rows appear here the moment ballots are recorded.
              </p>
            </div>
          ) : (
            ledger.map((row) => (
              <div
                key={row.seq}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <span className="col-span-1 font-mono text-[11px] text-slate-400">
                  {row.seq}
                </span>
                <span className="col-span-5 font-mono text-[13px] text-slate-800">
                  {row.matric}
                </span>
                <span className="col-span-4 font-mono text-[11px] text-slate-600">
                  {row.votedAt}
                </span>
                <div className="col-span-2 flex justify-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} /> Recorded
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
          <span>
            {ledger.length} vote{ledger.length !== 1 ? "s" : ""} recorded
          </span>
          <span>Read-only · observer access</span>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Stream ──────────────────────────────────────────────────────────────
export function AuditStreamTab() {
  const { activityLog } = useApp();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <p className="text-xs leading-4 font-medium text-slate-800">
          Live read-only feed of every system event. Observers cannot modify or
          clear this log.
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-6">Event</span>
          <span className="col-span-2">Time</span>
          <span className="col-span-1">Date</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-[13px] text-slate-600">No events yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Every admin action, vote, and system event lands here.
              </p>
            </div>
          ) : (
            [...activityLog].reverse().map((e) => {
              const meta = getMeta(e.type);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 items-start border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <span className="col-span-1 font-mono text-[11px] text-slate-400 pt-0.5">
                    {e.id}
                  </span>
                  <span className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${meta.lightBadge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </span>
                  <span className="col-span-6 text-[13px] leading-5 text-slate-800">
                    {e.message}
                  </span>
                  <span className="col-span-2 font-mono text-[11px] text-slate-600 pt-0.5">
                    {e.timestamp}
                  </span>
                  <span className="col-span-1 text-[11px] text-slate-400 pt-0.5">
                    {e.date}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center">
          <span>{activityLog.length} events in log</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

export const OBSERVER_TABS = [
  { id: "tally", label: "Live tally", icon: BarChart3, Component: TallyTab },
  {
    id: "ledger",
    label: "Vote ledger",
    icon: ScrollText,
    Component: LedgerTab,
  },
  {
    id: "log",
    label: "Audit stream",
    icon: Activity,
    Component: AuditStreamTab,
  },
];
