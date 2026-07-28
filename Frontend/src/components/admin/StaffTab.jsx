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

  const fieldLabel =
    "block text-[13px] leading-5 font-medium text-slate-600 mb-2";
  const fieldInput =
    "w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all";

  return (
    <div className="space-y-4">
      {/* Staff console URL — send this to staff alongside their credentials */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-1">
            Staff Support Console
          </p>
          <p className="font-mono text-[13px] text-blue-600 truncate">
            {staffUrl}
          </p>
        </div>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy staff console link to clipboard"}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            copied
              ? "bg-green-50 text-green-600 border-green-600/30"
              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-800"
          }`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      {/* Add form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-4">
          Add Staff Member
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={fieldLabel}>Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldInput}
              placeholder="e.g. Amaka Obi"
            />
          </div>
          <div>
            <label className={fieldLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldInput}
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className={fieldLabel}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldInput}
              placeholder="At least 8 characters"
            />
          </div>
        </div>
        <button
          onClick={create}
          disabled={creating}
          title="Create this staff account"
          className="w-full mt-4 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {creating ? (
            <VBLoader size="sm" />
          ) : (
            <>
              <Plus className="w-4 h-4" /> Create staff account
            </>
          )}
        </button>
      </div>

      {/* List */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
          Staff Members — {staff.length}
        </p>
        {loadError && (
          <div className="mb-3 px-3.5 py-3 bg-red-50 border border-red-600/30 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs font-medium text-red-600">{loadError}</p>
          </div>
        )}
        {staff.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Headset className="w-6 h-6" />
            </div>
            <p className="text-[15px] font-semibold text-slate-900">
              No staff accounts yet
            </p>
            <p className="text-xs leading-[18px] text-slate-600 mt-1 max-w-xs mx-auto">
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
                  className={`bg-white border border-slate-200 rounded-xl p-4 ${
                    s.is_active ? "" : "opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Headset className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">
                          {s.name}
                        </p>
                        {!s.is_active && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-[0.06em] shrink-0">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 truncate mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" /> {s.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={busy}
                        title={s.is_active ? "Deactivate" : "Reactivate"}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                          s.is_active
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {busy ? (
                          <VBLoader size="sm" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => remove(s)}
                        disabled={busy}
                        title="Delete permanently"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Election assignment */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">
                      Assigned elections — tap to toggle
                    </p>
                    {elections.length === 0 ? (
                      <p className="text-xs text-slate-400">No elections yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {elections.map((e) => {
                          const on = assigned.includes(e.id);
                          return (
                            <button
                              key={e.id}
                              onClick={() => toggleElection(s, e.id)}
                              title={
                                on
                                  ? `Unassign ${e.name}`
                                  : `Assign ${e.name}`
                              }
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold min-h-[32px] px-3 rounded-full border transition-all cursor-pointer ${
                                on
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                              }`}
                            >
                              {on && <Check className="w-3 h-3" />}
                              {e.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {assigned.length === 0 && elections.length > 0 && (
                      <p className="text-[11px] leading-4 text-amber-600 mt-2">
                        Not assigned to any election — this staff member
                        currently sees no chats.
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
