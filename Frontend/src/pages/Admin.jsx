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
import MobileNoticeBanner from "../components/ui/MobileNoticeBanner";
import { fetchAdminOverview, createNewElection } from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Live picture of your election" },
  { id: "election", label: "Election", icon: Vote, desc: "Start, end, and broadcast the election" },
  { id: "voters", label: "Voters", icon: Users, desc: "Roster upload and voter management" },
  { id: "candidates", label: "Candidates", icon: UserSquare2, desc: "Positions and candidates on the ballot" },
  { id: "branding", label: "Branding", icon: Palette, desc: "Election name, institution, and logo" },
  { id: "invoices", label: "Invoices", icon: Receipt, desc: "Payment invoices for this election" },
  { id: "history", label: "History", icon: Archive, desc: "Results from past elections" },
  { id: "staff", label: "Staff", icon: Headset, desc: "Support staff accounts and assignments" },
  { id: "audit", label: "Audit Log", icon: ScrollText, desc: "Every event in this election, timestamped" },
];

const NAV_GROUPS = [
  { label: "Election", ids: ["overview", "election", "voters", "candidates", "branding"] },
  { label: "Console", ids: ["invoices", "history", "staff", "audit"] },
];

export default function AdminPage() {
  const {
    currentUser,
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
    timeLeft,
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
      },
      "danger"
    );
  };

  const voters = (users || []).filter((u) => u.role !== "ADMIN");
  const votedCount = voters.filter((u) => u.hasVoted).length;

  const statusDots = {
    ACTIVE: "bg-green-500 animate-pulse",
    ENDED: "bg-red-500",
    NOT_STARTED: "bg-amber-500",
  };

  const tabVisible = (id) => {
    // Open elections have no roster — hide the Voters tab
    if (electionConfig.votingMode === "OPEN" && id === "voters") return false;
    // Invoices only relevant for paid elections
    if (electionConfig.voteType !== "PAID" && id === "invoices") return false;
    return true;
  };
  const visibleTabs = TABS.filter((t) => tabVisible(t.id));
  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const initials = (currentUser?.email || "AD").slice(0, 2).toUpperCase();

  const tabBadge = (id, active) => {
    if (id === "voters" && votedCount > 0)
      return (
        <span
          className={`ml-auto font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            active ? "bg-white/20 text-white" : "bg-blue-600 text-white"
          }`}
        >
          {votedCount}
        </span>
      );
    if (id === "audit" && activityLog.length > 0)
      return (
        <span
          className={`ml-auto font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            active ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          {activityLog.length}
        </span>
      );
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[232px] bg-slate-900 flex-col shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] leading-4 font-semibold text-white truncate">
              {branding?.institutionName || "Admin Console"}
            </p>
            <p className="text-[11px] leading-4 text-slate-400 truncate">
              {branding?.electionName || "Virtual Ballot"}
            </p>
          </div>
        </div>

        {/* Status chip */}
        <div className="mx-4 mb-2 flex items-center gap-2 bg-slate-400/10 border border-slate-700 rounded-lg px-3 py-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              statusDots[electionConfig.status] ?? "bg-slate-500"
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-300">
            {electionConfig.status.replace("_", " ")}
          </span>
          {electionConfig.status === "ACTIVE" && timeLeft && (
            <span className="ml-auto font-mono text-[11px] font-semibold text-blue-400">
              {timeLeft}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {NAV_GROUPS.map((group) => {
            const items = group.ids
              .filter(tabVisible)
              .map((id) => TABS.find((t) => t.id === id))
              .filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 px-3 mb-1">
                  {group.label}
                </p>
                {items.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      title={t.label}
                      className={`w-full flex items-center gap-2.5 min-h-[40px] px-3 my-px rounded-lg text-[13px] transition-all cursor-pointer ${
                        active
                          ? "bg-blue-600 text-white font-semibold"
                          : "text-slate-400 font-medium hover:text-slate-200 hover:bg-slate-400/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {t.label}
                      {tabBadge(t.id, active)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Foot: admin identity + sign out */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <p className="flex-1 min-w-0 text-[11px] text-slate-400 truncate">
            {currentUser?.email || "Admin"}
          </p>
          <button
            onClick={handleLogout}
            title="Sign out of the commission console"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-400/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar + tab strip ──────────────────────────────────── */}
      <div className="lg:hidden bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="flex-1 min-w-0 text-[13px] font-semibold text-white truncate">
            {branding?.institutionName || "Admin Console"}
          </p>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              statusDots[electionConfig.status] ?? "bg-slate-500"
            }`}
          />
          <button
            onClick={handleLogout}
            title="Sign out of the commission console"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {visibleTabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`shrink-0 min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg leading-6 font-semibold text-slate-900">
              {activeMeta.label}
            </h2>
            <p className="text-xs leading-4 text-slate-600 mt-0.5 truncate">
              {activeMeta.desc}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {electionConfig.status !== "ACTIVE" && (
              <button
                onClick={handleNewElection}
                disabled={creating}
                title="Create a new election"
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New election</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh dashboard data"
              className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:opacity-40 flex items-center justify-center transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <MobileNoticeBanner message="The admin console is built for larger displays — for the best experience, switch to a laptop or desktop." />

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
        </main>
      </div>
    </div>
  );
}
