import { useState } from "react";
import {
  Plus,
  Eye,
  AlertTriangle,
  Image,
  FileText,
  CheckCircle,
  Trash2,
  UserSquare2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getPositions } from "../../utils";
import { addCandidate, updateCandidate, removeCandidate } from "../../api";
import VBLoader from "../ui/VBLoader";

export default function CandidatesTab() {
  const {
    candidates,
    setCandidates,
    electionConfig,
    accessToken,
    showAlert,
    addLog,
    orgSlug,
  } = useApp();

  const [name, setName] = useState("");
  const [pos, setPos] = useState("");
  const [img, setImg] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [preview, setPreview] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const positions = getPositions(candidates);
  const locked = electionConfig.status !== "NOT_STARTED";

  const add = async () => {
    if (!name.trim() || !pos.trim())
      return showAlert("Missing Info", "Name and position are required.");
    if (locked)
      return showAlert(
        "Locked",
        "Cannot add candidates after the election has started."
      );
    setSaving(true);
    try {
      const data = await addCandidate(
        {
          name: name.trim(),
          position: pos.trim(),
          imageUrl: img.trim() || undefined,
          manifesto: manifesto.trim() || undefined,
        },
        accessToken, orgSlug
      );
      setCandidates((prev) => [
        ...prev,
        {
          id: data.candidate.id,
          name: data.candidate.name,
          position: data.candidate.position,
          image: data.candidate.image_url,
          manifesto: data.candidate.manifesto || "",
          color: data.candidate.color,
          votes: 0,
        },
      ]);
      addLog(`Candidate "${name.trim()}" added for ${pos.trim()}`, "candidate");
      setName("");
      setPos("");
      setImg("");
      setManifesto("");
      setPreview(false);
    } catch (err) {
      showAlert("Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    setSaving(true);
    try {
      await removeCandidate(c.id, accessToken, orgSlug);
      setCandidates((prev) => prev.filter((x) => x.id !== c.id));
      addLog(`Candidate "${c.name}" removed`, "candidate");
    } catch (err) {
      showAlert("Cannot Remove", err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveManifesto = async (c) => {
    setSaving(true);
    try {
      await updateCandidate(c.id, { manifesto: editText.trim() }, accessToken, orgSlug);
      setCandidates((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, manifesto: editText.trim() } : x
        )
      );
      addLog(`Manifesto updated for "${c.name}"`, "candidate");
      setEditingId(null);
    } catch (err) {
      showAlert("Update Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewImg =
    img.trim() ||
    (name.trim()
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(
          /\s+/g,
          ""
        )}`
      : null);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
          Add Candidate
        </p>
        {locked && (
          <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-bold">
              Election live — candidate list is locked.
            </p>
          </div>
        )}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={locked}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder="e.g. Jane Okafor"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                Position
              </label>
              <input
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                disabled={locked}
                list="pos-list"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder="e.g. President"
              />
              <datalist id="pos-list">
                {positions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
              Photo URL (optional)
            </label>
            <div className="flex gap-3">
              <input
                value={img}
                onChange={(e) => setImg(e.target.value)}
                disabled={locked}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder="https://…"
              />
              {previewImg && !locked && (
                <button
                  onClick={() => setPreview((v) => !v)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl border border-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <Image className="w-4 h-4" />
                  {preview ? "Hide" : "Preview"}
                </button>
              )}
            </div>
            {preview && previewImg && (
              <div className="mt-3 flex items-center gap-4 bg-slate-900/60 rounded-xl p-3 border border-slate-700">
                <img
                  src={previewImg}
                  alt="preview"
                  className="w-16 h-16 rounded-xl bg-slate-800"
                />
                <div>
                  <p className="font-bold text-white">{name || "Name"}</p>
                  <p className="text-xs text-slate-400 uppercase">
                    {pos || "Position"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
              Manifesto / Bio (optional)
            </label>
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              disabled={locked}
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50 resize-none text-sm leading-relaxed"
              placeholder="A short statement voters will read on the ballot…"
            />
          </div>
          <button
            onClick={add}
            disabled={locked || saving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? (
              <VBLoader size="sm" />
            ) : (
              <>
                <Plus className="w-5 h-5" /> Add to Ballot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lineup */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Current Lineup — {candidates.length} candidate
          {candidates.length !== 1 ? "s" : ""}
        </p>
        {positions.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-10 border border-dashed border-slate-600 text-center">
            <UserSquare2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white font-black mb-2">No candidates yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Use the form above to add candidates. Group them by position —
              everyone with the same position name will appear together on the
              ballot.
            </p>
          </div>
        ) : (
          positions.map((p) => (
            <div
              key={p}
              className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4"
            >
              <div className="px-5 py-3 border-b border-slate-700 bg-slate-700/30">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  {p}
                </span>
              </div>
              <div className="p-3 space-y-3">
                {candidates
                  .filter((c) => c.position === p)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-900/60 rounded-xl border border-slate-700/50"
                    >
                      <div className="flex items-center gap-4 p-3 group">
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-12 h-12 rounded-xl bg-slate-800 shrink-0 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">
                            {c.name}
                          </p>
                          {locked && (
                            <p className="text-xs text-slate-400">
                              {c.votes} votes
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-3 h-8 rounded-full bg-linear-to-b ${c.color} opacity-60 shrink-0`}
                        />
                        {!locked && (
                          <button
                            onClick={() =>
                              editingId === c.id
                                ? setEditingId(null)
                                : (setEditingId(c.id),
                                  setEditText(c.manifesto || ""))
                            }
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                              editingId === c.id
                                ? "bg-blue-600 text-white border-blue-500"
                                : "text-slate-400 border-slate-600 hover:text-white hover:border-slate-400"
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            {editingId === c.id ? "Done" : "Manifesto"}
                          </button>
                        )}
                        {!locked && (
                          <button
                            onClick={() => remove(c)}
                            disabled={saving}
                            className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {editingId === c.id && (
                        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none leading-relaxed"
                            placeholder="Enter manifesto or bio…"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-slate-600">
                              {editText.length} characters
                            </span>
                            <button
                              onClick={() => saveManifesto(c)}
                              disabled={saving}
                              className="text-xs font-bold px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              {saving ? (
                                <VBLoader size="sm" />
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" /> Save
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {editingId !== c.id && c.manifesto && (
                        <div className="px-4 pb-3 border-t border-slate-700/30 pt-2">
                          <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">
                            {c.manifesto}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ballot preview */}
      {candidates.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Ballot Preview
            </span>
          </div>
          <div className="p-5 space-y-5">
            {positions.map((p) => (
              <div key={p}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px bg-slate-600 flex-1" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {p}
                  </span>
                  <div className="h-px bg-slate-600 flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {candidates
                    .filter((c) => c.position === p)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-700/50 rounded-2xl p-4 border border-slate-600/50"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-10 h-10 rounded-xl bg-slate-800 object-cover shrink-0"
                          />
                          <div>
                            <p className="font-bold text-white text-sm">
                              {c.name}
                            </p>
                            <p className="text-xs text-slate-400 uppercase">
                              {c.position}
                            </p>
                          </div>
                        </div>
                        {c.manifesto ? (
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 border-t border-slate-600/50 pt-2 mt-1">
                            {c.manifesto}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-600 italic border-t border-slate-600/50 pt-2 mt-1">
                            No manifesto
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
