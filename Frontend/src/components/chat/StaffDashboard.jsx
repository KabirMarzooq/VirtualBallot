import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import {
  SendHorizonal,
  Zap,
  Hand,
  CheckCircle2,
  FileText,
  ChevronDown,
  Lightbulb,
  X,
  LogOut,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  BASE,
  staffLogin,
  getStaffElections,
  getChatQueue,
  claimChat,
  releaseChat,
  resolveChat,
  replyChat,
  getCannedReplies,
  getChatTranscript,
} from "../../api";

// Status badge palette for the election picker.
const STATUS_BADGE = {
  ACTIVE: "bg-green-500/20 text-green-400",
  ENDED: "bg-slate-600/30 text-slate-400",
  NOT_STARTED: "bg-amber-500/20 text-amber-400",
};

/**
 * StaffDashboard — full live-support console for committee/staff members.
 * Standalone route (/staff/chat) with its own login; manages its own socket.
 */

// ── Session storage keys ─────────────────────────────────────────────────────
const SS = {
  token: "vb_staff_token",
  id: "vb_staff_id",
  name: "vb_staff_name",
  org: "vb_staff_org",
};

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Normalize a queue row (from REST or from a socket escalation) to one shape.
function normalizeConvo(raw) {
  return {
    id: raw.id || raw.conversationId,
    status: raw.status || "escalated",
    is_urgent: raw.is_urgent ?? raw.urgent ?? false,
    voter_name: raw.voter_name || raw.voter?.name || "Voter",
    voter_matric: raw.voter_matric || raw.voter?.matric || "",
    last_message: raw.last_message ?? raw.message ?? "",
    last_message_at: raw.last_message_at || new Date().toISOString(),
    assigned_staff_id: raw.assigned_staff_id ?? null,
    assigned_to: raw.assigned_to ?? null,
    election_id: raw.election_id || raw.electionId || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────────
function StaffLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await staffLogin(email.trim(), password);
      sessionStorage.setItem(SS.token, data.accessToken);
      sessionStorage.setItem(SS.id, data.staff.id);
      sessionStorage.setItem(SS.name, data.staff.name);
      sessionStorage.setItem(SS.org, data.staff.orgId);
      onLoggedIn();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-black text-white mb-1">Staff Support</h1>
        <p className="text-slate-500 text-sm mb-6">
          Log in to handle live voter chats.
        </p>

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 mb-4 placeholder:text-slate-600"
          placeholder="you@org.com"
        />

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 mb-2 placeholder:text-slate-600"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-xl py-2 px-3 my-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || !password || loading}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log in"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const token = sessionStorage.getItem(SS.token);
  const staffId = sessionStorage.getItem(SS.id);
  const staffName = sessionStorage.getItem(SS.name);
  const orgId = sessionStorage.getItem(SS.org);

  const initialElection =
    new URLSearchParams(window.location.search).get("electionId") || "";

  const [electionId, setElectionId] = useState(initialElection);
  const [electionInput, setElectionInput] = useState(initialElection);
  const [knownElections, setKnownElections] = useState(
    initialElection ? [initialElection] : []
  );
  const [elections, setElections] = useState([]); // full list from GET /chat/elections

  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState([]);
  const [suggestionsMap, setSuggestionsMap] = useState({}); // convoId -> [{question,answer}]
  const [online, setOnline] = useState([]);
  const [voterTyping, setVoterTyping] = useState(null); // convoId currently typing
  const [freshIds, setFreshIds] = useState(new Set()); // for fade-in animation

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [canned, setCanned] = useState([]);
  const [showCanned, setShowCanned] = useState(false);
  const [transcript, setTranscript] = useState(null); // { conversation, messages }

  const socketRef = useRef(null);
  const threadScroll = useRef(null);
  const typingTimer = useRef(null);

  const selected = useMemo(
    () => queue.find((c) => c.id === selectedId) || null,
    [queue, selectedId]
  );

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === electionId) || null,
    [elections, electionId]
  );

  // ── Helpers to mutate the queue ─────────────────────────────────────────────
  const upsertConvo = useCallback((raw) => {
    const convo = normalizeConvo(raw);
    setQueue((prev) => {
      const idx = prev.findIndex((c) => c.id === convo.id);
      if (idx === -1) return [convo, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...convo };
      return next;
    });
  }, []);

  const removeConvo = useCallback((id) => {
    setQueue((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !orgId) return;
    const socket = io(BASE, {
      transports: ["polling", "websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:chat:org", { orgId, staffId, staffName });
    });

    socket.on("chat:escalated", (p) => {
      // Track the election this escalation belongs to.
      if (p.electionId) {
        setKnownElections((prev) =>
          prev.includes(p.electionId) ? prev : [...prev, p.electionId]
        );
      }
      // Only surface escalations for the election currently being viewed.
      if (electionId && p.electionId && p.electionId !== electionId) return;

      if (p.suggestions) {
        setSuggestionsMap((m) => ({ ...m, [p.conversationId]: p.suggestions }));
      }
      upsertConvo(p);
      setFreshIds((s) => new Set(s).add(p.conversationId));
      setTimeout(() => {
        setFreshIds((s) => {
          const n = new Set(s);
          n.delete(p.conversationId);
          return n;
        });
      }, 800);

      // If it's the open conversation, append the new voter message live.
      setSelectedId((cur) => {
        if (cur === p.conversationId && p.message) {
          setThread((t) => [
            ...t,
            {
              sender_type: "voter",
              content: p.message,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        return cur;
      });
    });

    socket.on("chat:claimed", (p) => {
      upsertConvo({
        id: p.conversationId,
        status: "claimed",
        assigned_staff_id: p.staffId,
        assigned_to: p.staffName,
      });
    });

    socket.on("chat:released", (p) => {
      upsertConvo({
        id: p.conversationId,
        status: "escalated",
        assigned_staff_id: null,
        assigned_to: null,
      });
    });

    socket.on("chat:resolved", (p) => removeConvo(p.conversationId));

    socket.on("voter:typing", (p) => {
      setVoterTyping(p.conversationId);
      setTimeout(
        () => setVoterTyping((cur) => (cur === p.conversationId ? null : cur)),
        3000
      );
    });

    socket.on("staff:presence", (p) => setOnline(p.online || []));

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, electionId]);

  // ── Fetch this org's elections on mount; pre-select the active one ──────────
  useEffect(() => {
    let active = true;
    getStaffElections(token)
      .then((data) => {
        if (!active) return;
        const list = data.elections || [];
        setElections(list);
        if (!initialElection && list.length > 0) {
          const act = list.find((e) => e.status === "ACTIVE");
          const pick = act?.id || list[0].id; // active first, else most recent
          setElectionId(pick);
          setElectionInput(pick);
          setKnownElections((prev) =>
            prev.includes(pick) ? prev : [...prev, pick]
          );
        }
      })
      .catch((err) => console.error("Failed to load staff elections:", err));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pick an election (from the dropdown or the manual fallback input).
  const selectElection = useCallback((eid) => {
    if (!eid) return;
    setElectionId(eid);
    setElectionInput(eid);
    setSelectedId(null);
    setKnownElections((prev) => (prev.includes(eid) ? prev : [...prev, eid]));
  }, []);

  // ── Load queue when an election is chosen ───────────────────────────────────
  const loadQueue = useCallback(
    (eid) => {
      if (!eid) return;
      setLoadingQueue(true);
      getChatQueue(eid, token)
        .then((data) => setQueue((data.queue || []).map(normalizeConvo)))
        .catch(() => setQueue([]))
        .finally(() => setLoadingQueue(false));
    },
    [token]
  );

  useEffect(() => {
    // loadQueue flips a loading flag synchronously; intentional on election change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (electionId) loadQueue(electionId);
  }, [electionId, loadQueue]);

  // ── Load thread when a conversation is selected ─────────────────────────────
  useEffect(() => {
    if (!selectedId) return; // right panel shows a placeholder when nothing selected
    let active = true;
    getChatTranscript(selectedId, token)
      .then((data) => active && setThread(data.messages || []))
      .catch(() => active && setThread([]));
    return () => {
      active = false;
    };
  }, [selectedId, token]);

  useEffect(() => {
    if (threadScroll.current)
      threadScroll.current.scrollTop = threadScroll.current.scrollHeight;
  }, [thread]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleClaim = async (id) => {
    try {
      await claimChat(id, token);
      upsertConvo({
        id,
        status: "claimed",
        assigned_staff_id: staffId,
        assigned_to: staffName,
      });
      setSelectedId(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRelease = async () => {
    if (!selected) return;
    try {
      await releaseChat(selected.id, token);
      upsertConvo({
        id: selected.id,
        status: "escalated",
        assigned_staff_id: null,
        assigned_to: null,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try {
      await resolveChat(selected.id, token);
      removeConvo(selected.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSend = async () => {
    const content = reply.trim();
    if (!content || !selected || sending) return;
    setSending(true);
    try {
      await replyChat(selected.id, content, token);
      setThread((t) => [
        ...t,
        {
          sender_type: "staff",
          content,
          staff_name: staffName,
          created_at: new Date().toISOString(),
        },
      ]);
      setReply("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleReplyTyping = () => {
    if (!socketRef.current?.connected || !selected) return;
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current.emit("staff:typing", { conversationId: selected.id });
    }, 300);
  };

  const openCanned = async () => {
    const next = !showCanned;
    setShowCanned(next);
    if (next && electionId) {
      try {
        const data = await getCannedReplies(electionId, token);
        setCanned(data.replies || []);
      } catch {
        setCanned([]);
      }
    }
  };

  const openTranscript = async () => {
    if (!selected) return;
    try {
      const data = await getChatTranscript(selected.id, token);
      setTranscript(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const applyElection = (e) => {
    e.preventDefault();
    selectElection(electionInput.trim());
  };

  // Sort: urgent first, then most recent.
  const sortedQueue = useMemo(
    () =>
      [...queue].sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      }),
    [queue]
  );

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-black text-lg">Support Console</h1>
          <span className="text-xs text-slate-500">{staffName}</span>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={applyElection} className="flex items-center gap-2">
            {knownElections.length > 1 && (
              <select
                value={electionId}
                onChange={(e) => {
                  setElectionId(e.target.value);
                  setElectionInput(e.target.value);
                  setSelectedId(null);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
              >
                {knownElections.map((eid) => (
                  <option key={eid} value={eid}>
                    {eid.slice(0, 8)}…
                  </option>
                ))}
              </select>
            )}
            <input
              value={electionInput}
              onChange={(e) => setElectionInput(e.target.value)}
              placeholder="Election ID"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-40 placeholder:text-slate-600"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Load
            </button>
          </form>
          <button
            onClick={onLogout}
            title="Log out"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left: queue ──────────────────────────────────────────────────── */}
        <div className="w-[320px] border-r border-slate-800 flex flex-col shrink-0">
          {/* Election picker (primary) */}
          <div className="px-3 py-2.5 border-b border-slate-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Election
              </span>
              {selectedElection && (
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    STATUS_BADGE[selectedElection.status] ||
                    "bg-slate-700 text-slate-300"
                  }`}
                >
                  {selectedElection.status?.replace("_", " ")}
                </span>
              )}
            </div>
            {elections.length > 0 ? (
              <select
                value={electionId}
                onChange={(e) => selectElection(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs outline-none focus:border-blue-500"
              >
                {!electionId && <option value="">Select an election…</option>}
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name} — {el.status?.replace("_", " ")}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-slate-600">
                No elections found — use the Election ID box above.
              </p>
            )}
          </div>

          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Queue
            </span>
            <span className="text-xs text-slate-500">{queue.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!electionId && (
              <p className="text-center text-xs text-slate-500 mt-8 px-4">
                Select an election above to load the live queue.
              </p>
            )}
            {electionId && loadingQueue && (
              <div className="flex justify-center mt-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            )}
            {electionId && !loadingQueue && queue.length === 0 && (
              <p className="text-center text-xs text-slate-500 mt-8 px-4">
                No active conversations. New chats appear here in real time.
              </p>
            )}

            {sortedQueue.map((c) => {
              const isFresh = freshIds.has(c.id);
              const isSel = c.id === selectedId;
              const claimed = !!c.assigned_staff_id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/70 transition-all cursor-pointer ${
                    isSel ? "bg-slate-800" : "hover:bg-slate-900"
                  } ${c.is_urgent ? "border-l-4 border-l-red-500" : ""} ${
                    isFresh ? "animate-[vbFade_0.6s_ease-out]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm truncate">
                      {c.voter_name}
                      {c.voter_matric && (
                        <span className="text-slate-500 font-normal ml-1">
                          · {c.voter_matric}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-1.5">
                    {voterTyping === c.id ? (
                      <span className="text-blue-400 italic">typing…</span>
                    ) : (
                      c.last_message || "—"
                    )}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {c.is_urgent && (
                      <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                        Urgent
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        c.status === "claimed"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {c.status}
                    </span>
                    {claimed && (
                      <span className="text-[10px] text-slate-500 truncate">
                        {c.assigned_to || "claimed"}
                      </span>
                    )}
                    {!claimed && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(c.id);
                        }}
                        className="ml-auto text-[10px] font-bold bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Claim
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Online staff */}
          <div className="border-t border-slate-800 px-4 py-3 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Online ({online.length})
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {online.length === 0 && (
                <p className="text-xs text-slate-600">No one else online</p>
              )}
              {online.map((s) => (
                <div key={s.staffId} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-300 truncate">
                    {s.staffName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: conversation ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
              Select a conversation from the queue.
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-5 py-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold truncate">
                        {selected.voter_name}
                      </h2>
                      {selected.voter_matric && (
                        <span className="text-xs text-slate-500">
                          {selected.voter_matric}
                        </span>
                      )}
                      {selected.is_urgent && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={openTranscript}
                    title="View full transcript"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> Transcript
                  </button>
                </div>

                {/* Suggested answers */}
                {suggestionsMap[selected.id]?.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowSuggestions((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      Suggested answers ({suggestionsMap[selected.id].length})
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          showSuggestions ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {showSuggestions && (
                      <div className="mt-2 space-y-1.5">
                        {suggestionsMap[selected.id].map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setReply(s.answer)}
                            title="Click to paste into your reply"
                            className="block w-full text-left text-xs bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer"
                          >
                            <span className="text-slate-300 font-bold">
                              {s.question}
                            </span>
                            <span className="text-slate-500 block truncate">
                              {s.answer}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Thread */}
              <div
                ref={threadScroll}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
              >
                {thread.map((m, i) => {
                  const isStaff = m.sender_type === "staff";
                  const label =
                    m.sender_type === "staff"
                      ? m.staff_name || "Support Team"
                      : m.sender_type === "auto"
                      ? "Auto Reply"
                      : null;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        isStaff ? "items-end" : "items-start"
                      }`}
                    >
                      {label && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1 px-1">
                          {label}
                        </span>
                      )}
                      <div
                        className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                          isStaff
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-slate-700 text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[10px] text-slate-600 mt-1 px-1">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  );
                })}
                {voterTyping === selected.id && (
                  <p className="text-xs text-blue-400 italic">voter is typing…</p>
                )}
              </div>

              {/* Input bar */}
              <div className="border-t border-slate-800 p-3 shrink-0 relative">
                {showCanned && (
                  <div className="absolute bottom-full left-3 mb-2 w-72 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-10">
                    {canned.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">
                        No canned replies for this election.
                      </p>
                    ) : (
                      canned.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setReply(r.body);
                            setShowCanned(false);
                          }}
                          className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-200 block">
                            {r.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {r.body}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <button
                    onClick={openCanned}
                    title="Canned replies"
                    className="w-10 h-10 shrink-0 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center cursor-pointer"
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                  <textarea
                    rows={1}
                    value={reply}
                    onChange={(e) => {
                      setReply(e.target.value);
                      handleReplyTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your reply…"
                    className="flex-1 resize-none max-h-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim() || sending}
                    title="Send reply"
                    className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    <SendHorizonal className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleRelease}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5" /> Release
                  </button>
                  <button
                    onClick={handleResolve}
                    className="flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 bg-green-600/15 hover:bg-green-600/25 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transcript modal */}
      {transcript && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="font-black">Conversation transcript</h3>
              <button
                onClick={() => setTranscript(null)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100">
              {transcript.conversation?.voter_name} ·{" "}
              {transcript.conversation?.election_name}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {(transcript.messages || []).map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold">
                    {m.sender_type === "staff"
                      ? m.staff_name || "Staff"
                      : m.sender_type === "auto"
                      ? "Auto"
                      : "Voter"}
                    :
                  </span>{" "}
                  <span>{m.content}</span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {formatTime(m.created_at)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vbFade {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [authed, setAuthed] = useState(
    () => !!sessionStorage.getItem(SS.token)
  );

  const logout = () => {
    Object.values(SS).forEach((k) => sessionStorage.removeItem(k));
    setAuthed(false);
  };

  if (!authed) return <StaffLogin onLoggedIn={() => setAuthed(true)} />;
  return <Dashboard onLogout={logout} />;
}
