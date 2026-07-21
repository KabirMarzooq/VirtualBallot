import { useState } from "react";
import { Image, Check, Eye, Save, KeyRound, Plus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  updateBranding,
  updateObserverPin,
  updateElectionConfig,
} from "../../api";
import VBLoader from "../ui/VBLoader";
import PaymentSetup from "./PaymentSetup";

/* Selectable option card with an explicit radio tick */
function Choice({ on, disabled, onClick, title, desc }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Locked" : `Select: ${title}`}
      className={`relative text-left rounded-xl border p-4 pr-9 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
        on
          ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600"
          : "bg-white border-slate-300 hover:border-slate-400"
      }`}
    >
      <span
        className={`absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${
          on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300"
        }`}
      >
        {on && <Check className="w-2.5 h-2.5" strokeWidth={3.2} />}
      </span>
      <p
        className={`text-[13px] font-semibold ${
          on ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {title}
      </p>
      <p className="text-[11px] leading-4 text-slate-600 mt-1">{desc}</p>
    </button>
  );
}

function LockChip({ children }) {
  return (
    <span className="text-[10px] font-semibold normal-case tracking-normal bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

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
  const locked = electionConfig.status !== "NOT_STARTED";
  const pinMismatch = !!pinConfirm && pin !== pinConfirm;

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

  const savePaidConfig = async (updates) => {
    setSavingType(true);
    try {
      await updateElectionConfig(updates, accessToken, orgSlug);
      setElectionConfig((prev) => ({ ...prev, ...updates }));
      addLog("Paid voting settings updated", "admin");
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

  // Add a single bundle to the existing array + persist
  const addBundle = (bundle) => {
    const next = [...(electionConfig.voteBundles || []), bundle];
    savePaidConfig({ voteBundles: next });
  };
  // Remove a bundle by index + persist
  const removeBundle = (idx) => {
    const next = (electionConfig.voteBundles || []).filter((_, i) => i !== idx);
    savePaidConfig({ voteBundles: next });
  };

  const inputClass =
    "w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all";
  const cardLabel =
    "text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2 mb-4";

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {/* ════════ LEFT — Election type + cost ════════ */}
      <div className="space-y-4">
        {/* Election type */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className={cardLabel}>
            Election type
            {locked && (
              <LockChip>
                Locked — election already{" "}
                {electionConfig.status === "ACTIVE" ? "running" : "ended"}
              </LockChip>
            )}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Choice
              on={electionConfig.votingMode === "CLOSED"}
              disabled={locked || savingType}
              onClick={() =>
                saveElectionType("CLOSED", electionConfig.fraudTier)
              }
              title="Closed"
              desc="Roster-based. Voters register with matric + email, verified by OTP."
            />
            <Choice
              on={electionConfig.votingMode === "OPEN"}
              disabled={locked || savingType}
              onClick={() =>
                saveElectionType(
                  "OPEN",
                  electionConfig.fraudTier === "DEVICE" ? "DEVICE" : "EMAIL"
                )
              }
              title="Open"
              desc="Public link. Anyone can vote — no roster or registration."
            />
          </div>

          {/* Vote protection — only for OPEN + FREE (paid ignores fraud tier) */}
          {electionConfig.votingMode === "OPEN" &&
            electionConfig.voteType !== "PAID" && (
              <>
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mt-4 mb-2">
                  Vote protection
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Choice
                    on={electionConfig.fraudTier === "DEVICE"}
                    disabled={locked || savingType}
                    onClick={() => saveElectionType("OPEN", "DEVICE")}
                    title="Frictionless"
                    desc="One vote per device. No email needed."
                  />
                  <Choice
                    on={electionConfig.fraudTier === "EMAIL"}
                    disabled={locked || savingType}
                    onClick={() => saveElectionType("OPEN", "EMAIL")}
                    title="Email verified"
                    desc="One vote per email. Stronger integrity."
                  />
                </div>
              </>
            )}
        </div>

        {/* Voting cost */}
        {electionConfig.votingMode === "OPEN" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className={cardLabel}>
              Voting cost {locked && <LockChip>Locked</LockChip>}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Choice
                on={electionConfig.voteType === "STANDARD"}
                disabled={locked || savingType}
                onClick={() => savePaidConfig({ voteType: "STANDARD" })}
                title="Free"
                desc="Standard voting — one vote each, no payment."
              />
              <Choice
                on={electionConfig.voteType === "PAID"}
                disabled={locked || savingType}
                onClick={() => savePaidConfig({ voteType: "PAID" })}
                title="Paid"
                desc="Voters pay per vote — buy 1 or many. Proceeds go to your account."
              />
            </div>

            {electionConfig.voteType === "PAID" && (
              <div className="mt-4 space-y-4">
                {/* Payout account setup */}
                <PaymentSetup />

                {/* Pricing model */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Choice
                    on={electionConfig.pricingModel === "FIXED"}
                    disabled={locked || savingType}
                    onClick={() => savePaidConfig({ pricingModel: "FIXED" })}
                    title="Fixed price"
                    desc="One price per vote. Voter picks quantity."
                  />
                  <Choice
                    on={electionConfig.pricingModel === "BUNDLE"}
                    disabled={locked || savingType}
                    onClick={() => savePaidConfig({ pricingModel: "BUNDLE" })}
                    title="Bundles"
                    desc="Preset packs (e.g. ₦500 = 6 votes)."
                  />
                </div>

                {electionConfig.pricingModel === "FIXED" ? (
                  <FixedPriceEditor
                    disabled={locked || savingType}
                    initialKobo={electionConfig.pricePerVote}
                    onSave={(kobo) => savePaidConfig({ pricePerVote: kobo })}
                  />
                ) : (
                  <BundleEditor
                    disabled={locked || savingType}
                    bundles={electionConfig.voteBundles || []}
                    onAdd={addBundle}
                    onRemove={removeBundle}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════ RIGHT — Identity, PIN, Preview ════════ */}
      <div className="space-y-4">
        {/* Election identity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className={cardLabel}>
            Election identity {locked && <LockChip>Locked</LockChip>}
          </p>

          <div className="mb-4">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Election name
            </label>
            <input
              value={form.electionName}
              disabled={locked}
              onChange={(e) =>
                setForm((f) => ({ ...f, electionName: e.target.value }))
              }
              className={inputClass}
              placeholder={`e.g. ${
                branding.institutionName
                  ? branding.institutionName.split(" ").slice(-1)[0]
                  : "SRC"
              } General Elections ${new Date().getFullYear()}`}
            />
            <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
              Appears on the login page, ballot, and results.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Institution / organisation name
            </label>
            <input
              value={form.institutionName}
              disabled={locked}
              onChange={(e) =>
                setForm((f) => ({ ...f, institutionName: e.target.value }))
              }
              className={inputClass}
              placeholder="e.g. University of Nigeria, Nsukka"
            />
            <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
              Shown as the small eyebrow label above the election name.
            </p>
          </div>

          <div className="mb-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Organisation logo
            </label>
            <div className="flex gap-2 items-center">
              <label
                className={`flex-1 flex items-center gap-2.5 min-h-[44px] px-3.5 text-[13px] border border-dashed rounded-lg transition-all ${
                  locked
                    ? "bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-500 hover:text-slate-800 cursor-pointer"
                }`}
              >
                <Image className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {form.logoUrl ? "Logo uploaded ✓" : "Upload logo image…"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={locked}
                  onChange={handleLogoUpload}
                />
              </label>
              {form.logoUrl && (
                <>
                  <img
                    src={form.logoUrl}
                    alt="logo preview"
                    className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0"
                  />
                  <button
                    onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                    disabled={locked}
                    title="Remove logo"
                    className="w-11 min-h-[44px] rounded-lg border border-slate-300 bg-white text-slate-400 font-semibold hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
            <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
              Square PNG, JPG, or SVG under 500 KB. Replaces the “VB” initials
              on the login page.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={(!dirty && !saved) || saving || locked}
            title={
              locked
                ? "Locked while the election is active"
                : dirty
                ? "Save branding to database"
                : "No unsaved changes"
            }
            className={`inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg font-semibold text-[13px] transition-all cursor-pointer ${
              saved
                ? "bg-green-50 text-green-600 border border-green-200"
                : dirty && !locked
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <VBLoader size="sm" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.6} /> Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save branding
              </>
            )}
          </button>
        </div>

        {/* Observer PIN */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className={cardLabel}>
            <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Observer PIN
          </p>
          <p className="text-xs leading-[18px] text-slate-600 mb-4">
            Scrutineers use this PIN to open the observer dashboard. The
            default at registration is{" "}
            <span className="font-mono font-semibold text-slate-800">0000</span>{" "}
            — change it before the election.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                New PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
                placeholder="e.g. 2026"
                className={`${inputClass} font-mono text-lg text-center tracking-[0.3em]`}
              />
            </div>
            <div>
              <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                Confirm PIN
              </label>
              <input
                type="password"
                value={pinConfirm}
                onChange={(e) =>
                  setPinConfirm(e.target.value.replace(/\D/g, ""))
                }
                maxLength={8}
                placeholder="Repeat PIN"
                className={`${inputClass} font-mono text-lg text-center tracking-[0.3em] ${
                  pinMismatch ? "border-red-500" : ""
                }`}
              />
              {pinMismatch && (
                <p className="text-[11px] leading-4 font-medium text-red-600 mt-1.5">
                  PINs don't match — check both entries.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handlePinSave}
            disabled={pinSaving || !pin || !pinConfirm || pinMismatch}
            title="Change the observer PIN"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 mt-4 rounded-lg font-semibold text-[13px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer"
          >
            {pinSaving ? (
              <VBLoader size="sm" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> Update observer PIN
              </>
            )}
          </button>
        </div>

        {/* Login page preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <h4 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Login page preview
            </h4>
            {dirty && (
              <span className="ml-auto text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          <div
            className="p-8 flex justify-center bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle, #BFDBFE 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="bg-white border border-blue-200 rounded-2xl shadow-md p-7 w-60 text-center">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="logo"
                  className="w-12 h-12 rounded-xl object-cover mx-auto shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-base font-bold text-white tracking-tight">
                    {form.institutionName
                      ? form.institutionName.slice(0, 2).toUpperCase()
                      : "VB"}
                  </span>
                </div>
              )}
              {form.institutionName && (
                <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-[0.1em] mt-3">
                  {form.institutionName}
                </p>
              )}
              <p className="text-base leading-[22px] font-semibold text-slate-900 mt-0.5">
                {form.electionName || "Virtual Ballot"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your vote matters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FixedPriceEditor({ initialKobo, onSave, disabled }) {
  const [naira, setNaira] = useState(initialKobo ? initialKobo / 100 : "");
  const [saved, setSaved] = useState(false);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
        Price per vote (₦)
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          value={naira}
          disabled={disabled}
          onChange={(e) => setNaira(e.target.value)}
          placeholder="e.g. 100"
          className="flex-1 min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
        />
        <button
          disabled={disabled || !naira || Number(naira) < 1}
          onClick={() => {
            onSave(Math.round(Number(naira) * 100));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          title="Save the price per vote"
          className={`min-h-[44px] px-4 rounded-lg font-semibold text-[13px] transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
            saved
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          }`}
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function BundleEditor({ bundles, onAdd, onRemove, disabled }) {
  const [votes, setVotes] = useState("");
  const [naira, setNaira] = useState("");
  const [label, setLabel] = useState("");

  const fmt = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");
  const canSave = !disabled && Number(votes) > 0 && Number(naira) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onAdd({
      votes: Number(votes),
      amount: Math.round(Number(naira) * 100),
      label: label.trim() || "",
    });
    setVotes("");
    setNaira("");
    setLabel("");
  };

  const smallInput =
    "min-h-[36px] text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-3 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
        Vote bundles
      </p>

      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="number"
          placeholder="Votes"
          value={votes}
          disabled={disabled}
          onChange={(e) => setVotes(e.target.value)}
          className={`${smallInput} w-[76px]`}
        />
        <span className="text-[11px] text-slate-600 shrink-0">for ₦</span>
        <input
          type="number"
          placeholder="Amount"
          value={naira}
          disabled={disabled}
          onChange={(e) => setNaira(e.target.value)}
          className={`${smallInput} w-24`}
        />
        <input
          placeholder="Label (optional)"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
          className={`${smallInput} flex-1 min-w-[120px]`}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!canSave}
        title="Add this bundle"
        className="w-full mt-2 min-h-[36px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Add bundle
      </button>

      {bundles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {bundles.map((b, i) => (
            <div
              key={i}
              className="relative bg-white border border-slate-200 rounded-xl p-3 text-center"
            >
              {!disabled && (
                <button
                  onClick={() => onRemove(i)}
                  title="Remove this bundle"
                  className="absolute top-1 right-1 w-[22px] h-[22px] rounded-full text-[11px] font-semibold text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  ✕
                </button>
              )}
              <p className="text-xl leading-6 font-semibold text-slate-900 tabular-nums">
                {b.votes}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
                vote{b.votes !== 1 ? "s" : ""}
              </p>
              <p className="text-[13px] font-semibold text-blue-700 mt-1">
                {fmt(b.amount)}
              </p>
              {b.label && (
                <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                  {b.label}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 text-center py-2 mt-1">
          No bundles yet. Add one above.
        </p>
      )}
    </div>
  );
}
