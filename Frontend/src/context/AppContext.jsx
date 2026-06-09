import { createContext, useContext, useRef, useState, useEffect } from "react";
import { fetchElection, fetchCandidates } from "../api";
import { formatTimeLeft } from "./utils";

const AppContext = createContext(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

export function AppProvider({ children }) {
  // ── Auth / session ───────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null); // { id, name, email, matric, role }
  const [accessToken, setAccessToken] = useState(null); // JWT — in memory only, never localStorage
  const [electionId, setElectionId] = useState(null);
  const [orgId, setOrgId] = useState(null);

  // Read slug from URL path — supports /vote/:slug pattern
  const getSlugFromPath = () => {
    const match = window.location.pathname.match(/^\/vote\/([^/]+)/);
    return match ? match[1] : import.meta.env.VITE_ORG_SLUG || "nuesa";
  };
  const [orgSlug, setOrgSlug] = useState(getSlugFromPath);

  // ── Election data (from backend) ─────────────────────────────────────────────
  const [electionConfig, setElectionConfig] = useState({
    status: "NOT_STARTED",
    isPublished: false,
    registryLocked: false,
    showCountdown: false,
    endsAt: null,
  });
  const [branding, setBranding] = useState({
    electionName: "",
    institutionName: "",
    logoUrl: "",
  });
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]); // admin use: voter list
  const [activityLog, setActivityLog] = useState([]); // admin use: audit log
  const [electionHistory, setElectionHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState("00h : 00m : 00s");
  const [appLoading, setAppLoading] = useState(true); // initial data fetch

  // ── Ballot session ────────────────────────────────────────────────────────────
  const [ballot, setBallot] = useState({});
  const [receiptHash, setReceiptHash] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── Global modal ──────────────────────────────────────────────────────────────
  const [modal, setModal] = useState({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
    onConfirm: null,
  });
  const logId = useRef(0);

  // ── On mount: load election config + candidates from backend ─────────────────
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
      setCandidates(
        candidateData.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          image: c.image_url,
          manifesto: c.manifesto || "",
          color: c.color,
          votes: c.vote_count,
        }))
      );
    } catch (err) {
      console.error("Failed to load election data:", err.message);
    } finally {
      setAppLoading(false);
    }
  };

  // Keep this useEffect just for admin pages —
  // sets appLoading false immediately on non-voter pages
  useEffect(() => {
    const isVoterPage = window.location.pathname.startsWith("/vote/");
    if (!isVoterPage) setAppLoading(false);
  }, []);

  // ── Countdown timer from backend endsAt ──────────────────────────────────────
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
        date: now.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
        }),
        iso: now.toISOString(),
      },
    ]);
  };

  const showAlert = (title, message) =>
    setModal({ isOpen: true, type: "alert", title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) =>
    setModal({ isOpen: true, type: "confirm", title, message, onConfirm });
  const closeModal = () => setModal((m) => ({ ...m, isOpen: false }));

  const toggleBallotSelection = (pos, id) =>
    setBallot((prev) => ({ ...prev, [pos]: id }));

  const resetBallotSession = () => {
    setBallot({});
    setReceiptHash("");
    setEmailSent(false);
    setShowConfirmModal(false);
    setCurrentUser(null);
    setAccessToken(null);
  };

  const value = {
    // auth
    currentUser,
    setCurrentUser,
    accessToken,
    setAccessToken,
    electionId,
    setElectionId,
    orgId,
    setOrgId,
    orgSlug,
    setOrgSlug,
    loadElectionForSlug,
    // election data
    electionConfig,
    setElectionConfig,
    branding,
    setBranding,
    candidates,
    setCandidates,
    users,
    setUsers,
    activityLog,
    setActivityLog,
    electionHistory,
    setElectionHistory,
    timeLeft,
    appLoading,
    // ballot
    ballot,
    setBallot,
    receiptHash,
    setReceiptHash,
    showConfirmModal,
    setShowConfirmModal,
    showConfetti,
    setShowConfetti,
    emailSent,
    setEmailSent,
    // modal
    modal,
    closeModal,
    // actions
    addLog,
    showAlert,
    showConfirm,
    toggleBallotSelection,
    resetBallotSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
