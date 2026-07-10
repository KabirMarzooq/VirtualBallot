import { useState, useEffect } from "react";
import { Headset, Plus, Trash2, Mail, AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { createStaff, getStaffList, deleteStaffMember } from "../../api";
import VBLoader from "../ui/VBLoader";

export default function StaffTab() {
  const { accessToken, showAlert, showConfirm, addLog } = useApp();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getStaffList(accessToken)
      .then((data) => setStaff(data.staff))
      .catch((err) => {
        console.error("Failed to load staff list:", err);
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const create = async () => {
    if (!name.trim() || !email.trim() || !password)
      return showAlert(
        "Missing Info",
        "Name, email, and password are required."
      );
    if (password.length < 8)
      return showAlert(
        "Weak Password",
        "Password must be at least 8 characters."
      );
    setCreating(true);
    try {
      const data = await createStaff(
        name.trim(),
        email.trim(),
        password,
        accessToken
      );
      setStaff((prev) => [data.staff, ...prev]);
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

  const remove = (member) => {
    showConfirm(
      "Deactivate staff member?",
      `${member.name} will no longer be able to log in to the live-support console. Continue?`,
      async () => {
        setDeletingId(member.id);
        try {
          await deleteStaffMember(member.id, accessToken);
          setStaff((prev) =>
            prev.map((s) =>
              s.id === member.id ? { ...s, is_active: false } : s
            )
          );
          addLog(`Staff member "${member.name}" deactivated`, "admin");
        } catch (err) {
          showAlert("Cannot Deactivate", err.message);
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <VBLoader size="lg" label="Loading staff..." />
      </div>
    );

  return (
    <div className="space-y-6">
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
              Create staff accounts above so committee members can answer
              voter questions in the live-support chat.
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 divide-y divide-slate-700/50">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                  <Headset className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {s.email}
                  </p>
                </div>
                {s.is_active ? (
                  <button
                    onClick={() => remove(s)}
                    disabled={deletingId === s.id}
                    className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer disabled:opacity-100"
                  >
                    {deletingId === s.id ? (
                      <VBLoader size="sm" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-700 text-slate-400 uppercase shrink-0">
                    Deactivated
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
