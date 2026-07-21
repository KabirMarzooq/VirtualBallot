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
      () => setActivityLog([]),
      "danger"
    );

  return (
    <div className="space-y-4">
      {/* Live indicator + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-900">
            Live
          </span>
          <span className="text-[11px] text-slate-600">
            · events appear automatically · {activityLog.length} this session
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title={
              autoScroll
                ? "Stop following new events"
                : "Follow new events as they arrive"
            }
            className={`inline-flex items-center gap-2 text-xs font-semibold min-h-[36px] px-3 rounded-lg border transition-all cursor-pointer ${
              autoScroll
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
          </button>
          <button
            onClick={exportCSV}
            disabled={!activityLog.length}
            title="Download the full log as CSV"
            className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={clear}
            disabled={!activityLog.length}
            title="Delete every log entry"
            className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-none disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {allTypes.map((t) => {
          const meta = t === "all" ? null : getMeta(t);
          const count = t === "all" ? activityLog.length : counts[t] || 0;
          const on = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              title={`Show ${t === "all" ? "all events" : `${meta.label} events`}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold min-h-[32px] px-3 rounded-full border transition-all cursor-pointer ${
                on
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              {meta && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    on ? "bg-white" : meta.dot
                  }`}
                />
              )}
              {t === "all" ? "All" : meta.label}
              <span
                className={`font-mono text-[10px] ${
                  on ? "text-blue-100" : "text-slate-400"
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search messages or times…"
          className="w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg pl-10 pr-4 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-6">Event</span>
          <span className="col-span-2">Time</span>
          <span className="col-span-1">Date</span>
        </div>
        <div className="overflow-y-auto max-h-96">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ScrollText className="w-6 h-6" />
              </div>
              <p className="text-[15px] font-semibold text-slate-900">
                {activityLog.length === 0 ? "No events yet" : "No matches"}
              </p>
              <p className="text-xs leading-[18px] text-slate-600 mt-1">
                {activityLog.length === 0
                  ? "Every admin action, vote, and system event is recorded here with a timestamp."
                  : "Try clearing the type filter or search."}
              </p>
            </div>
          ) : (
            filtered.map((e) => {
              const meta = getMeta(e.type);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-5 py-2.5 items-start border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <span className="col-span-1 font-mono text-[11px] text-slate-400 pt-0.5">
                    {e.id}
                  </span>
                  <span className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${meta.lightBadge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </span>
                  <span className="col-span-6 text-[13px] leading-5 text-slate-800">
                    {e.message}
                  </span>
                  <span className="col-span-2 font-mono text-[11px] text-slate-600 pt-0.5">
                    {e.timestamp}
                  </span>
                  <span className="col-span-1 text-[11px] text-slate-400 pt-0.5">
                    {e.date}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="px-5 py-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
          <span>
            Showing {filtered.length} of {activityLog.length}
          </span>
          {(filterType !== "all" || search) && (
            <button
              onClick={() => {
                setFilterType("all");
                setSearch("");
              }}
              title="Reset the type filter and search"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
