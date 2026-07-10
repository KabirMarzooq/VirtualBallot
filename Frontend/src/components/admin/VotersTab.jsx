import { useState } from "react";
import {
  Upload,
  Users,
  FileDown,
  Search,
  UserCheck,
  UserX,
  Copy,
  Check,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Lock,
  Flag,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  parseVoterCSV,
  buildVoterCSV,
  downloadCSV,
  getTurnout,
} from "../../utils";
import {
  uploadRoster,
  removeVoter,
  resolveRosterFlag,
  regenerateReviewCodes,
  updateElectionConfig,
} from "../../api";
import VBLoader from "../ui/VBLoader";

export default function VotersTab() {
  const {
    users,
    setUsers,
    accessToken,
    orgSlug,
    showAlert,
    showConfirm,
    addLog,
    candidates,
    electionConfig,
    setElectionConfig,
    rosterApproval,
    refreshRosterApproval,
  } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedObs, setCopiedObs] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);

  const voterUrl = `${window.location.origin}/vote/${orgSlug}`;
  const observerUrl = `${window.location.origin}/observer/login?slug=${orgSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(voterUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyObs = () => {
    navigator.clipboard.writeText(observerUrl).then(() => {
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2000);
    });
  };

  const voters = users.filter((u) => u.role !== "ADMIN");
  const voted = voters.filter((u) => u.hasVoted);
  const pending = voters.filter((u) => !u.hasVoted);
  const { pct, accredited } = getTurnout(users);

  const filtered = voters.filter((u) => {
    const matchText =
      u.matric.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "accredited" && u.email) ||
      (filter === "voted" && u.hasVoted) ||
      (filter === "pending" && !u.hasVoted);
    return matchText && matchFilter;
  });

  const exportCSV = () => downloadCSV(buildVoterCSV(voters), "registry.csv");

  // Upload CSV → parse → POST to backend
  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseVoterCSV(ev.target.result);
      if (parsed.length === 0)
        return showAlert("Empty File", "No valid rows found in the CSV.");
      setUploading(true);
      try {
        const result = await uploadRoster(
          parsed,
          accessToken,
          orgSlug,
          replaceMode
        );
        // Refresh local state with the new voters
        const newVoters = parsed.map((v) => ({
          matric: v.matric,
          name: v.name,
          email: v.email || null,
          hasVoted: false,
          votedAt: null,
          role: "STUDENT",
        }));

        if (replaceMode) {
          // Replace mode: keep voters who have already voted, swap out everyone else
          setUsers((prev) => {
            const voted = prev.filter((u) => u.hasVoted);
            const votedMatrics = new Set(voted.map((u) => u.matric));
            const fresh = newVoters.filter((v) => !votedMatrics.has(v.matric));
            return [...voted, ...fresh];
          });
          addLog(
            `Roster replaced — ${result.inserted} voters loaded`,
            "registry"
          );
          showAlert(
            "Roster Replaced",
            `${result.inserted} voters loaded. Voters who already voted were preserved.`
          );
        } else {
          // Append mode: skip duplicates
          setUsers((prev) => {
            const existing = new Set(prev.map((u) => u.matric));
            const toAdd = newVoters.filter((v) => !existing.has(v.matric));
            return [...prev, ...toAdd];
          });
          addLog(
            `Roster updated — ${result.inserted} voters added`,
            "registry"
          );
          showAlert(
            "Upload Success",
            `${result.inserted} voters added to roster. ${result.skipped} skipped (duplicates).`
          );
        }
        // Load the freshly-generated review codes and show the approval board
        refreshRosterApproval();
      } catch (err) {
        showAlert("Upload Failed", err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRemove = async (voter) => {
    try {
      await removeVoter(voter.id, accessToken, orgSlug);
      setUsers((prev) => prev.filter((u) => u.matric !== voter.matric));
      addLog(`Voter ${voter.matric} removed from roster`, "registry");
    } catch (err) {
      showAlert("Cannot Remove", err.message);
    }
  };

  // ── Roster approval helpers ─────────────────────────────────────────────────
  const positionFor = (candidateId) =>
    candidates.find((c) => c.id === candidateId)?.position || "";

  // Flatten every flag with its rep (candidate) name for the flags table
  const allFlags = rosterApproval.approvals.flatMap((a) =>
    (a.flags || []).map((f) => ({ ...f, rep: a.candidateName }))
  );
  const unresolvedFlags = allFlags.filter((f) => !f.resolved);

  const copyAllCodes = () => {
    const lines = rosterApproval.approvals
      .map((a) => {
        const pos = positionFor(a.candidateId);
        return `${a.candidateName}${pos ? ` (${pos})` : ""}: ${a.reviewCode}`;
      })
      .join("\n");
    const text = `Virtual Ballot — Roster Review Codes
Please use your code to review and approve the voter list at:
${window.location.origin}/roster-review

${lines}`;
    navigator.clipboard.writeText(text).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2500);
    });
  };

  const handleRegenerate = () => {
    showConfirm(
      "Regenerate review codes?",
      "This resets every rep's approval and issues brand-new codes. Reps who already approved will need to review and approve again. Continue?",
      async () => {
        setApprovalBusy(true);
        try {
          await regenerateReviewCodes(accessToken, orgSlug);
          await refreshRosterApproval();
          addLog("Roster review codes regenerated — all approvals reset", "registry");
        } catch (err) {
          showAlert("Regeneration Failed", err.message);
        } finally {
          setApprovalBusy(false);
        }
      }
    );
  };

  const handleResolveFlag = async (flagId, matric) => {
    setApprovalBusy(true);
    try {
      await resolveRosterFlag(flagId, accessToken, orgSlug);
      await refreshRosterApproval();
      addLog(`Flag on matric ${matric} resolved`, "admin");
    } catch (err) {
      showAlert("Could Not Resolve", err.message);
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleLockRegistry = () => {
    if (!rosterApproval.allApproved || rosterApproval.hasUnresolvedFlags) return;
    showConfirm(
      "Lock the registry?",
      "All candidate reps have approved the voter list. Locking the registry finalises it so it can no longer be edited before voting. Continue?",
      async () => {
        setApprovalBusy(true);
        try {
          await updateElectionConfig(
            { registryLocked: true },
            accessToken,
            orgSlug
          );
          setElectionConfig((prev) => ({ ...prev, registryLocked: true }));
          addLog("Registry locked — roster approved by all candidate reps", "registry");
          showAlert(
            "Registry Locked",
            "The voter registry is now locked. You can start the election from the Election tab."
          );
        } catch (err) {
          showAlert("Could Not Lock Registry", err.message);
        } finally {
          setApprovalBusy(false);
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Roster approval dashboard ──────────────────────────────────────── */}
      {rosterApproval.status !== "IDLE" && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-teal-400" />
              <h3 className="text-white font-black">Roster Approval Status</h3>
              {rosterApproval.status === "APPROVED" && (
                <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-green-900/50 text-green-400">
                  All reps approved
                </span>
              )}
            </div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-slate-300">
                {rosterApproval.approvedCount} of {rosterApproval.totalCount}{" "}
                candidate reps have approved
              </p>
              <p className="text-sm font-mono font-bold text-white">
                {rosterApproval.totalCount
                  ? Math.round(
                      (rosterApproval.approvedCount / rosterApproval.totalCount) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-teal-500 to-green-400 h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${
                    rosterApproval.totalCount
                      ? (rosterApproval.approvedCount /
                          rosterApproval.totalCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Per-candidate approval rows */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
            <span className="col-span-4">Candidate</span>
            <span className="col-span-3">Position</span>
            <span className="col-span-3">Status</span>
            <span className="col-span-2">Approved</span>
          </div>
          <div className="divide-y divide-slate-700/40">
            {rosterApproval.approvals.map((a) => {
              const unresolved = (a.flags || []).some((f) => !f.resolved);
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-12 gap-2 px-5 py-3 items-center"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {a.candidateName}
                    </p>
                    <p className="text-xs font-mono text-teal-400 tracking-widest">
                      {a.reviewCode}
                    </p>
                  </div>
                  <span className="col-span-3 text-xs text-slate-400 truncate">
                    {positionFor(a.candidateId) || "—"}
                  </span>
                  <div className="col-span-3">
                    {a.approved ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-900/50 text-green-400">
                        Approved
                      </span>
                    ) : unresolved ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-900/50 text-red-400">
                        Has Flags
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-900/50 text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="col-span-2 text-xs text-slate-500">
                    {a.approvedAt
                      ? new Date(a.approvedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-slate-700 flex flex-wrap gap-3">
            <button
              onClick={copyAllCodes}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                codesCopied
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {codesCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {codesCopied ? "Copied!" : "Copy all review codes"}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={approvalBusy}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate codes
            </button>
          </div>

          {/* Flagged entries */}
          {unresolvedFlags.length > 0 && (
            <div className="px-5 pb-5">
              <div className="bg-red-950/30 border border-red-900/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-red-900/40">
                  <Flag className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-red-300">
                    Flagged Entries
                  </p>
                  <span className="ml-auto text-xs font-mono text-red-400">
                    {unresolvedFlags.length} to resolve
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-red-400/70 uppercase tracking-widest border-b border-red-900/30">
                  <span className="col-span-3">Matric</span>
                  <span className="col-span-3">Rep</span>
                  <span className="col-span-4">Reason</span>
                  <span className="col-span-2"></span>
                </div>
                {unresolvedFlags.map((f) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-red-900/20 last:border-0"
                  >
                    <span className="col-span-3 font-mono text-xs text-slate-300 truncate">
                      {f.matric}
                    </span>
                    <span className="col-span-3 text-xs text-slate-400 truncate">
                      {f.rep}
                    </span>
                    <span className="col-span-4 text-xs text-amber-300 truncate">
                      {f.reason}
                    </span>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => handleResolveFlag(f.id, f.matric)}
                        disabled={approvalBusy}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lock registry — gated on all approved + no unresolved flags */}
          <div className="px-5 pb-5">
            <button
              onClick={handleLockRegistry}
              disabled={
                approvalBusy ||
                !rosterApproval.allApproved ||
                rosterApproval.hasUnresolvedFlags ||
                electionConfig.registryLocked
              }
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {electionConfig.registryLocked
                ? "Registry Locked"
                : rosterApproval.allApproved && !rosterApproval.hasUnresolvedFlags
                ? "Lock Registry — all reps approved"
                : "Lock Registry — awaiting approvals"}
            </button>
          </div>
        </div>
      )}

      {/* Org voter URL */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Voter URL
          </p>
          <p className="text-sm font-mono text-blue-400 truncate">{voterUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy voter URL to clipboard"}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
            copied
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
          }`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Org observer URL */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Observer URL
          </p>
          <p className="text-sm font-mono text-teal-400 truncate">
            {observerUrl}
          </p>
        </div>
        <button
          onClick={handleCopyObs}
          title={copiedObs ? "Copied!" : "Copy observer URL to clipboard"}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
            copiedObs
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
          }`}
        >
          {copiedObs ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copiedObs ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Registered", voters.length, "text-white", "all"],
          ["Accredited", accredited, "text-blue-400", "accredited"],
          ["Voted", voted.length, "text-green-400", "voted"],
          ["Pending", pending.length, "text-amber-400", "pending"],
        ].map(([l, v, c, f]) => (
          <button
            key={l}
            onClick={() => setFilter(f)}
            className={`bg-slate-800 rounded-2xl p-5 border text-left hover:border-slate-500 transition-colors cursor-pointer ${
              filter === f ? "border-blue-500" : "border-slate-700"
            }`}
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              {l}
            </p>
            <p className={`text-3xl font-mono font-bold ${c}`}>{v}</p>
          </button>
        ))}
      </div>

      {/* Turnout bar */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Voter Turnout
          </p>
          <p className="text-sm font-mono font-bold text-white">{pct}%</p>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      {/* Upload mode toggle + actions */}
      <div className="space-y-3">
        {/* Append vs Replace toggle */}
        <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {replaceMode ? "Replace roster" : "Add to roster"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {replaceMode
                ? "Clears all unvoted entries and uploads fresh — use for a new election"
                : "Adds new voters to the existing roster — duplicates are skipped"}
            </p>
          </div>
          <button
            onClick={() => setReplaceMode((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
              replaceMode ? "bg-amber-500" : "bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                replaceMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3">
          <label
            className={`flex-1 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors ${
              uploading
                ? "bg-slate-600 cursor-not-allowed"
                : replaceMode
                ? "bg-amber-600 hover:bg-amber-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {uploading ? (
              <VBLoader size="sm" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {replaceMode ? "Replace CSV Roster" : "Add CSV Voters"}
              </>
            )}
            <input
              type="file"
              accept=".csv"
              onChange={upload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <button
            onClick={exportCSV}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Empty state — shown before any roster is uploaded */}
      {voters.length === 0 && (
        <div className="bg-slate-800 border border-dashed border-slate-600 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-white font-black mb-2">No voters yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Upload a CSV file to add eligible voters to the roster. Voters must
            be on the roster to register and vote.
          </p>

          {/* CSV format reminder */}
          <div className="bg-slate-900 rounded-xl p-4 text-left max-w-xs mx-auto mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              CSV format
            </p>
            <code className="text-xs text-green-400 font-mono leading-relaxed block">
              matric,name,email
              <br />
              U/25/001,Amina Yusuf,amina@gmail.com
              <br />
              U/25/002,Emeka Obi,emeka@gmail.com
            </code>
          </div>

          <label className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /> Upload CSV Roster
            <input
              type="file"
              accept=".csv"
              onChange={upload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            {[
              ["all", "All"],
              ["accredited", "Accredited"],
              ["voted", "Voted"],
              ["pending", "Pending"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filter === v
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {l}
              </button>
            ))}
            <div className="flex-1 min-w-40 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-1.5 pl-8 pr-3 text-sm outline-none text-white placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
          <span className="col-span-3">Matric</span>
          <span className="col-span-4">Name</span>
          <span className="col-span-3">Email</span>
          <span className="col-span-1 text-center">✓</span>
          <span className="col-span-1"></span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">
              No voters match.
            </p>
          ) : (
            filtered.map((u) => (
              <div
                key={u.matric}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-700/30 border-b border-slate-700/30 last:border-0 group"
              >
                <span className="col-span-3 font-mono text-sm text-slate-300 truncate">
                  {u.matric}
                </span>
                <span className="col-span-4 text-sm font-bold text-white truncate">
                  {u.name}
                </span>
                <span className="col-span-3 text-xs text-slate-500 truncate">
                  {u.email ?? "—"}
                </span>
                <div className="col-span-1 flex justify-center">
                  {u.hasVoted ? (
                    <UserCheck className="w-4 h-4 text-green-400" />
                  ) : (
                    <UserX className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="col-span-1 flex justify-center">
                  {!u.hasVoted && (
                    <button
                      onClick={() => handleRemove(u)}
                      className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-600">
          Showing {filtered.length} of {voters.length}
        </div>
      </div>
    </div>
  );
}
