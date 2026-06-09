const STEPS = ["Identity", "Verify", "Vote", "Done"];

export default function ProgressBar({ step }) {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i <= step
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}
            >
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-0.5 mx-1 rounded-full transition-colors ${
                  i < step ? "bg-blue-600/50" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
