import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Activity } from "lucide-react";

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
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      {/* Header: title + connection status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> Vote Pulse
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
            connected ? "text-green-600" : "text-slate-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-green-600 animate-pulse" : "bg-slate-400"
            }`}
          />
          {connected ? "Connected" : "Connecting…"}
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
          <div key={pos} className="mt-4 first:mt-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">
                {pos}
              </p>
              <span className="text-[11px] font-mono text-slate-600">
                {posTotal} vote{posTotal !== 1 ? "s" : ""}
              </span>
            </div>

            {posCandidates.map((c, i) => {
              const votes = c.vote_count ?? c.votes ?? 0;
              const pct =
                posTotal > 0 ? Math.round((votes / posTotal) * 100) : 0;
              const isLead = i === 0 && posTotal > 0;
              const pulse = pulsing[c.id];

              return (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  {/* Avatar with pulse ring */}
                  <div className="relative shrink-0">
                    <img
                      src={c.image || c.image_url}
                      alt={c.name}
                      className={`w-9 h-9 rounded-lg object-cover bg-slate-200 transition-transform duration-300 ${
                        pulse ? "scale-110" : "scale-100"
                      }`}
                    />
                    {pulse && (
                      <span className="absolute -inset-1 rounded-xl border-2 border-blue-500 animate-ping" />
                    )}
                  </div>

                  {/* Name + flash counter + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px] font-semibold text-slate-800 truncate">
                        {c.name}
                      </span>
                      {pulse && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full animate-pulse">
                          +1
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isLead ? "bg-blue-600" : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Vote count */}
                  <span
                    title={`${pct}% of ${pos} votes`}
                    className="text-xs font-mono font-semibold text-slate-800 tabular-nums shrink-0"
                  >
                    {votes}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Live vote feed */}
      {feed.length > 0 && (
        <div className="border-t border-slate-100 mt-3 pt-3 max-h-40 overflow-y-auto">
          {feed.map((event, i) => (
            <p
              key={`${event.id}-${i}`}
              className={`font-mono text-[11px] leading-5 ${
                i === 0 ? "text-slate-600 vb-fade-in" : "text-slate-400"
              }`}
            >
              <span className="font-semibold text-slate-600">{event.time}</span>{" "}
              · Vote recorded — {event.position}
            </p>
          ))}
        </div>
      )}

      {/* Empty state before any votes */}
      {candidates.length > 0 && totalVotes === 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-[13px] font-semibold text-slate-600">
            Waiting for the first vote…
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Bars animate as votes come in
          </p>
        </div>
      )}
    </div>
  );
}
