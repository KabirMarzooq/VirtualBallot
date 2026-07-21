import { useState, useEffect } from "react";
import { Telescope, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { OBSERVER_TABS } from "../components/observer/ObserverTabs";
import MobileNoticeBanner from "../components/ui/MobileNoticeBanner";
import { getTurnout } from "../utils";
import { fetchObserverOverview, ORG_SLUG } from "../api";

export default function ObserverPage() {
  const {
    electionConfig,
    setElectionConfig,
    candidates,
    setCandidates,
    users,
    setUsers,
    setActivityLog,
    timeLeft,
    branding,
    setBranding,
    accessToken,
    orgSlug,
  } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("vb_observer_tab") || "tally"
  );

  // Persist the active tab so a reload returns to the same tab
  useEffect(() => {
    sessionStorage.setItem("vb_observer_tab", activeTab);
  }, [activeTab]);
  const [searchParams] = useSearchParams();
  const slug =
    searchParams.get("slug") ||
    sessionStorage.getItem("vb_observer_slug") ||
    orgSlug ||
    ORG_SLUG;

  // Re-hydrate observer session on reload
  const storedToken = sessionStorage.getItem("vb_observer_token");
  const effectiveToken = accessToken || storedToken;

  // Fetch full overview on mount and poll every 15s while ACTIVE
  useEffect(() => {
    if (!effectiveToken) {
      navigate(slug ? `/observer/login?slug=${slug}` : "/observer/login");
      return;
    }

    const load = async () => {
      try {
        const ov = await fetchObserverOverview(effectiveToken, slug);
        setElectionConfig({
          status: ov.election.status,
          isPublished: ov.election.isPublished,
          registryLocked: ov.election.registryLocked,
          showCountdown: ov.election.showCountdown,
          endsAt: ov.election.endsAt,
          votingMode: ov.election.votingMode || "CLOSED",
          fraudTier: ov.election.fraudTier || "EMAIL",
          voteType: ov.election.voteType || "STANDARD",
        });
        setBranding(ov.branding);
        setCandidates(
          ov.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            position: c.position,
            image: c.image_url,
            manifesto: c.manifesto || "",
            color: c.color,
            votes: c.vote_count,
          }))
        );
        setUsers(
          ov.voters.map((v) => ({
            id: v.id,
            matric: v.matric,
            name: v.name,
            email: v.email,
            hasVoted: v.has_voted,
            votedAt: v.voted_at,
            role: "STUDENT",
          }))
        );
        setActivityLog(
          ov.auditLog.map((e) => ({
            id: e.id,
            type: e.event_type,
            message: e.message,
            timestamp: new Date(e.created_at).toLocaleTimeString(),
            date: new Date(e.created_at).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
            }),
            iso: e.created_at,
          }))
        );
      } catch (err) {
        console.error("Failed to load observer overview:", err);
      }
    };

    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [effectiveToken, slug]);

  // Guard: if there's no session (e.g. user hit back after logout), bounce to login
  useEffect(() => {
    const token = sessionStorage.getItem("vb_observer_token");
    if (!token) {
      navigate(`/observer/login?slug=${slug}`, { replace: true });
    }
  }, [navigate, slug]);

  // Defeat Chrome bfcache restoring a logged-out dashboard on back-button
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem("vb_observer_token")) {
        navigate(`/observer/login?slug=${slug}`, { replace: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [navigate, slug]);

  const { total, accredited, voted, pct } = getTurnout(users);
  const isRosterless = electionConfig.votingMode === "OPEN";
  const totalVotesCast = candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
  const ActiveComponent = OBSERVER_TABS.find(
    (t) => t.id === activeTab
  )?.Component;

  const statusDot = {
    ACTIVE: "bg-green-500 animate-pulse",
    ENDED: "bg-red-500",
    NOT_STARTED: "bg-amber-500",
  };

  const kpis = isRosterless
    ? [
        { label: "Total votes", value: totalVotesCast, hero: true },
        { label: "Candidates", value: candidates.length, hero: false },
      ]
    : [
        { label: "Registered", value: total, hero: false },
        { label: "Accredited", value: accredited, hero: false },
        { label: "Votes cast", value: voted, hero: true },
        { label: "Turnout", value: `${pct}%`, hero: false },
      ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Dark observer header ─────────────────────────────────────────── */}
      <div className="bg-slate-900">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 md:px-6 py-3 flex-wrap">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Telescope className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] leading-4 font-semibold text-white flex items-center gap-2 flex-wrap">
              <span className="truncate">
                {branding?.electionName || "Election"} — Observer
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.06em] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full shrink-0">
                Read-only
              </span>
            </p>
            <p className="text-[11px] leading-4 text-slate-400 truncate">
              {branding?.institutionName || "Virtual Ballot"} · no actions
              permitted from this view
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-400/10 border border-slate-700 rounded-lg px-3 py-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  statusDot[electionConfig.status] ?? "bg-slate-500"
                }`}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-300">
                {electionConfig.status.replace("_", " ")}
              </span>
              {electionConfig.status === "ACTIVE" && timeLeft && (
                <span className="font-mono text-[11px] font-semibold text-blue-400">
                  {timeLeft}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem("vb_observer_token");
                sessionStorage.removeItem("vb_observer_slug");
                sessionStorage.removeItem("vb_observer_tab");
                navigate(`/observer/login?slug=${slug}`);
              }}
              title="Exit observer mode"
              className="inline-flex items-center gap-2 min-h-[36px] px-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-400/10 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <MobileNoticeBanner message="The observer dashboard is built for larger displays — for the best experience, switch to a laptop or desktop." />

        {/* KPI strip */}
        <div
          className={`grid gap-3 mb-4 ${
            isRosterless ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 md:grid-cols-4"
          }`}
        >
          {kpis.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border px-4 py-3 ${
                s.hero
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                  s.hero ? "text-blue-100" : "text-slate-600"
                }`}
              >
                {s.label}
              </p>
              <p
                className={`text-[26px] leading-8 font-semibold tabular-nums mt-1 ${
                  s.hero ? "text-white" : "text-slate-900"
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Turnout bar */}
        {!isRosterless && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                Turnout progress
              </p>
              <p className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                {voted} / {total}
              </p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {OBSERVER_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`inline-flex items-center gap-2 text-[13px] font-semibold min-h-[40px] px-4 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
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
