/**
 * VB branded loader — three staggered ballot-mark dots that sequence like
 * votes being counted. Used for async actions: login, OTP verify, vote submit.
 *
 * Usage:
 *   <VBLoader />                  — inline, small
 *   <VBLoader size="lg" />        — centred overlay-style
 *   <VBLoader label="Casting…" /> — with descriptive text
 */
export default function VBLoader({ size = "md", label = "", overlay = false }) {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };
  const dot = dotSizes[size] ?? dotSizes.md;

  const content = (
    <div className="flex flex-col items-center gap-3">
      {/* Three ballot-check dots that sequence in */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${dot} rounded-full bg-blue-600`}
            style={{
              animation: "vbPulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      {label && (
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          {label}
        </p>
      )}
      <style>{`
          @keyframes vbPulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
            40%            { transform: scale(1);   opacity: 1;   }
          }
        `}</style>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4">
          {/* VB logo mark */}
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-1">
            <span className="text-white font-black text-lg">VB</span>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
