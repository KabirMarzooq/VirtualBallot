import { useState, useEffect } from "react";
import {
  Play,
  StopCircle,
  Radio,
  Lock,
  Clock,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { updateElectionConfig, fetchAdminOverview } from "../../api";
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
    label: "Voting & Live Count",
    done: cfg.status === "ENDED",
    active: cfg.status === "ACTIVE",
  },
  {
    label: "Results Published",
    done: cfg.isPublished,
    active: cfg.status === "ENDED" && !cfg.isPublished,
  },
];

export default function ElectionTab() {
  const {
    electionConfig,
    setElectionConfig,
    timeLeft,
    accessToken,
    orgSlug,
    candidates,
    setCandidates,
    users,
    setUsers,
    setActivityLog,
    electionHistory,
    setElectionHistory,
    showAlert,
    showConfirm,
    addLog,
  } = useApp();

  const [durH, setDurH] = useState(() => Number(sessionStorage.getItem("vb_dur_h")) || 0);
  const [durM, setDurM] = useState(() => {
    const saved = sessionStorage.getItem("vb_dur_m");
    return saved !== null ? Number(saved) : 15;
  });
  const [durS, setDurS] = useState(() => Number(sessionStorage.getItem("vb_dur_s")) || 0);
  
  // Persist duration so it survives tab switches
  useEffect(() => {
    sessionStorage.setItem("vb_dur_h", durH);
    sessionStorage.setItem("vb_dur_m", durM);
    sessionStorage.setItem("vb_dur_s", durS);
  }, [durH, durM, durS]);
  const [saving, setSaving] = useState(false);

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
    const ms = durH * 3600000 + durM * 60000 + durS * 1000;
    if (ms <= 0) return showAlert("Setup Error", "Set a valid duration.");
    const endsAt = new Date(Date.now() + ms).toISOString();
    showConfirm(
      "Start Election",
      `Begin a ${durH}h ${durM}m ${durS}s election?`,
      () =>
        patch(
          { status: "ACTIVE", endsAt, registryLocked: true },
          "Election started by admin"
        )
    );
  };

  const end = () =>
    showConfirm("End Early?", "Stop voting now? Cannot be undone.", () =>
      patch({ status: "ENDED" }, "Election ended early by admin", "warning")
    );

  const reset = () =>
    showConfirm(
      "End Election",
      "Mark this election as ended? Results will be preserved. Head to the History tab to create a new election.",
      async () => {
        await patch({ status: "ENDED" }, "Election ended by admin", "system");

        try {
          const overview = await fetchAdminOverview(accessToken, orgSlug);
          setCandidates(
            overview.candidates.map((c) => ({
              id: c.id,
              name: c.name,
              position: c.position,
              image: c.image_url,
              manifesto: c.manifesto || "",
              color: c.color,
              votes: c.vote_count,
            }))
          );
          setUsers(
            overview.voters.map((v) => ({
              id: v.id,
              matric: v.matric,
              name: v.name,
              email: v.email,
              hasVoted: v.has_voted,
              votedAt: v.voted_at,
              role: "STUDENT",
            }))
          );
          setActivityLog(
            overview.auditLog.map((e) => ({
              id: e.id,
              type: e.event_type,
              message: e.message,
              timestamp: new Date(e.created_at).toLocaleTimeString(),
              date: new Date(e.created_at).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
              }),
              iso: e.created_at,
            }))
          );
        } catch (_) {}

        showAlert(
          "Election Ended",
          "Head to the History tab to archive results and start a new election."
        );
      }
    );

  const phases = PHASES(electionConfig);

  return (
    <div className="space-y-6">
      {/* Phase stepper */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
          Election Phase
        </p>
        <div className="flex items-start">
          {phases.map((p, i) => (
            <div key={p.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    p.done
                      ? "bg-blue-600 border-blue-600 text-white"
                      : p.active
                      ? "bg-slate-700 border-blue-500 text-blue-400"
                      : "bg-slate-800 border-slate-600 text-slate-600"
                  }`}
                >
                  {p.done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-bold text-center ${
                    p.active
                      ? "text-blue-400"
                      : p.done
                      ? "text-slate-300"
                      : "text-slate-600"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div
                  className={`h-0.5 w-full max-w-6 -mt-5 ${
                    p.done ? "bg-blue-600" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {electionConfig.status === "NOT_STARTED" && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
              <p className="text-sm font-bold text-slate-300">Set Duration</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Hours", durH, setDurH],
                  ["Mins", durM, setDurM],
                  ["Secs", durS, setDurS],
                ].map(([l, v, s]) => (
                  <div key={l}>
                    <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
                      {l}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={v}
                      onChange={(e) => s(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-center outline-none text-white font-mono text-xl focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={start}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    <Play className="w-5 h-5" /> Start Election
                  </>
                )}
              </button>
            </div>
          )}

          {electionConfig.status === "ACTIVE" && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Time Remaining
              </p>
              <p className="text-5xl font-mono text-blue-400 mb-6 tabular-nums">
                {timeLeft}
              </p>
              <button
                onClick={end}
                disabled={saving}
                className="w-full bg-red-900/60 hover:bg-red-900 text-red-400 hover:text-white font-bold py-3 rounded-xl border border-red-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <StopCircle className="w-5 h-5" /> End Now
              </button>
            </div>
          )}

          {electionConfig.status === "ENDED" && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="font-bold text-white mb-1">Election Concluded</p>
              <button
                onClick={reset}
                disabled={saving}
                className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-600 transition-colors cursor-pointer"
              >
                {saving ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Archive & Restart
                  </>
                )}
              </button>
            </div>
          )}

          {/* Broadcast toggle */}
          <button
            disabled={saving}
            onClick={() =>
              patch(
                { isPublished: !electionConfig.isPublished },
                electionConfig.isPublished
                  ? "Broadcast stopped"
                  : "Results broadcast live",
                "admin"
              )
            }
            className={`w-full px-6 py-4 rounded-2xl font-bold flex justify-between items-center border transition-colors cursor-pointer disabled:opacity-50 ${
              electionConfig.isPublished
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-blue-600 hover:bg-blue-500 text-white border-transparent"
            }`}
          >
            <span className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              {electionConfig.isPublished
                ? "Stop Broadcasting"
                : "Broadcast Live Results"}
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                electionConfig.isPublished
                  ? "bg-amber-400 animate-pulse"
                  : "bg-white/30"
              }`}
            />
          </button>

          {/* Registry lock */}
          <button
            disabled={saving}
            onClick={() =>
              patch(
                { registryLocked: !electionConfig.registryLocked },
                electionConfig.registryLocked
                  ? "Registry unlocked"
                  : "Registry locked",
                "registry"
              )
            }
            className="w-full bg-slate-800 hover:bg-slate-700 font-bold py-4 rounded-xl flex justify-between px-6 items-center border border-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {electionConfig.registryLocked
                ? "Registry Locked"
                : "Registry Open"}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                electionConfig.registryLocked
                  ? "bg-red-900/50 text-red-400"
                  : "bg-green-900/50 text-green-400"
              }`}
            >
              {electionConfig.registryLocked ? "Locked" : "Open"}
            </span>
          </button>

          {/* Countdown toggle */}
          <button
            disabled={saving}
            onClick={() =>
              patch(
                { showCountdown: !electionConfig.showCountdown },
                electionConfig.showCountdown
                  ? "Login countdown hidden"
                  : "Login countdown shown",
                "admin"
              )
            }
            className="w-full bg-slate-800 hover:bg-slate-700 font-bold py-4 rounded-xl flex justify-between px-6 items-center border border-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> Voter Countdown Timer
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                electionConfig.showCountdown
                  ? "bg-blue-900/50 text-blue-400"
                  : "bg-slate-700 text-slate-500"
              }`}
            >
              {electionConfig.showCountdown ? "Visible" : "Hidden"}
            </span>
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 h-fit">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Current Config
          </p>
          {[
            [
              "Status",
              electionConfig.status.replace("_", " "),
              electionConfig.status === "ACTIVE"
                ? "text-green-400"
                : "text-slate-300",
            ],
            [
              "Results",
              electionConfig.isPublished ? "Public" : "Hidden",
              electionConfig.isPublished ? "text-blue-400" : "text-slate-400",
            ],
            [
              "Registration",
              electionConfig.registryLocked ? "Locked" : "Open",
              electionConfig.registryLocked ? "text-red-400" : "text-green-400",
            ],
          ].map(([k, v, c]) => (
            <div
              key={k}
              className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-xs text-slate-500 uppercase font-bold">
                {k}
              </span>
              <span className={`text-sm font-bold uppercase ${c}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
