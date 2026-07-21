import { useState, useEffect } from "react";
import {
  Play,
  StopCircle,
  Radio,
  Lock,
  Clock,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { updateElectionConfig } from "../../api";
import VBLoader from "../ui/VBLoader";

const PHASES = (cfg) => [
  {
    label: "Setup",
    done: true,
    active: cfg.status === "NOT_STARTED" && !cfg.registryLocked,
  },
  {
    label: "Registration",
    done: cfg.registryLocked || cfg.status !== "NOT_STARTED",
    active: !cfg.registryLocked && cfg.status === "NOT_STARTED",
  },
  {
    label: "Voting & live count",
    done: cfg.status === "ENDED",
    active: cfg.status === "ACTIVE",
  },
  {
    label: "Results published",
    done: cfg.isPublished,
    active: cfg.status === "ENDED" && !cfg.isPublished,
  },
];

/* Small labelled pill for the config summary */
function Pill({ tone, children }) {
  const tones = {
    green: "bg-green-50 text-green-600 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    gray: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* Toggle switch with a 44px hit area around the 36×20 track */
function Switch({ on, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-11 h-11 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span
        className={`relative w-9 h-5 rounded-full transition-colors ${
          on ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function ElectionTab() {
  const {
    electionConfig,
    setElectionConfig,
    timeLeft,
    accessToken,
    orgSlug,
    showAlert,
    showConfirm,
    addLog,
    rosterApproval,
  } = useApp();

  const [durD, setDurD] = useState(
    () => Number(sessionStorage.getItem("vb_dur_d")) || 0
  );

  const [durH, setDurH] = useState(
    () => Number(sessionStorage.getItem("vb_dur_h")) || 0
  );
  const [durM, setDurM] = useState(() => {
    const saved = sessionStorage.getItem("vb_dur_m");
    return saved !== null ? Number(saved) : 15;
  });
  const [durS, setDurS] = useState(
    () => Number(sessionStorage.getItem("vb_dur_s")) || 0
  );

  // Persist duration so it survives tab switches
  useEffect(() => {
    sessionStorage.setItem("vb_dur_d", durD);
    sessionStorage.setItem("vb_dur_h", durH);
    sessionStorage.setItem("vb_dur_m", durM);
    sessionStorage.setItem("vb_dur_s", durS);
  }, [durD, durH, durM, durS]);
  const [saving, setSaving] = useState(false);
  const [copiedOpen, setCopiedOpen] = useState(false);
  const [copiedObs, setCopiedObs] = useState(false);

  const patch = async (changes, logMsg, logType = "system") => {
    setSaving(true);
    try {
      await updateElectionConfig(changes, accessToken, orgSlug);
      setElectionConfig((prev) => ({ ...prev, ...changes }));
      addLog(logMsg, logType);
    } catch (err) {
      showAlert("Update Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const start = () => {
    const ms = durD * 86400000 + durH * 3600000 + durM * 60000 + durS * 1000;
    if (ms <= 0) return showAlert("Setup Error", "Set a valid duration.");
    const endsAt = new Date(Date.now() + ms).toISOString();
    showConfirm(
      "Start Election",
      `Begin a ${
        durD > 0 ? durD + "d " : ""
      }${durH}h ${durM}m ${durS}s election?`,
      () =>
        patch(
          { status: "ACTIVE", endsAt, registryLocked: true },
          "Election started by admin"
        )
    );
  };

  const end = () =>
    showConfirm(
      "End Early?",
      "Stop voting now? Cannot be undone.",
      () =>
        patch({ status: "ENDED" }, "Election ended early by admin", "warning"),
      "danger"
    );

  const phases = PHASES(electionConfig);
  const isOpen = electionConfig.votingMode === "OPEN";
  const rosterBlocked =
    electionConfig.votingMode === "CLOSED" &&
    rosterApproval.status !== "APPROVED";
  const openUrl = `${window.location.origin}/${
    electionConfig.voteType === "PAID" ? "paid" : "open"
  }/${orgSlug}`;
  const obsUrl = `${window.location.origin}/observer/login?slug=${orgSlug}`;

  const copy = (url, setter) => {
    navigator.clipboard.writeText(url).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Open-election share links ──────────────────────────────────── */}
      {isOpen && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap bg-white border border-blue-200 rounded-xl p-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-[0.1em] mb-1">
                Public voting link · open election
              </p>
              <p className="text-xs font-mono text-slate-800 truncate">
                {openUrl}
              </p>
            </div>
            <button
              onClick={() => copy(openUrl, setCopiedOpen)}
              title="Copy the public voting link"
              className={`text-xs font-semibold min-h-[36px] px-3.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                copiedOpen
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copiedOpen ? "✓ Copied" : "Copy link"}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-1">
                Observer link · live monitoring
              </p>
              <p className="text-xs font-mono text-slate-800 truncate">
                {obsUrl}
              </p>
            </div>
            <button
              onClick={() => copy(obsUrl, setCopiedObs)}
              title="Copy the observer link"
              className={`text-xs font-semibold min-h-[36px] px-3.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                copiedObs
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-white text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-800"
              }`}
            >
              {copiedObs ? "✓ Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {/* ── Phase stepper ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-4">
          Election phase
        </p>
        <div className="flex items-start">
          {phases.map((p, i) => (
            <div key={p.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                    p.done
                      ? "bg-blue-600 border-blue-600 text-white"
                      : p.active
                      ? "bg-white border-blue-600 text-blue-700"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {p.done ? <Check className="w-4 h-4" strokeWidth={2.4} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold text-center ${
                    p.active
                      ? "text-blue-700"
                      : p.done
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div
                  className={`h-0.5 w-full max-w-12 mt-[15px] -translate-y-1/2 ${
                    p.done ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-4 items-start">
        {/* ── Left column: state card + settings ───────────────────────── */}
        <div className="space-y-3">
          {electionConfig.status === "NOT_STARTED" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-4">
                Set duration
              </p>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  ["Days", durD, setDurD],
                  ["Hours", durH, setDurH],
                  ["Mins", durM, setDurM],
                  ["Secs", durS, setDurS],
                ].map(([l, v, s]) => (
                  <div key={l}>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">
                      {l}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={v}
                      onChange={(e) => s(Number(e.target.value))}
                      className="w-full min-h-[48px] bg-white border border-slate-300 rounded-lg text-center font-mono text-xl font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                    />
                  </div>
                ))}
              </div>

              {rosterBlocked && (
                <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] leading-5 font-semibold text-amber-800">
                      Voter roster not yet approved
                    </p>
                    <p className="text-[11px] leading-4 text-amber-800/85 mt-0.5">
                      {rosterApproval.status === "IDLE"
                        ? "Add committee members to the roster review panel in the Voters tab. All reviewers must approve the voter list before voting can begin."
                        : `${rosterApproval.approvedCount} of ${rosterApproval.totalCount} committee reviewers have approved. Starting unlocks when all reviewers sign off — check progress in the Voters tab.`}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={start}
                disabled={saving || rosterBlocked}
                title="Start the election with this duration"
                className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {saving ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Start election
                  </>
                )}
              </button>
            </div>
          )}

          {electionConfig.status === "ACTIVE" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-center pt-2 pb-4">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                  Time remaining
                </p>
                <p className="font-mono text-[44px] leading-[52px] font-semibold text-blue-700 tabular-nums mt-2">
                  {timeLeft}
                </p>
              </div>
              <button
                onClick={end}
                disabled={saving}
                title="End the election immediately — cannot be undone"
                className="w-full min-h-[48px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 disabled:opacity-50 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <StopCircle className="w-4 h-4" /> End election now
              </button>
            </div>
          )}

          {electionConfig.status === "ENDED" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 border-[1.5px] border-green-200 text-green-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" strokeWidth={2.4} />
              </div>
              <p className="text-base font-semibold text-slate-900">
                Election concluded
              </p>
              <p className="text-[13px] leading-5 text-slate-600 mt-1">
                Results are saved. Use “New election” in the top bar to start a
                fresh one.
              </p>
            </div>
          )}

          {/* Broadcast toggle */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                {electionConfig.status === "ENDED"
                  ? "Broadcast final results"
                  : "Broadcast live results"}
                {electionConfig.isPublished && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    Live
                  </span>
                )}
              </p>
              <p className="text-[11px] leading-4 text-slate-600 mt-0.5">
                {electionConfig.status === "ENDED"
                  ? "The results page shows the final tally publicly"
                  : "Voters and the public can watch the tally in real time"}
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold shrink-0 ${
                electionConfig.isPublished ? "text-blue-700" : "text-slate-600"
              }`}
            >
              {electionConfig.isPublished ? "On" : "Off"}
            </span>
            <Switch
              on={electionConfig.isPublished}
              disabled={saving}
              title={
                electionConfig.isPublished
                  ? "Stop broadcasting results"
                  : "Broadcast results publicly"
              }
              onClick={() =>
                patch(
                  { isPublished: !electionConfig.isPublished },
                  electionConfig.isPublished
                    ? "Broadcast stopped"
                    : "Results broadcast live",
                  "admin"
                )
              }
            />
          </div>

          {/* Registry lock toggle */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900">
                Registry lock
              </p>
              <p className="text-[11px] leading-4 text-slate-600 mt-0.5">
                {electionConfig.status === "ACTIVE" &&
                electionConfig.registryLocked
                  ? "Locked automatically when the election started"
                  : "Stops new voter account activations"}
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold shrink-0 ${
                electionConfig.registryLocked
                  ? "text-blue-700"
                  : "text-slate-600"
              }`}
            >
              {electionConfig.registryLocked ? "Locked" : "Open"}
            </span>
            <Switch
              on={electionConfig.registryLocked}
              disabled={saving}
              title={
                electionConfig.registryLocked
                  ? "Unlock the voter registry"
                  : "Lock the voter registry"
              }
              onClick={() =>
                patch(
                  { registryLocked: !electionConfig.registryLocked },
                  electionConfig.registryLocked
                    ? "Registry unlocked"
                    : "Registry locked",
                  "registry"
                )
              }
            />
          </div>

          {/* Countdown visibility toggle */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900">
                Voter countdown timer
              </p>
              <p className="text-[11px] leading-4 text-slate-600 mt-0.5">
                Show time remaining on the voter login page
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold shrink-0 ${
                electionConfig.showCountdown ? "text-blue-700" : "text-slate-600"
              }`}
            >
              {electionConfig.showCountdown ? "Visible" : "Hidden"}
            </span>
            <Switch
              on={electionConfig.showCountdown}
              disabled={saving}
              title={
                electionConfig.showCountdown
                  ? "Hide the login countdown"
                  : "Show the login countdown"
              }
              onClick={() =>
                patch(
                  { showCountdown: !electionConfig.showCountdown },
                  electionConfig.showCountdown
                    ? "Login countdown hidden"
                    : "Login countdown shown",
                  "admin"
                )
              }
            />
          </div>
        </div>

        {/* ── Right column: current config ──────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">
            Current config
          </p>
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
              Status
            </span>
            {electionConfig.status === "ACTIVE" ? (
              <Pill tone="green">Active</Pill>
            ) : electionConfig.status === "ENDED" ? (
              <Pill tone="gray">Ended</Pill>
            ) : (
              <Pill tone="amber">Not started</Pill>
            )}
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
              Results
            </span>
            {electionConfig.isPublished ? (
              <Pill tone="blue">Public</Pill>
            ) : (
              <Pill tone="gray">Hidden</Pill>
            )}
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
              Registration
            </span>
            {electionConfig.registryLocked ? (
              <Pill tone="amber">Locked</Pill>
            ) : (
              <Pill tone="green">Open</Pill>
            )}
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
              Mode
            </span>
            {isOpen ? (
              <Pill tone="blue">Open · link voting</Pill>
            ) : (
              <Pill tone="gray">Closed roster</Pill>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
