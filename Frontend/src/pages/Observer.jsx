import { useState } from "react";
import { Telescope, LogOut, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PageShell from "../components/layout/PageShell";
import { OBSERVER_TABS } from "../components/observer/ObserverTabs";
import { getTurnout } from "../utils";

export default function ObserverPage() {
  const { electionConfig, candidates, users, timeLeft, branding } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tally");

  const { total, voted, pct } = getTurnout(users);

  const ActiveComponent = OBSERVER_TABS.find(
    (t) => t.id === activeTab
  )?.Component;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto mb-24 px-1">
        {/* Observer banner */}
        <div className="bg-teal-900/30 border border-teal-700/40 rounded-2xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Telescope className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <p className="text-teal-300 text-sm font-bold">Observer Mode</p>
              <p className="text-teal-600 text-xs">
                Read-only · No actions permitted
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Election status pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                electionConfig.status === "ACTIVE"
                  ? "bg-green-900/30 text-green-400 border-green-700/40"
                  : electionConfig.status === "ENDED"
                  ? "bg-red-900/30 text-red-400 border-red-700/40"
                  : "bg-amber-900/30 text-amber-400 border-amber-700/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  electionConfig.status === "ACTIVE"
                    ? "bg-green-500 animate-pulse"
                    : electionConfig.status === "ENDED"
                    ? "bg-red-500"
                    : "bg-amber-500"
                }`}
              />
              {electionConfig.status.replace("_", " ")}
              {electionConfig.status === "ACTIVE" && (
                <span className="font-mono ml-1">{timeLeft}</span>
              )}
            </div>
            <button
              onClick={() => navigate("/")}
              className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Exit observer mode"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-4xl overflow-hidden shadow-2xl border border-slate-800">
          {/* Header */}
          <div className="px-6 md:px-8 pt-6 pb-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center shrink-0">
                <Telescope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-tight">
                  {branding.electionName || "Election"} — Observer Dashboard
                </h2>
                <p className="text-xs text-slate-500">
                  {branding.institutionName || "Virtual Ballot"} · Accredited
                  observer view
                </p>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Registered", value: total, color: "text-white" },
                { label: "Votes Cast", value: voted, color: "text-green-300" },
                { label: "Turnout", value: `${pct}%`, color: "text-amber-300" },
                {
                  label: "Candidates",
                  value: candidates.length,
                  color: "text-teal-300",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center"
                >
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-black font-mono ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Turnout bar */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Turnout
                </p>
                <p className="text-xs font-mono font-bold text-white">
                  {voted} / {total}
                </p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-linear-to-r from-teal-500 to-teal-400 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto">
              {OBSERVER_TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-slate-800 text-white border-t border-l border-r border-slate-700"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="bg-slate-800/30 p-5 md:p-8 rounded-b-4xl">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
