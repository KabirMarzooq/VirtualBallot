const STEPS = ["Identity", "Verify", "Vote", "Done"];

export default function ProgressBar({ step }) {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i <= step
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-1 mx-2 rounded-full ${
                  i < step ? "bg-blue-200" : "bg-slate-100"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
