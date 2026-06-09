import { useState, useEffect } from "react";
import {
  Archive,
  Trophy,
  Users,
  BarChart3,
  Calendar,
  FileDown,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  fetchElectionHistory,
  createNewElection,
  fetchAdminOverview,
} from "../../api";
import VBLoader from "../ui/VBLoader";

export default function HistoryTab() {
  const {
    accessToken,
    orgSlug,
    electionConfig,
    setCandidates,
    setUsers,
    setElectionConfig,
    setElectionId,
    setActivityLog,
    setBranding,
    showAlert,
    showConfirm,
    addLog,
  } = useApp();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchElectionHistory(accessToken, orgSlug);
        setHistory(data.elections);
      } catch (err) {
        console.error("History load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, orgSlug]);

  const handleCreateNew = () => {
    if (electionConfig.status === "ACTIVE") {
      return showAlert(
        "Election Active",
        "You cannot start a new election while one is still running. End the current election first."
      );
    }
    setShowNewForm(true);
    setNewName("");
  };

  const confirmCreate = () => {
    if (!newName.trim())
      return showAlert(
        "Name Required",
        "Please enter a name for the new election."
      );
    showConfirm(
      "Create New Election?",
      `This will archive the current election and create a fresh one called "${newName.trim()}". All current voters and candidates will be cleared. Past results are saved in history.`,
      async () => {
        setCreating(true);
        try {
          const data = await createNewElection(
            newName.trim(),
            accessToken,
            orgSlug
          );

          // Re-fetch the full admin overview so context reflects the new blank election
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
          addLog(`New election created: "${newName.trim()}"`, "system");

          // Refresh history to include the just-archived one
          const historyData = await fetchElectionHistory(accessToken, orgSlug);
          setHistory(historyData.elections);

          setShowNewForm(false);
          showAlert(
            "New Election Ready",
            `"${newName.trim()}" is set up. Head to Branding, Candidates, and Voters to configure it.`
          );
        } catch (err) {
          showAlert("Failed", err.message);
        } finally {
          setCreating(false);
        }
      }
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return "—";
    const ms = new Date(end) - new Date(start);
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header + New Election button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-black text-lg">Election History</h3>
          <p className="text-slate-400 text-sm mt-0.5">
            All concluded elections for your organization
          </p>
        </div>
        {electionConfig.status !== "ACTIVE" && (
          <button
            onClick={handleCreateNew}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" /> New Election
          </button>
        )}
      </div>

      {/* New election name form */}
      {showNewForm && (
        <div className="bg-slate-800 border border-blue-500/40 rounded-2xl p-5 space-y-4">
          <p className="text-white font-bold">Name the new election</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmCreate()}
            placeholder="e.g. Senate Elections 2025"
            autoFocus
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
          <div className="flex gap-3">
            <button
              onClick={confirmCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <VBLoader size="sm" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Create & Archive Current
                </>
              )}
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-5 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <VBLoader size="lg" label="Loading history..." />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-slate-800 border border-dashed border-slate-600 rounded-2xl p-12 text-center">
          <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-black mb-2">
            No concluded elections yet
          </h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Once an election ends, it will appear here with full results,
            turnout stats, and winner information.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((election) => (
            <div
              key={election.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
            >
              {/* Election header */}
              <div className="px-6 py-4 border-b border-slate-700 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-white font-black text-base">
                    {election.name}
                  </h4>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(election.startedAt)}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      Duration:{" "}
                      {formatDuration(election.startedAt, election.endsAt)}
                    </span>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-black text-white font-mono">
                      {election.turnout}%
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Turnout
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-green-400 font-mono">
                      {election.votesCast}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Votes
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-300 font-mono">
                      {election.totalVoters}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Registered
                    </p>
                  </div>
                </div>
              </div>

              {/* Winners per position */}
              {election.winners.length > 0 && (
                <div className="px-6 py-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    Election Results
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {election.winners.map((w) => (
                      <div
                        key={w.position}
                        className="flex items-center gap-3 bg-slate-900/60 rounded-xl p-3 border border-slate-700/50"
                      >
                        {/* Winner photo */}
                        {w.image_url && (
                          <img
                            src={w.image_url}
                            alt={w.winner}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-700 shrink-0"
                          />
                        )}
                        {!w.image_url && (
                          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                            {w.position}
                          </p>
                          <p className="text-sm font-black text-white truncate">
                            {w.winner}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-blue-400">
                            {w.pct}%
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {w.votes} votes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participation bar */}
              <div className="px-6 pb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                    Voter Participation
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {election.votesCast} / {election.totalVoters}
                  </p>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
