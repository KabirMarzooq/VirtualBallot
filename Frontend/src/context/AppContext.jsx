import { createContext, useContext, useRef, useState, useEffect } from "react";
import { fetchElection, fetchCandidates, fetchAdminOverview } from "../api";
import { formatTimeLeft } from "./utils";

const AppContext = createContext(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

// ── Helpers for mapping backend shapes ────────────────────────────────────────
const mapCandidate = (c) => ({
  id: c.id,
  name: c.name,
  position: c.position,
  image: c.image_url,
  manifesto: c.manifesto || "",
  color: c.color,
  votes: c.vote_count ?? 0,
});

const mapVoter = (v) => ({
  id: v.id,
  matric: v.matric,
  name: v.name,
  email: v.email,
  hasVoted: v.has_voted,
  votedAt: v.voted_at,
  role: "STUDENT",
});

const mapLog = (e) => ({
  id: e.id,
  type: e.event_type,
  message: e.message,
  timestamp: new Date(e.created_at).toLocaleTimeString(),
  date: new Date(e.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }),
  iso: e.created_at,
});

export function AppProvider({ children }) {
  // ── Auth / session — initialise from sessionStorage so refresh keeps admin in ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const s = sessionStorage.getItem("vb_admin_user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState(
    () => sessionStorage.getItem("vb_admin_token") || null
  );
  const [electionId, setElectionId] = useState(null);
  const [orgId, setOrgId] = useState(null);

  const getSlugFromPath = () => {
    const m = window.location.pathname.match(/^\/vote\/([^/]+)/);
    return m ? m[1] : import.meta.env.VITE_ORG_SLUG || "nuesa";
  };
  const [orgSlug, setOrgSlug] = useState(
    () => sessionStorage.getItem("vb_admin_slug") || getSlugFromPath()
  );

  // ── Election data ─────────────────────────────────────────────────────────────
  const [electionConfig, setElectionConfig] = useState({
    status: "NOT_STARTED",
    isPublished: false,
    registryLocked: false,
    showCountdown: false,
    endsAt: null,
  });
  const [branding, setBranding] = useState({ electionName: "", institutionName: "", logoUrl: "" });
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [electionHistory, setElectionHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState("00h : 00m : 00s");
  const [appLoading, setAppLoading] = useState(true);

  // ── Ballot session ────────────────────────────────────────────────────────────
  const [ballot, setBallot] = useState({});
  const [receiptHash, setReceiptHash] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── Global modal ──────────────────────────────────────────────────────────────
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });
  const logId = useRef(0);

  // ── On mount: try to restore admin session or load voter election data ────────
  useEffect(() => {
    const token   = sessionStorage.getItem("vb_admin_token");
    const slug    = sessionStorage.getItem("vb_admin_slug");
    const isVoter = window.location.pathname.startsWith("/vote/");

    if (token && slug && !isVoter) {
      // Re-hydrate admin session without requiring a fresh login
      fetchAdminOverview(token, slug)
        .then((overview) => {
          const storedUser = (() => {
            try { return JSON.parse(sessionStorage.getItem("vb_admin_user")); }
            catch { return null; }
          })();
          if (storedUser) setCurrentUser(storedUser);
          setAccessToken(token);
          setOrgSlug(slug);
          setElectionId(overview.election.id);

          setElectionConfig({
            status: overview.election.status,
            isPublished: overview.election.isPublished,
            registryLocked: overview.election.registryLocked,
            showCountdown: overview.election.showCountdown,
            endsAt: overview.election.endsAt,
          });

          // institutionName is in branding stored separately; fall back to slug
          const storedBranding = (() => {
            try { return JSON.parse(sessionStorage.getItem("vb_admin_branding")); }
            catch { return null; }
          })();
          setBranding({
            electionName: overview.election.name,
            institutionName: storedBranding?.institutionName || slug,
            logoUrl: storedBranding?.logoUrl || "",
          });

          setCandidates(overview.candidates.map(mapCandidate));
          setUsers(overview.voters.map(mapVoter));
          setActivityLog(overview.auditLog.map(mapLog));
        })
        .catch(() => {
          // Token expired — clear stored session so login page shows
          sessionStorage.removeItem("vb_admin_token");
          sessionStorage.removeItem("vb_admin_slug");
          sessionStorage.removeItem("vb_admin_user");
          sessionStorage.removeItem("vb_admin_branding");
        })
        .finally(() => setAppLoading(false));
    } else if (!isVoter) {
      setAppLoading(false);
    }
    // voter pages: appLoading is set false by loadElectionForSlug
  }, []);

  // ── Persist admin session whenever token/user/slug change ────────────────────
  useEffect(() => {
    if (currentUser?.role === "ADMIN" && accessToken) {
      sessionStorage.setItem("vb_admin_token", accessToken);
      sessionStorage.setItem("vb_admin_user", JSON.stringify(currentUser));
    }
  }, [currentUser, accessToken]);

  useEffect(() => {
    if (orgSlug && accessToken && currentUser?.role === "ADMIN") {
      sessionStorage.setItem("vb_admin_slug", orgSlug);
    }
  }, [orgSlug, accessToken, currentUser]);

  // Keep branding persisted so institutionName survives refresh
  useEffect(() => {
    if (branding.institutionName && currentUser?.role === "ADMIN") {
      sessionStorage.setItem("vb_admin_branding", JSON.stringify(branding));
    }
  }, [branding, currentUser]);

  // ── Voter election loader ─────────────────────────────────────────────────────
  const loadElectionForSlug = async (slug) => {
    setAppLoading(true);
    try {
      const [electionData, candidateData] = await Promise.all([
        fetchElection(slug),
        fetchCandidates(slug),
      ]);
      setElectionConfig({
        status: electionData.election.status,
        isPublished: electionData.election.isPublished,
        registryLocked: electionData.election.registryLocked,
        showCountdown: electionData.election.showCountdown,
        endsAt: electionData.election.endsAt,
      });
      setBranding(electionData.branding);
      setElectionId(electionData.election.id);
      setCandidates(candidateData.candidates.map(mapCandidate));
    } catch (err) {
      console.error("Failed to load election data:", err.message);
    } finally {
      setAppLoading(false);
    }
  };

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (electionConfig.status !== "ACTIVE" || !electionConfig.endsAt) return;
    const timer = setInterval(() => {
      const diff = new Date(electionConfig.endsAt) - new Date();
      if (diff <= 0) {
        setElectionConfig((prev) => ({ ...prev, status: "ENDED" }));
        setTimeLeft("00h : 00m : 00s");
      } else {
        setTimeLeft(formatTimeLeft(diff));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [electionConfig.status, electionConfig.endsAt]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const addLog = (message, type = "system") => {
    const now = new Date();
    setActivityLog((prev) => [
      ...prev,
      {
        id: ++logId.current,
        type,
        message,
        timestamp: now.toLocaleTimeString(),
        date: now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }),
        iso: now.toISOString(),
      },
    ]);
  };

  const showAlert   = (title, message) =>
    setModal({ isOpen: true, type: "alert",   title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) =>
    setModal({ isOpen: true, type: "confirm", title, message, onConfirm });
  const closeModal  = () => setModal((m) => ({ ...m, isOpen: false }));

  const toggleBallotSelection = (pos, id) =>
    setBallot((prev) => ({ ...prev, [pos]: id }));

  const resetBallotSession = () => {
    setBallot({});
    setReceiptHash("");
    setEmailSent(false);
    setShowConfirmModal(false);
    setCurrentUser(null);
    setAccessToken(null);
    // Clear persisted admin session
    sessionStorage.removeItem("vb_admin_token");
    sessionStorage.removeItem("vb_admin_slug");
    sessionStorage.removeItem("vb_admin_user");
    sessionStorage.removeItem("vb_admin_branding");
  };

  const value = {
    // auth
    currentUser, setCurrentUser,
    accessToken,  setAccessToken,
    electionId,   setElectionId,
    orgId,        setOrgId,
    orgSlug,      setOrgSlug,
    loadElectionForSlug,
    // election data
    electionConfig, setElectionConfig,
    branding,       setBranding,
    candidates,     setCandidates,
    users,          setUsers,
    activityLog,    setActivityLog,
    electionHistory, setElectionHistory,
    timeLeft,
    appLoading,
    // ballot
    ballot,              setBallot,
    receiptHash,         setReceiptHash,
    showConfirmModal,    setShowConfirmModal,
    showConfetti,        setShowConfetti,
    emailSent,           setEmailSent,
    // modal
    modal, closeModal,
    // actions
    addLog, showAlert, showConfirm,
    toggleBallotSelection, resetBallotSession,
    // shared mappers (used by Admin restore + AdminLogin)
    mapCandidate, mapVoter, mapLog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
