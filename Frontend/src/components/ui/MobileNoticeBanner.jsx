import { useState, useEffect } from "react";
import { Laptop, X } from "lucide-react";

// Anything narrower than a small laptop counts as "mobile" for this notice.
const MOBILE_QUERY = "(max-width: 767px)";

export default function MobileNoticeBanner({ message }) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/40 text-amber-300 text-xs font-bold px-4 py-3 rounded-2xl mb-4">
      <Laptop className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex-1 leading-relaxed">
        {message ||
          "This screen is built for larger displays — for the best experience, switch to a laptop or desktop."}
      </p>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        className="text-amber-500 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
