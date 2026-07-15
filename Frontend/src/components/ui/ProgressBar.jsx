const STEPS = ["Identity", "Verify", "Vote", "Done"];

/**
 * 4-step voter journey indicator (Identity → Verify → Vote → Done).
 * `step` is the current 0-indexed step: earlier steps render as done (✓),
 * the current one as an outlined blue bubble, later ones muted.
 */
export default function ProgressBar({ step }) {
  return (
    <div className="flex justify-center mb-7">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div key={s} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-all ${
                  done
                    ? "bg-blue-600 border-blue-600 text-white"
                    : current
                    ? "bg-white border-blue-600 text-blue-600"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold ml-1.5 mr-2 ${
                  done || current ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`w-5 h-0.5 mr-2 rounded-full transition-colors ${
                    done ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
