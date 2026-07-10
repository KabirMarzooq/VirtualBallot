import { useState, useEffect } from "react";
import {
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  Vote,
  Users,
  UserSquare2,
  Palette,
  ScrollText,
  Archive,
  Plus,
  Receipt,
  RefreshCw,
  Headset,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import OverviewTab from "../components/admin/OverviewTab";
import ElectionTab from "../components/admin/ElectionTab";
import VotersTab from "../components/admin/VotersTab";
import CandidatesTab from "../components/admin/CandidatesTab";
import BrandingTab from "../components/admin/BrandingTab";
import AuditLogTab from "../components/admin/AuditLogTab";
import HistoryTab from "../components/admin/HistoryTab";
import InvoiceTab from "../components/admin/InvoiceTab";
import StaffTab from "../components/admin/StaffTab";
import { fetchAdminOverview, createNewElection } from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "election", label: "Election", icon: Vote },
  { id: "voters", label: "Voters", icon: Users },
  { id: "candidates", label: "Candidates", icon: UserSquare2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "history", label: "History", icon: Archive },
  { id: "staff", label: "Staff", icon: Headset },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminPage() {
  const {
    setCurrentUser,
    resetBallotSession,
    electionConfig,
    setElectionConfig,
    activityLog,
    users,
    accessToken,
    orgSlug,
    setCandidates,
    setUsers,
    setElectionId,
    setActivityLog,
    showAlert,
    showConfirm,
    addLog,
    branding,
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("vb_admin_tab") || "overview"
  );

  // Persist the active tab so a reload returns to the same tab
  useEffect(() => {
    sessionStorage.setItem("vb_admin_tab", activeTab);
  }, [activeTab]);

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Real-time auto-refresh every 30 s while election is ACTIVE ────────────────
  useEffect(() => {
    if (electionConfig.status === "ENDED" || !accessToken || !orgSlug) return;
    const pollInterval = electionConfig.status === "ACTIVE" ? 30_000 : 15_000;
    const id = setInterval(async () => {
      try {
        const ov = await fetchAdminOverview(accessToken, orgSlug);
        setCandidates(
          ov.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            position: c.position,
            image: c.image_url,
            manifesto: c.manifesto || "",
            color: c.color,
            votes: c.vote_count,
          }))
        );
        setUsers(
          ov.voters.map((v) => ({
            id: v.id,
            matric: v.matric,
            name: v.name,
            email: v.email,
            hasVoted: v.has_voted,
            votedAt: v.voted_at,
            role: "STUDENT",
          }))
        );
      } catch (err) {
        console.error("Failed to poll admin overview:", err);
      }
    }, pollInterval);
    return () => clearInterval(id);
  }, [electionConfig.status, accessToken, orgSlug]);

  // If election is OPEN and user lands on the now-hidden voters tab, redirect
  useEffect(() => {
    if (electionConfig.votingMode === "OPEN" && activeTab === "voters") {
      setActiveTab("overview");
    }
  }, [electionConfig.votingMode, activeTab]);

  // Guard: if there's no session (e.g. user hit back after logout), bounce to login
  useEffect(() => {
    const token = sessionStorage.getItem("vb_admin_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  // Defeat Chrome bfcache restoring a logged-out dashboard on back-button
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem("vb_admin_token")) {
        navigate("/admin/login", { replace: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [navigate]);

  const handleRefresh = async () => {
    if (!accessToken || !orgSlug) return;
    setRefreshing(true);
    try {
      const ov = await fetchAdminOverview(accessToken, orgSlug);
      setElectionConfig({
        status: ov.election.status,
        isPublished: ov.election.isPublished,
        registryLocked: ov.election.registryLocked,
        showCountdown: ov.election.showCountdown,
        endsAt: ov.election.endsAt,
        votingMode: ov.election.votingMode || "CLOSED",
        fraudTier: ov.election.fraudTier || "EMAIL",
        voteType: ov.election.voteType || "STANDARD",
        pricingModel: ov.election.pricingModel || "FIXED",
        pricePerVote: ov.election.pricePerVote || 0,
        voteBundles: ov.election.voteBundles || [],
      });
      setCandidates(
        ov.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          image: c.image_url,
          manifesto: c.manifesto || "",
          color: c.color,
          votes: c.vote_count,
        }))
      );
      setUsers(
        ov.voters.map((v) => ({
          id: v.id,
          matric: v.matric,
          name: v.name,
          email: v.email,
          hasVoted: v.has_voted,
          votedAt: v.voted_at,
          role: "STUDENT",
        }))
      );
    } catch (err) {
      showAlert("Refresh Failed", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    sessionStorage.removeItem("vb_admin_tab");
    sessionStorage.removeItem("vb_admin_refresh");
    navigate("/");
  };

  const handleNewElection = () => {
    if (electionConfig.status === "ACTIVE")
      return showAlert(
        "Election Active",
        "End the current election before starting a new one."
      );
    showConfirm(
      "Start a New Election?",
      "This clears the current voters, candidates, and settings and gives you a blank election to set up. If the current election has already run, its results are saved to History first.",
      async () => {
        setCreating(true);
        try {
          const data = await createNewElection(accessToken, orgSlug);
          const ov = await fetchAdminOverview(accessToken, orgSlug);
          setElectionId(data.election.id);
          setElectionConfig({
            status: ov.election.status,
            isPublished: ov.election.isPublished,
            registryLocked: ov.election.registryLocked,
            showCountdown: ov.election.showCountdown,
            endsAt: ov.election.endsAt,
            votingMode: ov.election.votingMode || "CLOSED",
            fraudTier: ov.election.fraudTier || "EMAIL",
            voteType: ov.election.voteType || "STANDARD",
            pricingModel: ov.election.pricingModel || "FIXED",
            pricePerVote: ov.election.pricePerVote || 0,
            voteBundles: ov.election.voteBundles || [],
          });
          setCandidates([]);
          setUsers([]);
          setActivityLog([]);
          addLog("New election started", "system");
          setActiveTab("branding");
          showAlert(
            "New Election Ready",
            "Set the election name, logo, and type in the Branding tab, then add candidates."
          );
        } catch (err) {
          showAlert("Failed", err.message);
        } finally {
          setCreating(false);
        }
      }
    );
  };

  const voters = (users || []).filter((u) => u.role !== "ADMIN");
  const votedCount = voters.filter((u) => u.hasVoted).length;

  const statusColors = {
    ACTIVE: "text-green-400",
    ENDED: "text-red-400",
    NOT_STARTED: "text-amber-400",
  };
  const statusDots = {
    ACTIVE: "bg-green-500 animate-pulse",
    ENDED: "bg-red-500",
    NOT_STARTED: "bg-amber-500",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight">
                {branding?.institutionName || "Admin Console"}
              </h1>
              <p className="text-slate-600 text-xs">
                {branding?.electionName ||
                  "Virtual Ballot — Election Management"}
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Election status pill */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  statusDots[electionConfig.status] ?? "bg-slate-500"
                }`}
              />
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  statusColors[electionConfig.status] ?? "text-slate-400"
                }`}
              >
                {electionConfig.status.replace("_", " ")}
              </span>
            </div>

            {/* New Election — show when not actively running */}
            {electionConfig.status !== "ACTIVE" && (
              <button
                onClick={handleNewElection}
                disabled={creating}
                title="Create a new election"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Election
              </button>
            )}

            {/* Manual refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh dashboard data"
              className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out of admin console"
              className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 overflow-x-auto scrollbar-hide">
          {TABS.filter((t) => {
            // Open elections have no roster — hide the Voters tab
            if (electionConfig.votingMode === "OPEN" && t.id === "voters")
              return false;
            // Invoices only relevant for paid elections
            if (electionConfig.voteType !== "PAID" && t.id === "invoices")
              return false;
            return true;
          }).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.id === "voters" && votedCount > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono hidden sm:inline">
                    {votedCount}
                  </span>
                )}
                {t.id === "audit" && activityLog.length > 0 && (
                  <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono hidden sm:inline">
                    {activityLog.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "overview" && (
            <OverviewTab onSwitchTab={setActiveTab} />
          )}
          {activeTab === "election" && <ElectionTab />}
          {activeTab === "voters" && <VotersTab />}
          {activeTab === "candidates" && <CandidatesTab />}
          {activeTab === "branding" && <BrandingTab />}
          {activeTab === "invoices" && <InvoiceTab />}
          {activeTab === "history" && <HistoryTab />}
          {activeTab === "staff" && <StaffTab />}
          {activeTab === "audit" && <AuditLogTab />}
        </div>
      </div>
    </div>
  );
}
