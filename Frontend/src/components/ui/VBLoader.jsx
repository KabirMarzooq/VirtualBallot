import { Fingerprint } from "lucide-react";

/**
 * VB branded loader — a pulsing fingerprint icon.
 * Used for all async states: login, OTP verify, vote submit, data loads.
 *
 * Usage:
 *   <VBLoader />                  — inline, medium
 *   <VBLoader size="sm" />        — inline inside buttons
 *   <VBLoader size="lg" label="Loading..." /> — page-level with label
 *   <VBLoader overlay />          — full-screen backdrop
 */
export default function VBLoader({ size = "md", label = "", overlay = false }) {
  const sizeClass = { sm: "w-5 h-5", md: "w-10 h-10", lg: "w-16 h-16" }[size] ?? "w-10 h-10";

  const content = (
    <div className="flex flex-col items-center gap-3">
      <Fingerprint
        className={`${sizeClass} text-blue-500`}
        style={{ animation: "vbFp 1.8s ease-in-out infinite" }}
      />
      {label && (
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
      )}
      <style>{`
        @keyframes vbFp {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1);    }
        }
      `}</style>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">VB</span>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
