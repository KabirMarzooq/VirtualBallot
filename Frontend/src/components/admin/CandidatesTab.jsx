import { useState } from "react";
import {
  Plus,
  Eye,
  Lock,
  Image,
  Check,
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
    showConfirm,
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
        accessToken,
        orgSlug
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

  // Destructive — always confirmed before it runs.
  const remove = (c) => {
    showConfirm(
      "Remove candidate?",
      `Remove ${c.name} from the ${c.position} ballot? This cannot be undone.`,
      async () => {
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
      }
    );
  };

  const saveManifesto = async (c) => {
    setSaving(true);
    try {
      await updateCandidate(
        c.id,
        { manifesto: editText.trim() },
        accessToken,
        orgSlug
      );
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

  const inputClass =
    "w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all";

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
      {/* ── Add form ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-4">
          Add candidate
        </p>

        {locked && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-4">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs leading-4 font-medium text-amber-800">
              Election is live — the candidate list is locked until it ends.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
            Full name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            className={inputClass}
            placeholder="e.g. Jane Okafor"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
            Position
          </label>
          <input
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            disabled={locked}
            list="pos-list"
            className={inputClass}
            placeholder="e.g. President"
          />
          <datalist id="pos-list">
            {positions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
            Everyone with the same position name appears together on the
            ballot.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
            Photo (optional)
          </label>
          <div className="flex gap-2">
            <label
              className={`flex-1 flex items-center gap-2.5 min-h-[44px] px-3.5 text-[13px] border border-dashed rounded-lg transition-all ${
                locked
                  ? "bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-500 hover:text-slate-800 cursor-pointer"
              }`}
            >
              <Image className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">
                {img && img.startsWith("data:")
                  ? "Photo uploaded ✓"
                  : "Upload photo…"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={locked}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 200_000) {
                    showAlert(
                      "Image Too Large",
                      "Please use an image under 200 KB for candidates."
                    );
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImg(ev.target.result);
                    setPreview(true);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {img && !locked && (
              <button
                onClick={() => {
                  setImg("");
                  setPreview(false);
                }}
                title="Remove photo"
                className="w-11 min-h-[44px] rounded-lg border border-slate-300 bg-white text-slate-400 font-semibold hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer shrink-0"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-slate-400 shrink-0">
              or paste URL:
            </span>
            <input
              value={img && !img.startsWith("data:") ? img : ""}
              onChange={(e) => {
                setImg(e.target.value);
                setPreview(!!e.target.value);
              }}
              disabled={locked}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 min-h-[36px] text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-3 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
            />
          </div>
          <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
            Under 200 KB. Square images look best.
          </p>
          {preview && img && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
              <img
                src={img}
                alt="preview"
                className="w-12 h-12 rounded-xl bg-slate-200 object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">
                  {name || "Name"}
                </p>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-[0.08em] mt-0.5">
                  {pos || "Position"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
            Manifesto / bio (optional)
          </label>
          <textarea
            value={manifesto}
            onChange={(e) => setManifesto(e.target.value)}
            disabled={locked}
            rows={3}
            className={`${inputClass} resize-none leading-5`}
            placeholder="A short statement voters will read on the ballot…"
          />
        </div>

        <button
          onClick={add}
          disabled={locked || saving}
          title="Add this candidate to the ballot"
          className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {saving ? (
            <VBLoader size="sm" />
          ) : (
            <>
              <Plus className="w-4 h-4" strokeWidth={2.4} /> Add to ballot
            </>
          )}
        </button>
      </div>

      {/* ── Lineup + preview ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h4 className="text-[13px] font-semibold text-slate-900">
              Current lineup
            </h4>
            <span className="text-[11px] text-slate-400">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
              {positions.length > 0 &&
                ` · ${positions.length} position${
                  positions.length !== 1 ? "s" : ""
                }`}
              {locked && " · live vote counts"}
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="border-t-0 p-10 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <UserSquare2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-900">
                No candidates yet
              </h4>
              <p className="text-[13px] leading-5 text-slate-600 mt-1 max-w-xs mx-auto">
                Use the form to add candidates. Group them by position —
                everyone with the same position name appears together on the
                ballot.
              </p>
            </div>
          ) : (
            positions.map((p) => {
              const pcs = candidates.filter((c) => c.position === p);
              const posVotes = pcs.reduce((s, c) => s + (c.votes ?? 0), 0);
              return (
                <div key={p} className="border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                      {p}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {locked
                        ? `${posVotes} vote${posVotes !== 1 ? "s" : ""} so far`
                        : `${pcs.length} candidate${
                            pcs.length !== 1 ? "s" : ""
                          }`}
                    </span>
                  </div>
                  {pcs.map((c) => (
                    <div
                      key={c.id}
                      className="px-4 py-3 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-10 h-10 rounded-lg bg-slate-200 object-cover shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-900 truncate">
                          {c.name}
                        </span>
                        {locked ? (
                          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                            {c.votes} vote{c.votes !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                editingId === c.id
                                  ? setEditingId(null)
                                  : (setEditingId(c.id),
                                    setEditText(c.manifesto || ""))
                              }
                              title={
                                editingId === c.id
                                  ? "Close the manifesto editor"
                                  : `Edit ${c.name}'s manifesto`
                              }
                              className={`text-xs font-semibold min-h-[32px] px-3 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                editingId === c.id
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800"
                              }`}
                            >
                              {editingId === c.id ? "Done" : "Manifesto"}
                            </button>
                            <button
                              onClick={() => remove(c)}
                              disabled={saving}
                              title={`Remove ${c.name} from the ballot`}
                              className="text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                            >
                              ✕ Remove
                            </button>
                          </>
                        )}
                      </div>

                      {editingId === c.id ? (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full text-[13px] leading-5 text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 resize-none transition-all"
                            placeholder="Enter manifesto or bio…"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[11px] text-slate-400">
                              {editText.length} characters
                            </span>
                            <button
                              onClick={() => saveManifesto(c)}
                              disabled={saving}
                              title="Save this manifesto"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[32px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            >
                              {saving ? (
                                <VBLoader size="sm" />
                              ) : (
                                <>
                                  <Check className="w-3 h-3" strokeWidth={2.6} />{" "}
                                  Save manifesto
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        !locked &&
                        (c.manifesto ? (
                          <p className="text-[11px] leading-4 text-slate-600 mt-2 pt-2 border-t border-slate-100 line-clamp-2">
                            {c.manifesto}
                          </p>
                        ) : (
                          <p className="text-[11px] leading-4 text-slate-400 italic mt-2 pt-2 border-t border-slate-100">
                            No manifesto yet
                          </p>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Ballot preview */}
        {candidates.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h4 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Ballot preview
              </h4>
              <span className="text-[11px] text-slate-400">
                What voters see
              </span>
            </div>
            <div className="p-4 space-y-4">
              {positions.map((p) => (
                <div key={p}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                      {p}
                    </span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {candidates
                      .filter((c) => c.position === p)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={c.image}
                              alt={c.name}
                              className="w-10 h-10 rounded-lg bg-slate-200 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 truncate">
                                {c.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] mt-0.5">
                                {c.position}
                              </p>
                            </div>
                          </div>
                          {c.manifesto ? (
                            <p className="text-[11px] leading-4 text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 line-clamp-2">
                              {c.manifesto}
                            </p>
                          ) : (
                            <p className="text-[11px] leading-4 text-slate-400 italic mt-2.5 pt-2.5 border-t border-slate-100">
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
    </div>
  );
}
