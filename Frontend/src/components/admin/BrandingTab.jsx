import { useState } from "react";
import { Palette, Image, CheckCircle, Eye, X, Key, Vote } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  updateBranding,
  updateObserverPin,
  updateElectionConfig,
} from "../../api";
import VBLoader from "../ui/VBLoader";

export default function BrandingTab() {
  const {
    branding,
    setBranding,
    accessToken,
    orgSlug,
    showAlert,
    addLog,
    electionConfig,
    setElectionConfig,
  } = useApp();
  const [form, setForm] = useState({ ...branding });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(branding);

  const saveElectionType = async (votingMode, fraudTier) => {
    setSavingType(true);
    try {
      await updateElectionConfig(
        { votingMode, fraudTier: votingMode === "OPEN" ? fraudTier : "EMAIL" },
        accessToken,
        orgSlug
      );
      setElectionConfig((prev) => ({
        ...prev,
        votingMode,
        fraudTier: votingMode === "OPEN" ? fraudTier : "EMAIL",
      }));
      addLog(`Election type set to ${votingMode}`, "admin");
    } catch (err) {
      showAlert("Failed", err.message);
    } finally {
      setSavingType(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranding(
        {
          electionName: form.electionName,
          institutionName: form.institutionName,
          logoUrl: form.logoUrl || null,
        },
        accessToken,
        orgSlug
      );
      setBranding(form);
      addLog(`Branding updated — "${form.electionName || "unnamed"}"`, "admin");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showAlert("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500_000) {
      showAlert("Image Too Large", "Please use an image under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      setForm((f) => ({ ...f, logoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handlePinSave = async () => {
    if (pin.length < 4)
      return showAlert(
        "PIN Too Short",
        "Observer PIN must be at least 4 characters."
      );
    if (pin !== pinConfirm)
      return showAlert("PIN Mismatch", "The two PIN entries don't match.");
    setPinSaving(true);
    try {
      await updateObserverPin(pin, accessToken, orgSlug);
      addLog("Observer PIN updated by admin", "admin");
      setPin("");
      setPinConfirm("");
      showAlert(
        "PIN Updated",
        "Observer PIN has been changed. Share it with your scrutineers."
      );
    } catch (err) {
      showAlert("Failed", err.message);
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Election Type ──────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-blue-400" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Election Type
          </p>
          {electionConfig.status !== "NOT_STARTED" && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-700/40">
              Locked — election already{" "}
              {electionConfig.status === "ACTIVE" ? "running" : "ended"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={electionConfig.status !== "NOT_STARTED" || savingType}
            onClick={() => saveElectionType("CLOSED", electionConfig.fraudTier)}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              electionConfig.votingMode === "CLOSED"
                ? "bg-blue-950/40 border-blue-500"
                : "bg-slate-900 border-slate-700 hover:border-slate-600"
            }`}
          >
            <p className="font-black text-white text-sm">Closed</p>
            <p className="text-xs text-slate-400 mt-1">
              Roster-based. Voters register with matric + email, verified by
              OTP.
            </p>
          </button>
          <button
            disabled={electionConfig.status !== "NOT_STARTED" || savingType}
            onClick={() =>
              saveElectionType(
                "OPEN",
                electionConfig.fraudTier === "DEVICE" ? "DEVICE" : "EMAIL"
              )
            }
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              electionConfig.votingMode === "OPEN"
                ? "bg-blue-950/40 border-blue-500"
                : "bg-slate-900 border-slate-700 hover:border-slate-600"
            }`}
          >
            <p className="font-black text-white text-sm">Open</p>
            <p className="text-xs text-slate-400 mt-1">
              Public link. Anyone can vote — no roster or registration.
            </p>
          </button>
        </div>

        {electionConfig.votingMode === "OPEN" && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Vote Protection
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={electionConfig.status !== "NOT_STARTED" || savingType}
                onClick={() => saveElectionType("OPEN", "DEVICE")}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer disabled:opacity-50 ${
                  electionConfig.fraudTier === "DEVICE"
                    ? "bg-teal-950/40 border-teal-500"
                    : "bg-slate-900 border-slate-700 hover:border-slate-600"
                }`}
              >
                <p className="font-bold text-white text-sm">Frictionless</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  One vote per device. No email needed.
                </p>
              </button>
              <button
                disabled={electionConfig.status !== "NOT_STARTED" || savingType}
                onClick={() => saveElectionType("OPEN", "EMAIL")}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer disabled:opacity-50 ${
                  electionConfig.fraudTier === "EMAIL"
                    ? "bg-teal-950/40 border-teal-500"
                    : "bg-slate-900 border-slate-700 hover:border-slate-600"
                }`}
              >
                <p className="font-bold text-white text-sm">Email verified</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  One vote per email. Stronger integrity.
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ── Election Identity ──────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Election Identity
        </p>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Election Name
          </label>
          <input
            value={form.electionName}
            onChange={(e) =>
              setForm((f) => ({ ...f, electionName: e.target.value }))
            }
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
            placeholder={`e.g. ${
              branding.institutionName
                ? branding.institutionName.split(" ").slice(-1)[0]
                : "SRC"
            } General Elections ${new Date().getFullYear()}`}
          />
          <p className="text-xs text-slate-600 mt-1">
            Appears on the login page, ballot, and results.
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Institution / Organisation Name
          </label>
          <input
            value={form.institutionName}
            onChange={(e) =>
              setForm((f) => ({ ...f, institutionName: e.target.value }))
            }
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
            placeholder="e.g. University of Nigeria, Nsukka"
          />
          <p className="text-xs text-slate-600 mt-1">
            Shown as a small eyebrow label above the election name.
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Organization Logo
          </label>
          <div className="flex gap-3 items-center">
            <label className="flex-1 flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 hover:border-blue-500 transition-colors cursor-pointer">
              <Image className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-400 truncate">
                {form.logoUrl
                  ? "Logo uploaded ✓"
                  : "Click to upload logo image (max 500 KB)…"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>

            {form.logoUrl && (
              <>
                <div className="w-14 h-14 rounded-xl border-2 border-slate-600 overflow-hidden shrink-0 bg-slate-900">
                  <img
                    src={form.logoUrl}
                    alt="logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                  title="Remove logo"
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Upload a square image (PNG, JPG, or SVG). Replaces the "VB" initials
            on the login page.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={(!dirty && !saved) || saving}
          title={dirty ? "Save branding to database" : "No unsaved changes"}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            saved
              ? "bg-green-600 text-white"
              : dirty
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <VBLoader size="sm" />
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Palette className="w-4 h-4" /> Save Branding
            </>
          )}
        </button>
      </div>

      {/* ── Observer PIN ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-teal-400" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Observer PIN
          </p>
        </div>
        <p className="text-sm text-slate-400">
          The PIN your accredited observers use to access the Observer
          Dashboard. The default at registration is{" "}
          <span className="font-mono font-bold text-slate-300">0000</span> —
          change it before the election.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
              New PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              placeholder="e.g. 2025"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-widest outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
              Confirm PIN
            </label>
            <input
              type="password"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              placeholder="Repeat PIN"
              className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-widest outline-none transition-colors ${
                pinConfirm && pin !== pinConfirm
                  ? "border-red-500"
                  : "border-slate-600 focus:border-teal-500"
              }`}
            />
          </div>
        </div>
        <button
          onClick={handlePinSave}
          disabled={pinSaving || !pin || !pinConfirm}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-teal-700 hover:bg-teal-600 text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          {pinSaving ? (
            <VBLoader size="sm" />
          ) : (
            <>
              <Key className="w-4 h-4" /> Update Observer PIN
            </>
          )}
        </button>
      </div>

      {/* ── Live Preview ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Login Page Preview
          </span>
          {dirty && (
            <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-900/30 rounded-full border border-amber-700/40">
              Unsaved
            </span>
          )}
        </div>
        <div className="p-8 flex justify-center bg-slate-950/50">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-64 text-center shadow-2xl">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="logo"
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-md border-4 border-slate-800"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-2xl font-black text-white">
                  {form.institutionName
                    ? form.institutionName.slice(0, 2).toUpperCase()
                    : "VB"}
                </span>
              </div>
            )}
            {form.institutionName && (
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">
                {form.institutionName}
              </p>
            )}
            <p className="font-black text-white text-lg leading-tight">
              {form.electionName || "Virtual Ballot"}
            </p>
            <p className="text-slate-500 text-xs mt-1">Your voice matters.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
