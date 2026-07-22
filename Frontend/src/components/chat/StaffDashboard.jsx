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
  Headset,
  Inbox,
  MessageSquare,
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
import AuthBackground from "../layout/AuthBackground";
import MobileNoticeBanner from "../ui/MobileNoticeBanner";

// Status badge palette for the election picker (sits in the dark top bar).
const STATUS_BADGE = {
  ACTIVE: "bg-green-500/15 text-green-400 border border-green-500/25",
  ENDED: "bg-slate-700 text-slate-300",
  NOT_STARTED: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
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

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
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
    <AuthBackground variant="dark">
      <form
        onSubmit={submit}
        className="w-full max-w-[360px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:px-7"
      >
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
          <Headset className="w-7 h-7" />
        </div>
        <h1 className="text-[22px] leading-7 font-semibold text-white text-center mt-4">
          Support Console
        </h1>
        <p className="text-[13px] leading-5 text-slate-400 text-center mt-1">
          Sign in to answer live voter chats
        </p>

        <div className="mt-5">
          <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            autoFocus
            className="w-full min-h-[48px] text-sm text-white bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25 transition-all"
            placeholder="you@org.com"
          />
        </div>

        <div className="mt-4">
          <label className="block text-[13px] leading-5 font-medium text-slate-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            className="w-full min-h-[48px] text-sm text-white bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/25 transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-[11px] leading-4 font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3 mt-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || !password || loading}
          className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log in"}
        </button>
      </form>
    </AuthBackground>
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
        }
      })
      .catch((err) => console.error("Failed to load staff elections:", err));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pick an election (from the dropdown).
  const selectElection = useCallback((eid) => {
    if (!eid) return;
    setElectionId(eid);
    setSelectedId(null);
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

  // Sort: urgent first, then most recent.
  const sortedQueue = useMemo(
    () =>
      [...queue].sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      }),
    [queue]
  );

  const waitingCount = queue.filter((c) => c.status === "escalated").length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col text-slate-800 overflow-hidden">
      {/* Top bar (dark) */}
      <header className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
          <Headset className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[14px] leading-4 font-semibold text-white">
            Support Console
          </h1>
          <p className="text-[11px] text-slate-400 truncate">{staffName}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Election picker */}
          {elections.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={electionId}
                  onChange={(e) => selectElection(e.target.value)}
                  title="Choose the election to support"
                  className="appearance-none bg-slate-400/10 border border-slate-700 text-white rounded-lg pl-3 pr-8 py-2 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer max-w-[220px] truncate"
                >
                  {!electionId && <option value="">Select an election…</option>}
                  {elections.map((el) => (
                    <option key={el.id} value={el.id} className="text-slate-900">
                      {el.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {selectedElection && (
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.06em] px-2 py-1 rounded-full ${
                    STATUS_BADGE[selectedElection.status] ||
                    "bg-slate-700 text-slate-300"
                  }`}
                >
                  {selectedElection.status?.replace("_", " ")}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400">No elections assigned</span>
          )}

          <button
            onClick={onLogout}
            title="Log out"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-400/10 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-5 pt-3 shrink-0">
        <MobileNoticeBanner message="The support console is built for larger displays — for the best experience, switch to a laptop or desktop." />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left: queue ──────────────────────────────────────────────────── */}
        <aside className="w-[320px] border-r border-slate-200 flex flex-col shrink-0 bg-white">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Live queue
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {waitingCount > 0 && (
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                  {waitingCount} waiting
                </span>
              )}
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {queue.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!electionId && (
              <div className="text-center px-6 mt-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600">
                  Choose an election above to load its live queue.
                </p>
              </div>
            )}
            {electionId && loadingQueue && (
              <div className="flex justify-center mt-12">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}
            {electionId && !loadingQueue && queue.length === 0 && (
              <div className="text-center px-6 mt-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-semibold text-slate-900">
                  All clear
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  No active conversations. New chats appear here in real time as
                  voters escalate.
                </p>
              </div>
            )}

            {sortedQueue.map((c) => {
              const isFresh = freshIds.has(c.id);
              const isSel = c.id === selectedId;
              const claimed = !!c.assigned_staff_id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors cursor-pointer relative ${
                    isSel ? "bg-blue-50" : "hover:bg-slate-50"
                  } ${isFresh ? "vb-fade-in" : ""}`}
                >
                  {c.is_urgent && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-600" />
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        c.is_urgent
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {initials(c.voter_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-slate-900 truncate">
                          {c.voter_name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {timeAgo(c.last_message_at)}
                        </span>
                      </div>
                      {c.voter_matric && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.voter_matric}
                        </span>
                      )}
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {voterTyping === c.id ? (
                          <span className="text-blue-600 italic">typing…</span>
                        ) : (
                          c.last_message || "—"
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {c.is_urgent && (
                          <span className="text-[9px] font-semibold uppercase tracking-[0.04em] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                            Urgent
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full ${
                            c.status === "claimed"
                              ? "bg-green-50 text-green-600"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {c.status === "claimed" ? "Claimed" : "Waiting"}
                        </span>
                        {claimed ? (
                          <span className="text-[10px] text-slate-400 truncate">
                            {c.assigned_to || "claimed"}
                          </span>
                        ) : (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(c.id);
                            }}
                            className="ml-auto text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                          >
                            Claim
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Online staff */}
          <div className="border-t border-slate-100 px-4 py-3 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Online ({online.length})
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {online.length === 0 && (
                <p className="text-xs text-slate-400">No one else online</p>
              )}
              {online.map((s) => (
                <div key={s.staffId} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-xs text-slate-800 truncate">
                    {s.staffName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Right: conversation ──────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-[13px] text-slate-600">
                Select a conversation from the queue.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-5 py-3 border-b border-slate-200 shrink-0 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        selected.is_urgent
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {initials(selected.voter_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900 truncate">
                          {selected.voter_name}
                        </h2>
                        {selected.is_urgent && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Urgent
                          </span>
                        )}
                      </div>
                      {selected.voter_matric && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {selected.voter_matric}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={openTranscript}
                    title="View full transcript"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 hover:text-slate-800 min-h-[36px] px-3 rounded-lg cursor-pointer shrink-0 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" /> Transcript
                  </button>
                </div>

                {/* Suggested answers */}
                {suggestionsMap[selected.id]?.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowSuggestions((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 cursor-pointer"
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
                            className="block w-full text-left text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                          >
                            <span className="text-slate-900 font-semibold">
                              {s.question}
                            </span>
                            <span className="text-slate-600 block truncate mt-0.5">
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
                className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3"
              >
                {thread.map((m, i) => {
                  const isStaff = m.sender_type === "staff";
                  const isAuto = m.sender_type === "auto";
                  const label = isStaff
                    ? m.staff_name || "Support Team"
                    : isAuto
                    ? "Auto reply"
                    : null;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[72%] ${
                        isStaff ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      {label && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-400 mb-1 px-1">
                          {label}
                        </span>
                      )}
                      <div
                        className={`text-[13px] leading-5 px-3.5 py-2 rounded-xl break-words ${
                          isStaff
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : isAuto
                            ? "bg-slate-100 text-slate-600 rounded-bl-sm"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  );
                })}
                {voterTyping === selected.id && (
                  <p className="text-xs text-blue-600 italic">
                    {selected.voter_name} is typing…
                  </p>
                )}
              </div>

              {/* Input bar */}
              <div className="border-t border-slate-200 p-3 shrink-0 relative bg-white">
                {showCanned && (
                  <div className="absolute bottom-full left-3 mb-2 w-72 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-10">
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
                          className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-slate-900 block">
                            {r.label}
                          </span>
                          <span className="text-[11px] text-slate-600 block truncate">
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
                    className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
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
                    placeholder="Type your reply…  (Enter to send, Shift+Enter for a new line)"
                    className="flex-1 resize-none max-h-24 min-h-[40px] bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim() || sending}
                    title="Send reply"
                    className="w-10 h-10 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white flex items-center justify-center cursor-pointer transition-all"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <SendHorizonal className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleRelease}
                    title="Return this chat to the waiting queue"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 hover:text-slate-800 min-h-[32px] px-3 rounded-lg cursor-pointer transition-all"
                  >
                    <Hand className="w-3.5 h-3.5" /> Release
                  </button>
                  <button
                    onClick={handleResolve}
                    title="Mark this chat resolved and close it"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 min-h-[32px] px-3 rounded-lg cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Transcript modal */}
      {transcript && (
        <div
          onClick={() => setTranscript(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 vb-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] vb-modal-pop"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900">
                Conversation transcript
              </h3>
              <button
                onClick={() => setTranscript(null)}
                title="Close transcript"
                className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-2.5 text-[11px] text-slate-600 border-b border-slate-100">
              {transcript.conversation?.voter_name} ·{" "}
              {transcript.conversation?.election_name}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {(transcript.messages || []).map((m, i) => {
                const isStaff = m.sender_type === "staff";
                return (
                  <div key={i} className="text-[13px] leading-5">
                    <b
                      className={`font-semibold ${
                        isStaff ? "text-blue-700" : "text-slate-900"
                      }`}
                    >
                      {isStaff
                        ? m.staff_name || "Staff"
                        : m.sender_type === "auto"
                        ? "Auto"
                        : "Voter"}
                      :
                    </b>{" "}
                    <span className="text-slate-700">{m.content}</span>
                    <span className="text-[10px] text-slate-400 ml-2">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => window.print()}
                title="Print this transcript"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold min-h-[40px] px-4 rounded-lg cursor-pointer transition-all"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
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
