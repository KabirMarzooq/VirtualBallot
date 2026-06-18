import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Activity, Wifi, WifiOff } from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * VotePulse — live vote display.
 *
 * Shows each candidate as a lane. When a vote lands:
 *  - The bar grows smoothly to the new percentage
 *  - A "pulse" ring ripples out from the candidate avatar
 *  - A flash counter ticks up briefly
 *  - A live feed at the bottom logs each vote event with a timestamp
 *
 * Props:
 *   electionId  — the election to subscribe to
 *   initialCandidates — candidate list from the last REST fetch
 *                        (used as starting state before WS kicks in)
 */
export default function VotePulse({ electionId, initialCandidates = [] }) {
  const socketRef = useRef(null);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [connected, setConnected] = useState(false);
  const [pulsing, setPulsing] = useState({}); // { candidateId: true } briefly
  const [feed, setFeed] = useState([]); // recent vote events
  const [totalVotes, setTotalVotes] = useState(0);

  // Re-sync local state whenever the parent provides fresh data (poll updates)
  useEffect(() => {
    if (initialCandidates && initialCandidates.length > 0) {
      setCandidates(initialCandidates);
    }
  }, [initialCandidates]);

  // Compute total once from candidates
  useEffect(() => {
    const sum = candidates.reduce(
      (acc, c) => acc + (c.vote_count ?? c.votes ?? 0),
      0
    );
    setTotalVotes(sum);
  }, [candidates]);

  // Connect to Socket.io and join the election room
  useEffect(() => {
    if (!electionId) return;

    const socket = io(BASE, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:election", electionId);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
      setConnected(false);
    });

    socket.on("disconnect", () => setConnected(false));

    // reconnect fires on the manager (socket.io), not the socket itself
    socket.io.on("reconnect", () => {
      setConnected(true);
      socket.emit("join:election", electionId);
    });

    socket.on("connect_error", () => setConnected(false));

    socket.on("vote:update", (data) => {
      if (data.electionId !== electionId) return;

      // Map backend field names to what the UI uses
      const updated = data.candidates.map((c) => ({
        ...c,
        votes: c.vote_count,
        image: c.image_url,
      }));

      // Use the functional form so we always compare against the LATEST state,
      // not a stale closure from when the effect first ran
      setCandidates((prevCandidates) => {
        const prevMap = prevCandidates.reduce((acc, c) => {
          acc[c.id] = c.vote_count ?? c.votes ?? 0;
          return acc;
        }, {});

        updated.forEach((c) => {
          if ((c.vote_count ?? 0) > (prevMap[c.id] ?? 0)) {
            setPulsing((p) => ({ ...p, [c.id]: true }));
            setTimeout(
              () => setPulsing((p) => ({ ...p, [c.id]: false })),
              1200
            );

            setFeed((f) =>
              [
                {
                  id: data.receiptId,
                  candidate: c.name,
                  position: c.position,
                  time: new Date(data.timestamp).toLocaleTimeString(),
                },
                ...f,
              ].slice(0, 12)
            );
          }
        });

        return updated;
      });

      const newTotal = updated.reduce((acc, c) => acc + c.vote_count, 0);
      setTotalVotes(newTotal);
    });

    return () => {
      socket.emit("leave:election", electionId);
      socket.disconnect();
    };
  }, [electionId]);

  // Group candidates by position
  const positions = [...new Set(candidates.map((c) => c.position))];

  return (
    <div className="space-y-6">
      {/* Connection status bar */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
          connected
            ? "bg-green-900/30 border border-green-700/40 text-green-400"
            : "bg-slate-800 border border-slate-700 text-slate-500"
        }`}
      >
        {connected ? (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live — votes appear here in real time
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            Connecting to live feed…
          </>
        )}
        <span className="ml-auto font-mono">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
        </span>
      </div>

      {/* Candidate lanes per position */}
      {positions.map((pos) => {
        const posCandidates = candidates
          .filter((c) => c.position === pos)
          .sort(
            (a, b) =>
              (b.vote_count ?? b.votes ?? 0) - (a.vote_count ?? a.votes ?? 0)
          );
        const posTotal = posCandidates.reduce(
          (s, c) => s + (c.vote_count ?? c.votes ?? 0),
          0
        );

        return (
          <div
            key={pos}
            className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {pos}
              </p>
              <span className="text-xs font-mono text-slate-500">
                {posTotal} votes
              </span>
            </div>

            <div className="p-4 space-y-4">
              {posCandidates.map((c, i) => {
                const votes = c.vote_count ?? c.votes ?? 0;
                const pct =
                  posTotal > 0 ? Math.round((votes / posTotal) * 100) : 0;
                const isLead = i === 0 && posTotal > 0;
                const pulse = pulsing[c.id];

                return (
                  <div key={c.id} className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Avatar with pulse ring */}
                      <div className="relative shrink-0">
                        <img
                          src={c.image || c.image_url}
                          alt={c.name}
                          className={`w-10 h-10 rounded-xl object-cover bg-slate-700 transition-transform duration-300 ${
                            pulse ? "scale-110" : "scale-100"
                          }`}
                        />
                        {/* Pulse ripple ring */}
                        {pulse && (
                          <span className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-ping" />
                        )}
                        {/* Leading crown */}
                        {isLead && posTotal > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 text-[10px]">
                            ⭐
                          </span>
                        )}
                      </div>

                      {/* Name + flash counter */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold truncate ${
                              isLead ? "text-white" : "text-slate-300"
                            }`}
                          >
                            {c.name}
                          </span>
                          {pulse && (
                            <span className="text-[10px] font-black text-blue-400 bg-blue-900/40 px-1.5 py-0.5 rounded-full animate-pulse">
                              +1
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vote count + percentage */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-2xl font-black font-mono tabular-nums ${
                            isLead ? "text-white" : "text-slate-400"
                          }`}
                        >
                          {pct}%
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {votes} votes
                        </p>
                      </div>
                    </div>

                    {/* Progress bar — animates smoothly on update */}
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${c.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Live vote feed */}
      {feed.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
              Live Vote Feed
            </span>
            <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="divide-y divide-slate-700/40 max-h-56 overflow-y-auto">
            {feed.map((event, i) => (
              <div
                key={`${event.id}-${i}`}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-700/20 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white font-bold">
                    {event.candidate}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {" "}
                    received a vote
                  </span>
                  <span className="text-xs text-slate-600 ml-1.5">
                    ({event.position})
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state before any votes */}
      {candidates.length > 0 && totalVotes === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-500 font-bold text-sm">
            Waiting for first vote…
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Bars will animate as votes come in
          </p>
        </div>
      )}
    </div>
  );
}
