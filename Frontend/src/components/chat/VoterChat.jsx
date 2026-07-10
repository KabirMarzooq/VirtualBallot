import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, SendHorizonal, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useSlug } from "../../context/SlugContext";
import {
  sendChatMessage,
  getChatMessages,
  getGuestChatToken,
  fetchOpenElection,
} from "../../api";

/**
 * VoterChat — floating live-support widget for voters.
 *
 * Props:
 *   socket — the shared socket.io-client instance created in App.jsx
 *
 * Reads the voter access token from sessionStorage ("vb_voter_token") and the
 * election/org context from AppContext (falling back to sessionStorage values
 * stored at OTP verification time).
 */

const CONVO_KEY = "vb_chat_convo";

// Stable key so socket-delivered messages don't duplicate ones from a fetch.
const msgKey = (m) => `${m.sender_type}|${m.content}|${m.created_at}`;

function mergeMessages(existing, incoming) {
  const seen = new Set(existing.map(msgKey));
  const merged = [...existing];
  for (const m of incoming) {
    if (!seen.has(msgKey(m))) {
      seen.add(msgKey(m));
      merged.push(m);
    }
  }
  return merged;
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

export default function VoterChat({ socket }) {
  const { electionId: ctxElection, orgId: ctxOrg, branding } = useApp();
  const slug = useSlug();

  // Authenticated voters carry a token in sessionStorage. Anonymous Open/Paid
  // ballot voters don't — they get a short-lived "guest" token (memory only).
  const voterToken = sessionStorage.getItem("vb_voter_token");
  const isGuest = !voterToken;
  const [guest, setGuest] = useState(null); // { token, electionId, orgId }

  const token = voterToken || guest?.token || null;
  const electionId =
    ctxElection ||
    sessionStorage.getItem("vb_voter_election") ||
    guest?.electionId ||
    null;
  const orgId =
    ctxOrg || sessionStorage.getItem("vb_voter_org") || guest?.orgId || null;

  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(!!socket?.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(
    () => sessionStorage.getItem(CONVO_KEY) || null
  );
  const [staffTyping, setStaffTyping] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [unread, setUnread] = useState(false);
  const [sendBlocked, setSendBlocked] = useState(false);

  const scrollRef = useRef(null);
  const typingTimer = useRef(null);
  const staffTypingTimer = useRef(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // ── Acquire a guest chat token for anonymous Open/Paid ballots ─────────────
  // Resolves the election from the slug, then mints a 15-min chat-only token.
  useEffect(() => {
    if (voterToken) return; // authenticated voter — no guest token needed
    if (!slug || guest) return; // need a slug; acquire only once
    let active = true;
    (async () => {
      try {
        let eid = ctxElection || sessionStorage.getItem("vb_voter_election");
        if (!eid) {
          const data = await fetchOpenElection(slug);
          eid = data?.election?.id;
        }
        if (!eid) return;
        const res = await getGuestChatToken(eid, slug);
        if (!active) return;
        setGuest({
          token: res.accessToken,
          electionId: res.electionId || eid,
          orgId: res.orgId,
        });
      } catch {
        // Guest chat unavailable (e.g. election not active) — widget stays idle.
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, voterToken]);

  // ── Connect the shared socket when a voter is present ──────────────────────
  useEffect(() => {
    if (!socket || !token) return;
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      setConnected(true);
      if (conversationId) socket.emit("join:chat:convo", { conversationId });
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, token]);

  // ── Live chat events ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (payload, sender_type) => {
      const m = {
        sender_type,
        content: payload.content,
        created_at: payload.created_at || new Date().toISOString(),
      };
      setMessages((prev) => mergeMessages(prev, [m]));
      if (!openRef.current) setUnread(true);
    };

    const onAuto = (p) => onIncoming(p, "auto");
    const onStaff = (p) => {
      setStaffTyping(false);
      onIncoming(p, "staff");
    };
    const onStaffTyping = () => {
      setStaffTyping(true);
      clearTimeout(staffTypingTimer.current);
      staffTypingTimer.current = setTimeout(() => setStaffTyping(false), 4000);
    };
    const onResolved = () => setResolved(true);

    socket.on("auto:reply", onAuto);
    socket.on("staff:reply", onStaff);
    socket.on("staff:typing", onStaffTyping);
    socket.on("chat:resolved", onResolved);

    return () => {
      socket.off("auto:reply", onAuto);
      socket.off("staff:reply", onStaff);
      socket.off("staff:typing", onStaffTyping);
      socket.off("chat:resolved", onResolved);
    };
  }, [socket]);

  // ── Join room + load history when conversation becomes known ───────────────
  useEffect(() => {
    if (!conversationId) return;
    sessionStorage.setItem(CONVO_KEY, conversationId);
    if (socket?.connected) socket.emit("join:chat:convo", { conversationId });
    if (!token) return;
    getChatMessages(conversationId, token)
      .then((data) => setMessages((prev) => mergeMessages(prev, data.messages || [])))
      .catch((err) => console.error("Failed to load chat messages:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── Auto-scroll to newest ──────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, staffTyping, open]);

  const openChat = () => {
    setOpen(true);
    setUnread(false);
  };

  const emitTyping = useCallback(() => {
    if (!socket?.connected || !conversationId || !orgId) return;
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("voter:typing", { conversationId, orgId });
    }, 1000);
  }, [socket, conversationId, orgId]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sendBlocked || resolved || !token) return;

    // Optimistic echo of the voter's own message.
    const optimistic = {
      sender_type: "voter",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => mergeMessages(prev, [optimistic]));
    setInput("");
    setSendBlocked(true);
    setTimeout(() => setSendBlocked(false), 1500); // simple client rate-limit

    try {
      const body = { content, electionId, orgId };
      if (conversationId) body.conversationId = conversationId;
      const data = await sendChatMessage(body, token);

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId); // triggers join + history load
      } else if (conversationId) {
        // Refresh to pull in any auto-reply that fired before we re-rendered.
        getChatMessages(conversationId, token)
          .then((d) => setMessages((prev) => mergeMessages(prev, d.messages || [])))
          .catch((err) => console.error("Failed to refresh chat messages:", err));
      }
    } catch {
      setMessages((prev) =>
        mergeMessages(prev, [
          {
            sender_type: "auto",
            content:
              "Sorry — we couldn't send that message. Please try again in a moment.",
            created_at: new Date().toISOString(),
          },
        ])
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const electionName = branding?.electionName || "Election Support";
  const canChat = !!token && !!electionId && !!orgId;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={openChat}
          title="Open support chat"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center transition-all cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
          {unread && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-3rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.2s_ease-out]"
          style={{ animationName: "vbSlideUp" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected ? "bg-green-500" : "bg-slate-600"
                  }`}
                />
                <h3 className="font-bold text-white text-sm">Support Chat</h3>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {isGuest ? "Chatting as Guest" : electionName}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              title="Close chat"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {!canChat && (
              <p className="text-center text-xs text-slate-500 mt-6">
                Live support is available during an active voting session.
              </p>
            )}
            {canChat && messages.length === 0 && (
              <p className="text-center text-xs text-slate-500 mt-6">
                Send a message and our team (or our instant answers) will help
                you out.
              </p>
            )}

            {messages.map((m, i) => {
              const isVoter = m.sender_type === "voter";
              const label =
                m.sender_type === "staff"
                  ? "Support Team"
                  : m.sender_type === "auto"
                  ? "Auto Reply"
                  : null;
              return (
                <div
                  key={`${msgKey(m)}-${i}`}
                  className={`flex flex-col ${
                    isVoter ? "items-end" : "items-start"
                  }`}
                >
                  {label && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1 px-1">
                      {label}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      isVoter
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

            {staffTyping && (
              <div className="flex items-start">
                <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Resolved banner */}
          {resolved && (
            <div className="px-4 py-2 bg-green-600/15 border-t border-green-600/30 text-green-300 text-xs font-bold text-center shrink-0">
              This conversation has been resolved
            </div>
          )}

          {/* Connecting state */}
          {canChat && !connected && !resolved && (
            <div className="px-4 py-1.5 bg-slate-800/60 text-slate-400 text-[11px] text-center shrink-0">
              connecting…
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-slate-700 p-3 flex items-end gap-2 shrink-0 bg-slate-900">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                emitTyping();
              }}
              onKeyDown={handleKeyDown}
              disabled={!canChat || resolved}
              placeholder={
                resolved
                  ? "This chat is closed"
                  : canChat
                  ? "Type a message…"
                  : "Unavailable"
              }
              className="flex-1 resize-none max-h-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-600 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendBlocked || resolved || !canChat}
              title="Send message"
              className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendHorizonal className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Local keyframes for the slide-up entrance */}
      <style>{`
        @keyframes vbSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
