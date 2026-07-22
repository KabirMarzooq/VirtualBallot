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
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-4 font-medium px-4 py-3 rounded-xl mb-4">
      <Laptop className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex-1">
        {message ||
          "This screen is built for larger displays — for the best experience, switch to a laptop or desktop."}
      </p>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        className="text-amber-600 hover:text-amber-800 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
