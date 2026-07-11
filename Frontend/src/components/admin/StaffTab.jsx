import { useState, useEffect } from "react";
import {
  Headset,
  Plus,
  Trash2,
  Mail,
  AlertTriangle,
  Copy,
  Check,
  Power,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  createStaff,
  getStaffList,
  getAssignableElections,
  setStaffActive,
  setStaffElections,
  deleteStaffMember,
} from "../../api";
import VBLoader from "../ui/VBLoader";

export default function StaffTab() {
  const { accessToken, showAlert, showConfirm, addLog } = useApp();

  const [staff, setStaff] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState(false);

  const staffUrl = `${window.location.origin}/staff/chat`;

  const handleCopy = () => {
    navigator.clipboard.writeText(staffUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    Promise.all([getStaffList(accessToken), getAssignableElections(accessToken)])
      .then(([staffData, elData]) => {
        setStaff(staffData.staff);
        setElections(elData.elections || []);
      })
      .catch((err) => {
        console.error("Failed to load staff:", err);
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const create = async () => {
    if (!name.trim() || !email.trim() || !password)
      return showAlert("Missing Info", "Name, email, and password are required.");
    if (password.length < 8)
      return showAlert("Weak Password", "Password must be at least 8 characters.");
    setCreating(true);
    try {
      const data = await createStaff(name.trim(), email.trim(), password, accessToken);
      setStaff((prev) => [{ ...data.staff, election_ids: [] }, ...prev]);
      addLog(`Staff member "${data.staff.name}" created`, "admin");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      showAlert("Failed to Create Staff", err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (member) => {
    setBusyId(member.id);
    try {
      const data = await setStaffActive(member.id, !member.is_active, accessToken);
      setStaff((prev) =>
        prev.map((s) =>
          s.id === member.id ? { ...s, is_active: data.staff.is_active } : s
        )
      );
      addLog(
        `Staff member "${member.name}" ${data.staff.is_active ? "reactivated" : "deactivated"}`,
        "admin"
      );
    } catch (err) {
      showAlert("Action Failed", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = (member) => {
    showConfirm(
      "Delete staff member?",
      `${member.name} will be permanently removed and can no longer log in. Any chats they had claimed return to the queue. This cannot be undone. Continue?`,
      async () => {
        setBusyId(member.id);
        try {
          await deleteStaffMember(member.id, accessToken);
          setStaff((prev) => prev.filter((s) => s.id !== member.id));
          addLog(`Staff member "${member.name}" deleted`, "admin");
        } catch (err) {
          showAlert("Cannot Delete", err.message);
        } finally {
          setBusyId(null);
        }
      }
    );
  };

  const toggleElection = async (member, electionId) => {
    const current = member.election_ids || [];
    const next = current.includes(electionId)
      ? current.filter((id) => id !== electionId)
      : [...current, electionId];
    // Optimistic update
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, election_ids: next } : s))
    );
    try {
      await setStaffElections(member.id, next, accessToken);
    } catch (err) {
      // Revert on failure
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, election_ids: current } : s))
      );
      showAlert("Could Not Update Assignments", err.message);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <VBLoader size="lg" label="Loading staff..." />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Staff console URL — send this to staff alongside their credentials */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Staff Support Console
          </p>
          <p className="text-sm font-mono text-blue-400 truncate">{staffUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy staff console link to clipboard"}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
            copied
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      {/* Add form */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
          Add Staff Member
        </p>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="e.g. Amaka Obi"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="staff@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {creating ? (
              <VBLoader size="sm" />
            ) : (
              <>
                <Plus className="w-5 h-5" /> Create Staff Account
              </>
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Staff Members — {staff.length}
        </p>
        {loadError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300 font-bold">{loadError}</p>
          </div>
        )}
        {staff.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-10 border border-dashed border-slate-600 text-center">
            <Headset className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white font-black mb-2">No staff accounts yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Create staff accounts above so committee members can answer voter
              questions in the live-support chat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((s) => {
              const assigned = s.election_ids || [];
              const busy = busyId === s.id;
              return (
                <div
                  key={s.id}
                  className={`bg-slate-800 rounded-2xl border border-slate-700 p-4 ${
                    s.is_active ? "" : "opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                      <Headset className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white truncate">{s.name}</p>
                        {!s.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 uppercase shrink-0">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {s.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={busy}
                        title={s.is_active ? "Deactivate" : "Reactivate"}
                        className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                          s.is_active
                            ? "text-slate-400 hover:text-amber-400 hover:bg-slate-700"
                            : "text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                        }`}
                      >
                        {busy ? <VBLoader size="sm" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => remove(s)}
                        disabled={busy}
                        title="Delete permanently"
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Election assignment */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Assigned elections — tap to toggle
                    </p>
                    {elections.length === 0 ? (
                      <p className="text-xs text-slate-600">No elections yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {elections.map((e) => {
                          const on = assigned.includes(e.id);
                          return (
                            <button
                              key={e.id}
                              onClick={() => toggleElection(s, e.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                                on
                                  ? "bg-blue-600/20 text-blue-300 border-blue-600/40"
                                  : "bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-600"
                              }`}
                            >
                              {on ? "✓ " : ""}
                              {e.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {assigned.length === 0 && elections.length > 0 && (
                      <p className="text-[11px] text-amber-500/80 mt-2">
                        Not assigned to any election — this staff member currently
                        sees no chats.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
