import {
  BarChart3,
  ScrollText,
  Activity,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
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
      <div className="space-y-4">
        {/* Live indicator banner */}
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <p className="text-xs text-green-300 font-medium">
            Live feed active — votes appear here as they are cast
          </p>
        </div>

        {/* Not yet broadcast warning */}
        {!electionConfig.isPublished && (
          <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-700/30 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium">
              Results are not yet publicly broadcast. This tally is visible to
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
    <div className="space-y-5">
      {positions.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">
          No candidates have been added yet.
        </p>
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
              className="bg-slate-800 rounded-2xl p-5 border border-slate-700"
            >
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {pos}
                </p>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {tot} vote{tot !== 1 ? "s" : ""} recorded
                </span>
              </div>
              <div className="space-y-4">
                {pcs.map((c, i) => {
                  const pct = tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-8 h-8 rounded-lg object-cover bg-slate-700 shrink-0"
                          />
                          <div className="flex items-center gap-2">
                            {i === 0 && tot > 0 && !tied && (
                              <span className="text-yellow-400 text-xs">★</span>
                            )}
                            {tied && c.votes === topVotes && (
                              <span className="text-amber-400 text-xs">⚖</span>
                            )}
                            <span className="text-sm font-bold text-white">
                              {c.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-slate-400">
                            {c.votes} votes
                          </span>
                          <span className="text-sm font-black text-white w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                          className={`bg-gradient-to-r ${c.color} h-2.5 rounded-full transition-all duration-700`}
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

      {/* Ended state message */}
      {electionConfig.status === "ENDED" && (
        <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <p className="text-xs text-slate-400 font-medium">
            Election has ended. These are the final results.
          </p>
        </div>
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-teal-900/20 border border-teal-700/30 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
        <p className="text-xs text-teal-300">
          Voter identities are masked for privacy. Each row confirms a unique
          vote was recorded.
        </p>
      </div>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700">
          <span className="col-span-1">#</span>
          <span className="col-span-5">Voter (masked)</span>
          <span className="col-span-4">Time</span>
          <span className="col-span-2 text-center">Status</span>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/40">
          {ledger.length === 0 ? (
            <div className="py-12 text-center">
              <ScrollText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No votes cast yet.</p>
            </div>
          ) : (
            ledger.map((row) => (
              <div
                key={row.seq}
                className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-slate-700/20"
              >
                <span className="col-span-1 text-xs font-mono text-slate-600">
                  {row.seq}
                </span>
                <span className="col-span-5 font-mono text-sm text-slate-300">
                  {row.matric}
                </span>
                <span className="col-span-4 text-xs text-slate-500 font-mono">
                  {row.votedAt}
                </span>
                <div className="col-span-2 flex justify-center">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-700/30">
                    <CheckCircle className="w-2.5 h-2.5" /> Recorded
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-700 text-xs text-slate-600 flex justify-between">
          <span>
            {ledger.length} vote{ledger.length !== 1 ? "s" : ""} recorded
          </span>
          <span>Read-only · Observer access</span>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Stream ──────────────────────────────────────────────────────────────
export function AuditStreamTab() {
  const { activityLog } = useApp();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-teal-900/20 border border-teal-700/30 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
        <p className="text-xs text-teal-300">
          Live read-only feed of all system events. Observer cannot modify or
          clear this log.
        </p>
      </div>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-6">Event</span>
          <span className="col-span-2">Time</span>
          <span className="col-span-1">Date</span>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/40">
          {activityLog.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No events yet.</p>
            </div>
          ) : (
            [...activityLog].reverse().map((e) => {
              const meta = getMeta(e.type);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-5 py-3 items-start hover:bg-slate-700/20"
                >
                  <span className="col-span-1 text-xs font-mono text-slate-600 pt-0.5">
                    {e.id}
                  </span>
                  <span className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                      />
                      {meta.label}
                    </span>
                  </span>
                  <span className="col-span-6 text-sm text-slate-300 leading-snug">
                    {e.message}
                  </span>
                  <span className="col-span-2 text-xs font-mono text-slate-500 pt-0.5">
                    {e.timestamp}
                  </span>
                  <span className="col-span-1 text-[10px] text-slate-600 pt-0.5">
                    {e.date}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-700 text-xs text-slate-600 flex justify-between">
          <span>{activityLog.length} events in log</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

export const OBSERVER_TABS = [
  { id: "tally", label: "Live Tally", icon: BarChart3, Component: TallyTab },
  {
    id: "ledger",
    label: "Vote Ledger",
    icon: ScrollText,
    Component: LedgerTab,
  },
  {
    id: "log",
    label: "Audit Stream",
    icon: Activity,
    Component: AuditStreamTab,
  },
];
