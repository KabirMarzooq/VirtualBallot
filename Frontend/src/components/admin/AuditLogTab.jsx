import { useState, useEffect, useRef } from "react";
import {
  FileDown,
  Eraser,
  Search,
  ChevronDown,
  ScrollText,
} from "lucide-react";
import { EVENT_META, getMeta } from "../../constants";
import { useApp } from "../../context/AppContext";

export default function AuditLogTab() {
  const { activityLog, setActivityLog, showConfirm } = useApp();
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activityLog, autoScroll]);

  const allTypes = ["all", ...Object.keys(EVENT_META)];
  const counts = activityLog.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  const filtered = activityLog.filter(
    (e) =>
      (filterType === "all" || e.type === filterType) &&
      (e.message.toLowerCase().includes(search.toLowerCase()) ||
        e.timestamp.includes(search))
  );

  const exportCSV = () => {
    const rows = [
      "ID,Type,Message,Timestamp,Date",
      ...activityLog.map(
        (e) =>
          `${e.id},${e.type},"${e.message.replace(/"/g, "'")}",${e.timestamp},${
            e.date
          }`
      ),
    ];
    const a = document.createElement("a");
    a.href =
      "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
    a.download = `vb-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const clear = () =>
    showConfirm(
      "Clear Audit Log",
      "Delete all log entries? This cannot be undone.",
      () => setActivityLog([])
    );

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <p className="text-white font-black text-lg">Audit Log</p>
          <p className="text-xs text-slate-400">
            {activityLog.length} events this session
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={!activityLog.length}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={clear}
            disabled={!activityLog.length}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-40 text-slate-400 text-xs font-bold rounded-xl border border-slate-600 transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Live indicator + auto-scroll toggle */}
      <div className="flex items-center justify-between bg-slate-800 rounded-2xl px-5 py-3 border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-widest">
            Live
          </span>
          <span className="text-xs text-slate-500">
            Events appear automatically
          </span>
        </div>
        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
            autoScroll
              ? "bg-green-900/40 text-green-400 border-green-700/40"
              : "bg-slate-700 text-slate-400 border-slate-600"
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {allTypes.map((t) => {
          const meta = t === "all" ? null : getMeta(t);
          const count = t === "all" ? activityLog.length : counts[t] || 0;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterType === t
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {meta && (
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              )}
              {t === "all" ? "All" : meta.label}
              <span
                className={`font-mono text-[10px] ${
                  filterType === t ? "text-blue-200" : "text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search messages…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-6">Event</span>
          <span className="col-span-2">Time</span>
          <span className="col-span-1">Date</span>
        </div>
        <div className="overflow-y-auto max-h-96 divide-y divide-slate-700/40">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">
                {activityLog.length === 0 ? "No events yet" : "No matches"}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                {activityLog.length === 0
                  ? "Actions will be recorded here."
                  : "Try clearing filters."}
              </p>
            </div>
          ) : (
            filtered.map((e) => {
              const meta = getMeta(e.type);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-5 py-3 items-start hover:bg-slate-700/30"
                >
                  <span className="col-span-1 text-xs font-mono text-slate-600 pt-0.5">
                    {e.id}
                  </span>
                  <span className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${meta.badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                      />
                      {meta.label}
                    </span>
                  </span>
                  <span className="col-span-6 text-sm text-slate-300 leading-snug">
                    {e.message}
                  </span>
                  <span className="col-span-2 text-xs font-mono text-slate-500 pt-0.5">
                    {e.timestamp}
                  </span>
                  <span className="col-span-1 text-[10px] text-slate-600 pt-0.5">
                    {e.date}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="px-5 py-2.5 border-t border-slate-700 flex justify-between items-center text-xs text-slate-600">
          <span>
            Showing {filtered.length} of {activityLog.length}
          </span>
          {(filterType !== "all" || search) && (
            <button
              onClick={() => {
                setFilterType("all");
                setSearch("");
              }}
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
