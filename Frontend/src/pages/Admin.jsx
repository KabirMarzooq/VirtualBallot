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
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PageShell from "../components/layout/PageShell";
import OverviewTab from "../components/admin/OverviewTab";
import ElectionTab from "../components/admin/ElectionTab";
import VotersTab from "../components/admin/VotersTab";
import CandidatesTab from "../components/admin/CandidatesTab";
import BrandingTab from "../components/admin/BrandingTab";
import AuditLogTab from "../components/admin/AuditLogTab";
import HistoryTab from "../components/admin/HistoryTab";
import { createNewElection, fetchAdminOverview } from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "election", label: "Election", icon: Vote },
  { id: "voters", label: "Voters", icon: Users },
  { id: "candidates", label: "Candidates", icon: UserSquare2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "history", label: "History", icon: Archive },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminPage() {
  const {
    currentUser,
    setCurrentUser,
    resetBallotSession,
    electionConfig,
    activityLog,
    users,
    accessToken,
    orgSlug,
    setCandidates,
    setUsers,
    setElectionConfig,
    setElectionId,
    setActivityLog,
    showAlert,
    showConfirm,
    addLog,
  } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewElectionInput, setShowNewElectionInput] = useState(false);
  const [newElectionName, setNewElectionName] = useState("");
  const [creatingElection, setCreatingElection] = useState(false);

  // Listen for tab-switch events fired by the setup checklist in OverviewTab
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    window.addEventListener("vb:switchtab", handler);
    return () => window.removeEventListener("vb:switchtab", handler);
  }, []);

  // Guard: not logged in as admin
  if (!currentUser || currentUser.role !== "ADMIN") {
    navigate("/admin/login");
    return null;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate("/");
  };

  const handleNewElection = () => {
    if (electionConfig.status === "ACTIVE") {
      return showAlert(
        "Election Active",
        "End the current election before starting a new one."
      );
    }
    if (electionConfig.status === "NOT_STARTED") {
      return showAlert(
        "Not Needed",
        "Your current election hasn't run yet. Configure it in the Election tab."
      );
    }
    setShowNewElectionInput(true);
    setNewElectionName("");
  };

  const confirmNewElection = () => {
    if (!newElectionName.trim())
      return showAlert("Name Required", "Enter a name for the new election.");
    showConfirm(
      "Start Fresh?",
      `Archive the current election and create "${newElectionName.trim()}"? Voters and candidates will be cleared. Results are saved in History.`,
      async () => {
        setCreatingElection(true);
        try {
          const data = await createNewElection(
            newElectionName.trim(),
            accessToken,
            orgSlug
          );
          const overview = await fetchAdminOverview(accessToken, orgSlug);
          setElectionId(data.election.id);
          setElectionConfig({
            status: overview.election.status,
            isPublished: overview.election.isPublished,
            registryLocked: overview.election.registryLocked,
            showCountdown: overview.election.showCountdown,
            endsAt: overview.election.endsAt,
          });
          setCandidates([]);
          setUsers([]);
          setActivityLog([]);
          addLog(`New election created: "${newElectionName.trim()}"`, "system");
          setShowNewElectionInput(false);
          setActiveTab("overview");
          showAlert(
            "Ready!",
            `"${newElectionName.trim()}" is set up. Follow the checklist to configure it.`
          );
        } catch (err) {
          showAlert("Failed", err.message);
        } finally {
          setCreatingElection(false);
        }
      }
    );
  };

  const voters = users.filter((u) => u.role !== "ADMIN");
  const voted = voters.filter((u) => u.hasVoted);

  const ActiveComponent = {
    overview: OverviewTab,
    election: ElectionTab,
    voters: VotersTab,
    candidates: CandidatesTab,
    branding: BrandingTab,
    history: HistoryTab,
    audit: AuditLogTab,
  }[activeTab];

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-1">
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          {/* Console header */}
          <div className="px-6 md:px-8 pt-8 pb-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">
                    Admin Console
                  </h2>
                  <p className="text-xs text-slate-500">
                    Virtual Ballot — Election Management
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Status pill */}
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-full border border-slate-700">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      electionConfig.status === "ACTIVE"
                        ? "bg-green-500 animate-pulse"
                        : electionConfig.status === "ENDED"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {electionConfig.status.replace("_", " ")}
                  </span>
                </div>

                {/* New Election button — only when election is ENDED */}
                {electionConfig.status === "ENDED" && !showNewElectionInput && (
                  <button
                    onClick={handleNewElection}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Election
                  </button>
                )}

                {/* Inline name input — appears when New Election is clicked */}
                {showNewElectionInput && (
                  <div className="flex items-center gap-2">
                    <input
                      value={newElectionName}
                      onChange={(e) => setNewElectionName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && confirmNewElection()
                      }
                      placeholder="Election name…"
                      autoFocus
                      className="bg-slate-700 border border-slate-600 text-white text-xs font-bold px-3 py-2 rounded-full outline-none focus:border-blue-500 w-40 placeholder:text-slate-500"
                    />
                    <button
                      onClick={confirmNewElection}
                      disabled={creatingElection || !newElectionName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-full transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      {creatingElection ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </button>
                    <button
                      onClick={() => setShowNewElectionInput(false)}
                      className="text-slate-500 hover:text-white text-xs font-bold px-2 py-2 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Log Out</span>
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 md:px-5 py-3 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-slate-800 text-white border-t border-l border-r border-slate-700"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                    {/* Badge on Voters tab */}
                    {t.id === "voters" && voted.length > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                        {voted.length}
                      </span>
                    )}
                    {/* Badge on Audit tab */}
                    {t.id === "audit" && activityLog.length > 0 && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">
                        {activityLog.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="bg-slate-800/30 p-5 md:p-8 rounded-b-4xl">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
