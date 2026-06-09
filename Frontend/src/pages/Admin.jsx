import { useState, useEffect } from "react";
import {
  ShieldAlert, LogOut, LayoutDashboard, Vote, Users, UserSquare2,
  Palette, ScrollText, Archive, Plus, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import OverviewTab    from "../components/admin/OverviewTab";
import ElectionTab    from "../components/admin/ElectionTab";
import VotersTab      from "../components/admin/VotersTab";
import CandidatesTab  from "../components/admin/CandidatesTab";
import BrandingTab    from "../components/admin/BrandingTab";
import AuditLogTab    from "../components/admin/AuditLogTab";
import HistoryTab     from "../components/admin/HistoryTab";
import { createNewElection, fetchAdminOverview } from "../api";

const TABS = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "election",   label: "Election",   icon: Vote },
  { id: "voters",     label: "Voters",     icon: Users },
  { id: "candidates", label: "Candidates", icon: UserSquare2 },
  { id: "branding",   label: "Branding",   icon: Palette },
  { id: "history",    label: "History",    icon: Archive },
  { id: "audit",      label: "Audit Log",  icon: ScrollText },
];

export default function AdminPage() {
  const {
    setCurrentUser, resetBallotSession,
    electionConfig, setElectionConfig,
    activityLog, users,
    accessToken, orgSlug,
    setCandidates, setUsers, setElectionId, setActivityLog,
    showAlert, showConfirm, addLog,
    branding,
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]           = useState("overview");
  const [showNewInput, setShowNewInput]     = useState(false);
  const [newName, setNewName]               = useState("");
  const [creating, setCreating]             = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // ── Real-time auto-refresh every 30 s while election is ACTIVE ────────────────
  useEffect(() => {
    if (electionConfig.status !== "ACTIVE" || !accessToken || !orgSlug) return;
    const id = setInterval(async () => {
      try {
        const ov = await fetchAdminOverview(accessToken, orgSlug);
        setCandidates(ov.candidates.map((c) => ({
          id: c.id, name: c.name, position: c.position,
          image: c.image_url, manifesto: c.manifesto || "",
          color: c.color, votes: c.vote_count,
        })));
        setUsers(ov.voters.map((v) => ({
          id: v.id, matric: v.matric, name: v.name, email: v.email,
          hasVoted: v.has_voted, votedAt: v.voted_at, role: "STUDENT",
        })));
      } catch (_) {}
    }, 30_000);
    return () => clearInterval(id);
  }, [electionConfig.status, accessToken, orgSlug]);

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
      });
      setCandidates(ov.candidates.map((c) => ({
        id: c.id, name: c.name, position: c.position,
        image: c.image_url, manifesto: c.manifesto || "",
        color: c.color, votes: c.vote_count,
      })));
      setUsers(ov.voters.map((v) => ({
        id: v.id, matric: v.matric, name: v.name, email: v.email,
        hasVoted: v.has_voted, votedAt: v.voted_at, role: "STUDENT",
      })));
    } catch (err) {
      showAlert("Refresh Failed", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate("/");
  };

  const handleNewElection = () => {
    if (electionConfig.status === "ACTIVE")
      return showAlert("Election Active", "End the current election before starting a new one.");
    if (electionConfig.status === "NOT_STARTED")
      return showAlert("Not Needed", "Your current election hasn't run yet. Configure it in the Election tab.");
    setShowNewInput(true);
    setNewName("");
  };

  const confirmNew = () => {
    if (!newName.trim()) return showAlert("Name Required", "Enter a name for the new election.");
    showConfirm(
      "Start Fresh?",
      `Archive the current election and create "${newName.trim()}"? Voters and candidates will be cleared. Results are saved in History.`,
      async () => {
        setCreating(true);
        try {
          const data = await createNewElection(newName.trim(), accessToken, orgSlug);
          const ov   = await fetchAdminOverview(accessToken, orgSlug);
          setElectionId(data.election.id);
          setElectionConfig({
            status: ov.election.status,
            isPublished: ov.election.isPublished,
            registryLocked: ov.election.registryLocked,
            showCountdown: ov.election.showCountdown,
            endsAt: ov.election.endsAt,
          });
          setCandidates([]);
          setUsers([]);
          setActivityLog([]);
          addLog(`New election created: "${newName.trim()}"`, "system");
          setShowNewInput(false);
          setActiveTab("overview");
          showAlert("Ready!", `"${newName.trim()}" is set up. Follow the checklist to configure it.`);
        } catch (err) {
          showAlert("Failed", err.message);
        } finally {
          setCreating(false);
        }
      }
    );
  };

  const voters  = (users || []).filter((u) => u.role !== "ADMIN");
  const votedCount = voters.filter((u) => u.hasVoted).length;

  const statusColors = {
    ACTIVE:      "text-green-400",
    ENDED:       "text-red-400",
    NOT_STARTED: "text-amber-400",
  };
  const statusDots = {
    ACTIVE:      "bg-green-500 animate-pulse",
    ENDED:       "bg-red-500",
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
                {branding?.electionName || "Virtual Ballot — Election Management"}
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Election status pill */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDots[electionConfig.status] ?? "bg-slate-500"}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${statusColors[electionConfig.status] ?? "text-slate-400"}`}>
                {electionConfig.status.replace("_", " ")}
              </span>
            </div>

            {/* New Election — only after current is ENDED */}
            {electionConfig.status === "ENDED" && !showNewInput && (
              <button
                onClick={handleNewElection}
                title="Create a new election"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Election
              </button>
            )}

            {/* Inline name input */}
            {showNewInput && (
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmNew()}
                  placeholder="Election name…"
                  autoFocus
                  className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-blue-500 w-44 placeholder:text-slate-500"
                />
                <button
                  onClick={confirmNew}
                  disabled={creating || !newName.trim()}
                  title="Create this election"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {creating ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Create"}
                </button>
                <button
                  onClick={() => setShowNewInput(false)}
                  title="Cancel"
                  className="text-slate-500 hover:text-white text-xs font-bold px-2 py-2 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Manual refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh dashboard data"
              className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
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
          {TABS.map((t) => {
            const Icon   = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap cursor-pointer ${
                  active ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:text-slate-300"
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
          {activeTab === "overview"   && <OverviewTab onSwitchTab={setActiveTab} />}
          {activeTab === "election"   && <ElectionTab />}
          {activeTab === "voters"     && <VotersTab />}
          {activeTab === "candidates" && <CandidatesTab />}
          {activeTab === "branding"   && <BrandingTab />}
          {activeTab === "history"    && <HistoryTab />}
          {activeTab === "audit"      && <AuditLogTab />}
        </div>
      </div>
    </div>
  );
}
