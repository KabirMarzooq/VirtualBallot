import { Clock } from "lucide-react";
import { useCountdownTick } from "../../hooks";
import { formatCountdown } from "../../utils";

function Block({ label, value }) {
  return (
    <div className="flex flex-col items-center min-w-13">
      <span className="text-4xl font-black font-mono tabular-nums leading-none text-slate-800">
        {value}
      </span>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
        {label}
      </span>
    </div>
  );
}

export default function CountdownWidget({ electionConfig }) {
  const tick = useCountdownTick();

  if (!electionConfig.showCountdown) return null;

  // The app's canonical field is endsAt; endTime kept as a legacy fallback.
  const { status } = electionConfig;
  const endTime = electionConfig.endsAt || electionConfig.endTime;

  // NOT_STARTED: placeholder dashes
  if (status === "NOT_STARTED") {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] mb-4 flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" /> Waiting for election to open
        </p>
        <div className="flex items-center justify-center gap-3">
          <Block label="hours" value="--" />
          <Colon tick={tick} />
          <Block label="mins" value="--" />
          <Colon tick={tick} />
          <Block label="secs" value="--" />
        </div>
        <p className="text-xs text-amber-400 mt-4">
          The electoral commission will open voting shortly.
        </p>
      </div>
    );
  }

  // ACTIVE: live countdown
  if (status === "ACTIVE" && endTime) {
    const secsLeft = Math.max(
      0,
      Math.floor((new Date(endTime) - Date.now()) / 1000)
    );
    const { h, m, s } = formatCountdown(secsLeft * 1000);
    const urgent = secsLeft < 300;
    const warning = secsLeft < 1800;
    const bg = urgent
      ? "bg-red-50 border-red-200"
      : warning
      ? "bg-amber-50 border-amber-100"
      : "bg-blue-50 border-blue-100";
    const label = urgent
      ? "text-red-500"
      : warning
      ? "text-amber-500"
      : "text-blue-500";
    const msg = urgent
      ? "Voting closes soon — hurry!"
      : warning
      ? "Time is running out — vote now."
      : "Voting is open — log in below.";
    const title = urgent
      ? "Closing soon!"
      : warning
      ? "Time running out"
      : "Voting is open";

    return (
      <div className={`mb-6 ${bg} border rounded-2xl p-5 text-center`}>
        <p
          className={`text-[10px] font-black ${label} uppercase tracking-[0.15em] mb-4 flex items-center justify-center gap-1.5`}
        >
          <Clock className="w-3 h-3" /> {title}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Block label="hours" value={h} />
          <Colon tick={tick} />
          <Block label="mins" value={m} />
          <Colon tick={tick} />
          <Block label="secs" value={s} />
        </div>
        <p className={`text-xs ${label} mt-4`}>{msg}</p>
      </div>
    );
  }

  return null;
}

function Colon({ tick }) {
  return (
    <span
      className={`text-3xl font-black text-slate-300 leading-none pb-4 select-none transition-opacity duration-200 ${
        tick % 2 === 0 ? "opacity-100" : "opacity-20"
      }`}
    >
      :
    </span>
  );
}
