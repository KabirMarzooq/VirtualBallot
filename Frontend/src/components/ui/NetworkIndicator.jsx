import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function NetworkIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] pointer-events-none">
      {!online ? (
        <div className="flex items-center gap-2 bg-white border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <WifiOff className="w-3.5 h-3.5" />
          No signal — check your connection
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-white border border-green-200 text-green-700 text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <Wifi className="w-3.5 h-3.5" />
          Back online
        </div>
      )}
    </div>
  );
}
