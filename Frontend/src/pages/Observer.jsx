import { useState, useEffect } from "react";
import { Telescope, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { OBSERVER_TABS } from "../components/observer/ObserverTabs";
import { getTurnout } from "../utils";
import { fetchElection, fetchCandidates, ORG_SLUG } from "../api";

export default function ObserverPage() {
  const {
    electionConfig,
    setElectionConfig,
    candidates,
    setCandidates,
    users,
    timeLeft,
    branding,
    setBranding,
    setElectionId,
  } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tally");
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || ORG_SLUG;

  // Load election data for the observer using the slug from the URL
  useEffect(() => {
    if (!slug) return;
    Promise.all([fetchElection(slug), fetchCandidates(slug)])
      .then(([electionData, candidateData]) => {
        setElectionConfig({
          status: electionData.election.status,
          isPublished: electionData.election.isPublished,
          registryLocked: electionData.election.registryLocked,
          showCountdown: electionData.election.showCountdown,
          endsAt: electionData.election.endsAt,
        });
        setBranding(electionData.branding);
        setElectionId(electionData.election.id);
        setCandidates(
          candidateData.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            position: c.position,
            image: c.image_url,
            manifesto: c.manifesto || "",
            color: c.color,
            votes: c.vote_count ?? 0,
          }))
        );
      })
      .catch(console.error);
  }, [slug]);

  const { total, voted, pct } = getTurnout(users);
  const ActiveComponent = OBSERVER_TABS.find(
    (t) => t.id === activeTab
  )?.Component;

  const statusDot = {
    ACTIVE: "bg-green-500 animate-pulse",
    ENDED: "bg-red-500",
    NOT_STARTED: "bg-amber-500",
  };
  const statusColor = {
    ACTIVE: "text-green-400",
    ENDED: "text-red-400",
    NOT_STARTED: "text-amber-400",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-700 rounded-xl flex items-center justify-center shadow-lg">
              <Telescope className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight">
                {branding?.electionName || "Election"} — Observer
              </h1>
              <p className="text-slate-600 text-xs">
                {branding?.institutionName || "Virtual Ballot"} · Read-only · No
                actions permitted
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Status pill */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  statusDot[electionConfig.status] ?? "bg-slate-500"
                }`}
              />
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  statusColor[electionConfig.status] ?? "text-slate-400"
                }`}
              >
                {electionConfig.status.replace("_", " ")}
              </span>
              {electionConfig.status === "ACTIVE" && (
                <span className="font-mono text-teal-400 text-xs ml-1">
                  {timeLeft}
                </span>
              )}
            </div>

            <button
              onClick={() => navigate("/")}
              title="Exit observer mode"
              className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Registered",
              value: total,
              color: "text-white",
              bg: "bg-teal-700",
            },
            {
              label: "Votes Cast",
              value: voted,
              color: "text-green-300",
              bg: "bg-slate-900",
            },
            {
              label: "Turnout",
              value: `${pct}%`,
              color: "text-amber-300",
              bg: "bg-slate-900",
            },
            {
              label: "Candidates",
              value: candidates.length,
              color: "text-teal-300",
              bg: "bg-slate-900",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.bg} rounded-2xl p-5 border border-white/10`}
            >
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">
                {s.label}
              </p>
              <p className={`text-4xl font-mono font-bold ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Turnout bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Turnout Progress
            </p>
            <p className="text-xs font-mono font-bold text-white">
              {voted} / {total}
            </p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-teal-500 to-teal-400 h-3 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 overflow-x-auto">
          {OBSERVER_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
