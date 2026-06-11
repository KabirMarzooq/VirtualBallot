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
        <div
          className="flex items-center gap-2 bg-red-950/95 border border-red-700/50
          text-red-300 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl
          backdrop-blur-sm animate-pulse"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <WifiOff className="w-3.5 h-3.5" />
          No signal — check your connection
        </div>
      ) : (
        <div
          className="flex items-center gap-2 bg-green-950/95 border border-green-700/50
          text-green-300 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl
          backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <Wifi className="w-3.5 h-3.5" />
          Back online
        </div>
      )}
    </div>
  );
}
