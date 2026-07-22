import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal,
  LogOut,
  Building2,
  Vote,
  Users,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Search,
  Receipt,
  RefreshCw,
  Shield,
  Globe,
} from "lucide-react";
import VBLoader from "../components/ui/VBLoader";
import { getMeta } from "../constants";
import {
  fetchSuperAdminOverview,
  fetchSuperAdminLogs,
  fetchSuperAdminInvoices,
  deactivateOrg,
  reactivateOrg,
  verifyElectionChain,
} from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "live", label: "Live now", icon: Activity },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "logs", label: "Audit logs", icon: Shield },
];

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("sa_token");

  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("vb_sa_tab") || "overview"
  );

  // Persist the active tab so a reload returns to the same tab
  useEffect(() => {
    sessionStorage.setItem("vb_sa_tab", activeTab);
  }, [activeTab]);
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilter, setLogFilter] = useState({ org: "", type: "" });
  const [logTotal, setLogTotal] = useState(0);
  const [logOffset, setLogOffset] = useState(0);
  const [actionOrg, setActionOrg] = useState(null); // org being deactivated
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [invSummary, setInvSummary] = useState(null);
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [chainResult, setChainResult] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(null);

  // Guard: if there's no session (e.g. user hit back after logout), bounce to login
  useEffect(() => {
    const t = sessionStorage.getItem("sa_token");
    if (!t) {
      navigate("/superadmin/login", { replace: true });
    }
  }, [navigate]);

  // Defeat Chrome bfcache restoring a logged-out dashboard on back-button
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem("sa_token")) {
        navigate("/superadmin/login", { replace: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [navigate]);

  const loadInvoices = async () => {
    setInvLoading(true);
    try {
      const result = await fetchSuperAdminInvoices(token, {
        search: invSearch || null,
        status: invStatus || null,
      });
      setInvoices(result.invoices);
      setInvSummary(result.summary);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setInvLoading(false);
    }
  };

  const handleVerifyChain = async (electionId) => {
    setVerifyingChain(electionId);
    setChainResult(null);
    try {
      const res = await verifyElectionChain(token, electionId);
      setChainResult({ electionId, ...res });
    } catch (err) {
      setChainResult({ electionId, error: err.message });
    } finally {
      setVerifyingChain(null);
    }
  };

  useEffect(() => {
    if (activeTab === "invoices") loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, invStatus]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const result = await fetchSuperAdminOverview(token);
      setData(result);
    } catch (err) {
      if (err.message?.includes("401") || err.message?.includes("403")) {
        sessionStorage.removeItem("sa_token");
        navigate("/superadmin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (offset = 0) => {
    setLogLoading(true);
    try {
      const result = await fetchSuperAdminLogs(token, {
        limit: 50,
        offset,
        org: logFilter.org || null,
        type: logFilter.type || null,
      });
      setLogs(result.logs);
      setLogTotal(result.total);
      setLogOffset(offset);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadOverview();
    // Poll every 30s so stats and live elections stay current
    const interval = setInterval(() => {
      fetchSuperAdminOverview(token)
        .then(setData)
        .catch((err) => console.error("Failed to poll superadmin overview:", err));
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (activeTab === "logs") loadLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, logFilter]);

  const naira = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");
  const typeBadge = (e) => {
    const parts = [];
    parts.push(e.voting_mode === "OPEN" ? "Open" : "Closed");
    if (e.vote_type === "PAID") parts.push("Paid");
    else parts.push("Free");
    return parts.join(" · ");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sa_token");
    sessionStorage.removeItem("vb_sa_tab");
    navigate("/superadmin/login");
  };

  const handleDeactivate = async (org) => {
    if (!reason.trim()) return;
    setActing(true);
    try {
      await deactivateOrg(org.id, reason, token);
      setActionOrg(null);
      setReason("");
      loadOverview();
    } catch (err) {
      alert(err.message);
    } finally {
      setActing(false);
    }
  };

  const handleReactivate = async (org) => {
    setActing(true);
    try {
      await reactivateOrg(org.id, token);
      loadOverview();
    } catch (err) {
      alert(err.message);
    } finally {
      setActing(false);
    }
  };

  const filteredOrgs = (data?.orgs || []).filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      o.admin_email.toLowerCase().includes(search.toLowerCase())
  );

  if (!token) return null;

  const kpiDefs = data?.stats
    ? [
        { label: "Organizations", value: data.stats.total_orgs, icon: Building2 },
        { label: "Total elections", value: data.stats.total_elections, icon: Vote },
        { label: "Total votes", value: data.stats.total_votes, icon: Users },
        {
          label: "Live now",
          value: data.stats.live_elections,
          icon: Activity,
          hero: true,
          pulse: Number(data.stats.live_elections) > 0,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header (dark) */}
      <div className="bg-slate-900">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 md:px-6 py-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] leading-4 font-semibold text-white">
              Platform Console
            </h1>
            <p className="text-[11px] text-slate-400">
              Virtual Ballot — Super Admin
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadOverview}
              title="Refresh platform data"
              className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-400/5 text-slate-400 hover:text-white hover:bg-slate-400/10 flex items-center justify-center transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Sign out of the platform console"
              className="inline-flex items-center gap-2 min-h-[36px] px-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-400/10 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-32">
            <VBLoader size="lg" label="Loading platform data..." />
          </div>
        ) : (
          <>
            {/* Platform KPI strip */}
            {data?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {kpiDefs.map(({ label, value, icon: Icon, hero, pulse }) => (
                  <div
                    key={label}
                    className={`rounded-xl border p-4 ${
                      hero
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                          hero ? "text-blue-100" : "text-slate-600"
                        }`}
                      >
                        {label}
                      </p>
                      {hero && pulse ? (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${
                            hero ? "text-blue-200" : "text-slate-400"
                          }`}
                        />
                      )}
                    </div>
                    <p
                      className={`text-[28px] leading-9 font-semibold tabular-nums mt-1 ${
                        hero ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {value ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {TABS.map((t) => {
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
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* ── Overview tab ── */}
            {activeTab === "overview" && data && (
              <>
                {/* Payment health alerts */}
                {data.paymentAlerts?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 uppercase tracking-[0.08em] mb-3">
                      <AlertTriangle className="w-3.5 h-3.5" /> Payment health
                      warnings
                    </p>
                    <div className="space-y-1.5">
                      {data.paymentAlerts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3.5 py-2"
                        >
                          <div className="min-w-0">
                            <span className="text-[13px] font-semibold text-slate-900">
                              {a.election_name}
                            </span>
                            <span className="text-[11px] text-slate-600 ml-2">
                              {a.org_name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-amber-800 shrink-0">
                            {a.pending} pending / {a.success} success
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] leading-4 text-amber-800/80 mt-2">
                      High pending-to-success ratios may indicate a webhook or
                      payout configuration issue.
                    </p>
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Recent orgs */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-[13px] font-semibold text-slate-900">
                        Recent organizations
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Latest 5 registered
                      </p>
                    </div>
                    <div>
                      {data.orgs.slice(0, 5).map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                              org.is_active
                                ? "bg-blue-50 text-blue-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {org.slug.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 truncate">
                              {org.name}
                            </p>
                            <p className="text-[11px] text-slate-600 truncate">
                              {org.admin_email}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] font-mono text-slate-600">
                              {org.total_votes_cast} votes
                            </p>
                            {!org.is_active && (
                              <span className="text-[9px] font-semibold text-red-600 uppercase tracking-[0.06em]">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live elections */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-slate-900">
                        Live elections
                      </h3>
                      {data.liveElections.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    {data.liveElections.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <Globe className="w-5 h-5" />
                        </div>
                        <p className="text-[13px] text-slate-600">
                          No elections running right now
                        </p>
                      </div>
                    ) : (
                      <div>
                        {data.liveElections.map((e) => {
                          const pct =
                            e.total_voters > 0
                              ? Math.round((e.votes_cast / e.total_voters) * 100)
                              : 0;
                          return (
                            <div
                              key={e.id}
                              className="px-4 py-3.5 border-b border-slate-100 last:border-0"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                <p className="text-[13px] font-semibold text-slate-900 truncate">
                                  {e.election_name}
                                </p>
                                <p className="text-[11px] text-slate-600 ml-auto truncate">
                                  {e.org_name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-slate-600 shrink-0">
                                  {e.votes_cast}/{e.total_voters} · {pct}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Organizations tab ── */}
            {activeTab === "orgs" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, slug, or email…"
                    className="w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg pl-10 pr-4 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Orgs table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
                    <span className="col-span-3">Organization</span>
                    <span className="col-span-2">Admin email</span>
                    <span className="col-span-2 text-center">Type</span>
                    <span className="col-span-1 text-center">Elections</span>
                    <span className="col-span-1 text-center">Votes</span>
                    <span className="col-span-1 text-center">Status</span>
                    <span className="col-span-2 text-center">Actions</span>
                  </div>
                  <div>
                    {filteredOrgs.length === 0 ? (
                      <p className="text-[13px] text-slate-400 text-center py-10">
                        No organizations match.
                      </p>
                    ) : (
                      filteredOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-50 transition-colors">
                            <div className="col-span-3 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 truncate">
                                {org.name}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                /{org.slug}
                              </p>
                            </div>
                            <span className="col-span-2 text-xs text-slate-600 truncate">
                              {org.admin_email}
                            </span>
                            <div className="col-span-2 flex justify-center">
                              {org.latest_voting_mode ? (
                                <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-center">
                                  {org.latest_voting_mode === "OPEN"
                                    ? "Open"
                                    : "Closed"}
                                  {org.latest_vote_type === "PAID"
                                    ? " · Paid"
                                    : " · Free"}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  —
                                </span>
                              )}
                            </div>
                            <span className="col-span-1 text-center font-mono text-xs text-slate-800">
                              {org.total_elections}
                            </span>
                            <span className="col-span-1 text-center font-mono text-xs text-green-600">
                              {org.total_votes_cast}
                            </span>
                            <div className="col-span-1 flex justify-center">
                              {org.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="col-span-2 flex justify-center gap-2">
                              {org.is_active ? (
                                <button
                                  onClick={() => {
                                    setActionOrg(org);
                                    setReason("");
                                  }}
                                  title="Deactivate this organization"
                                  className="text-[11px] font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-all cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(org)}
                                  disabled={acting}
                                  title="Reactivate this organization"
                                  className="text-[11px] font-semibold text-green-600 hover:bg-green-50 px-2 py-1 rounded-md transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deactivation reason form — inline */}
                          {actionOrg?.id === org.id && (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border-t border-slate-100">
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                              <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleDeactivate(org)
                                }
                                placeholder="Reason for deactivation (required)"
                                autoFocus
                                className="flex-1 min-h-[40px] text-[13px] text-slate-900 bg-white border border-red-200 rounded-lg px-3 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-[3px] focus:ring-red-50 transition-all"
                              />
                              <button
                                onClick={() => handleDeactivate(org)}
                                disabled={acting || !reason.trim()}
                                title="Confirm deactivation"
                                className="min-h-[40px] px-3.5 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer transition-all"
                              >
                                {acting ? <VBLoader size="sm" /> : "Confirm"}
                              </button>
                              <button
                                onClick={() => setActionOrg(null)}
                                title="Cancel"
                                className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2 cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Live Now tab ── */}
            {activeTab === "live" && (
              <div className="space-y-4">
                {!data?.liveElections?.length ? (
                  <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      No live elections
                    </h3>
                    <p className="text-[13px] text-slate-600 mt-1">
                      Elections currently in progress will appear here.
                    </p>
                  </div>
                ) : (
                  data.liveElections.map((e) => {
                    const pct =
                      e.total_voters > 0
                        ? Math.round((e.votes_cast / e.total_voters) * 100)
                        : 0;
                    return (
                      <div
                        key={e.id}
                        className="bg-white border border-slate-200 rounded-xl p-5"
                      >
                        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700 mb-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              Live
                            </span>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {e.election_name}
                            </h3>
                            <p className="text-[13px] text-slate-600">
                              {e.org_name}
                            </p>
                            <span className="inline-block mt-1.5 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              {typeBadge(e)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[28px] leading-9 font-semibold font-mono text-slate-900 tabular-nums">
                              {pct}%
                            </p>
                            <p className="text-[11px] text-slate-600">turnout</p>
                          </div>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>{e.votes_cast} votes cast</span>
                          <span>{e.total_voters} registered voters</span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button
                            onClick={() => handleVerifyChain(e.id)}
                            disabled={verifyingChain === e.id}
                            title="Verify the tamper-evident vote chain"
                            className="inline-flex items-center gap-2 text-xs font-semibold bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 min-h-[36px] px-3.5 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {verifyingChain === e.id
                              ? "Verifying…"
                              : "Verify chain integrity"}
                          </button>

                          {chainResult?.electionId === e.id && (
                            <div
                              className={`mt-3 rounded-lg p-3 text-xs leading-5 border ${
                                chainResult.error
                                  ? "bg-slate-50 border-slate-200 text-slate-600"
                                  : chainResult.intact &&
                                    chainResult.lengthMatches
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : "bg-red-50 border-red-200 text-red-700"
                              }`}
                            >
                              {chainResult.error ? (
                                `Error: ${chainResult.error}`
                              ) : chainResult.intact &&
                                chainResult.lengthMatches ? (
                                <span className="font-semibold">
                                  ✓ Chain intact — {chainResult.chainLength}{" "}
                                  votes, all verified, length matches tally.
                                </span>
                              ) : !chainResult.intact ? (
                                <span className="font-semibold">
                                  ✗ Tampering detected — chain breaks at vote #
                                  {chainResult.brokenAt}.
                                </span>
                              ) : (
                                <span className="font-semibold">
                                  ⚠ Length mismatch — chain has{" "}
                                  {chainResult.chainLength} entries but tally
                                  shows {chainResult.voteTotal} votes.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Invoices tab ── */}
            {activeTab === "invoices" && (
              <div className="space-y-4">
                {/* Summary */}
                {invSummary && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Total revenue",
                        value: naira(invSummary.revenueKobo),
                        hero: true,
                      },
                      { label: "Successful", value: invSummary.successCount },
                      { label: "Pending", value: invSummary.pendingCount },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`rounded-xl border p-4 ${
                          s.hero
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            s.hero ? "text-blue-100" : "text-slate-600"
                          }`}
                        >
                          {s.label}
                        </p>
                        <p
                          className={`text-2xl leading-8 font-semibold font-mono tabular-nums mt-1 ${
                            s.hero ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search + filter */}
                <div className="flex gap-2.5 flex-wrap">
                  <div className="relative flex-1 min-w-[192px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadInvoices()}
                      placeholder="Search email, reference, candidate, org…"
                      className="w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg pl-10 pr-4 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value)}
                    className="min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none focus:border-blue-500 cursor-pointer transition-all"
                  >
                    <option value="">All statuses</option>
                    <option value="SUCCESS">Success</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <button
                    onClick={loadInvoices}
                    title="Search invoices"
                    className="min-h-[44px] px-5 text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer transition-all"
                  >
                    Search
                  </button>
                </div>

                {/* Invoices table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
                    <span className="col-span-2">Org</span>
                    <span className="col-span-3">Voter / candidate</span>
                    <span className="col-span-2 text-center">Votes</span>
                    <span className="col-span-2 text-right">Amount</span>
                    <span className="col-span-1 text-center">Status</span>
                    <span className="col-span-2 text-right">Date</span>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto">
                    {invLoading ? (
                      <div className="py-10 flex justify-center">
                        <VBLoader size="md" />
                      </div>
                    ) : invoices.length === 0 ? (
                      <p className="text-[13px] text-slate-400 text-center py-10">
                        No invoices match.
                      </p>
                    ) : (
                      invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-2 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {inv.org_name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              /{inv.org_slug}
                            </p>
                          </div>
                          <div className="col-span-3 min-w-0">
                            <p className="text-xs text-slate-800 truncate">
                              {inv.voter_email}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              → {inv.candidate_name}
                            </p>
                          </div>
                          <span className="col-span-2 text-center font-mono text-xs text-slate-800">
                            {inv.votes_purchased}
                          </span>
                          <span className="col-span-2 text-right font-mono text-xs font-semibold text-green-600">
                            {naira(inv.amount_kobo)}
                          </span>
                          <div className="col-span-1 flex justify-center">
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                inv.status === "SUCCESS"
                                  ? "bg-green-50 text-green-600"
                                  : inv.status === "PENDING"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <span className="col-span-2 text-right font-mono text-[10px] text-slate-500">
                            {new Date(inv.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Audit Logs tab ── */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex gap-2.5 flex-wrap">
                  <button
                    onClick={() =>
                      setLogFilter((f) => ({
                        ...f,
                        type: f.type === "warning" ? "" : "warning",
                      }))
                    }
                    title="Show only flagged (warning) events"
                    className={`inline-flex items-center gap-2 text-[13px] font-semibold min-h-[44px] px-4 rounded-lg border transition-all cursor-pointer ${
                      logFilter.type === "warning"
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Flagged only
                  </button>
                  <input
                    value={logFilter.org}
                    onChange={(e) =>
                      setLogFilter((f) => ({ ...f, org: e.target.value }))
                    }
                    placeholder="Filter by org slug…"
                    className="flex-1 min-w-[160px] min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-4 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                  />
                  <select
                    value={logFilter.type}
                    onChange={(e) =>
                      setLogFilter((f) => ({ ...f, type: e.target.value }))
                    }
                    className="min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none focus:border-blue-500 cursor-pointer transition-all"
                  >
                    <option value="">All event types</option>
                    {[
                      "vote",
                      "admin",
                      "system",
                      "warning",
                      "registry",
                      "candidate",
                      "error",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Logs table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
                    <span className="col-span-2">Type</span>
                    <span className="col-span-2">Org</span>
                    <span className="col-span-5">Message</span>
                    <span className="col-span-2">Time</span>
                    <span className="col-span-1">Actor</span>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto">
                    {logLoading ? (
                      <div className="py-10 flex justify-center">
                        <VBLoader size="md" />
                      </div>
                    ) : logs.length === 0 ? (
                      <p className="text-[13px] text-slate-400 text-center py-10">
                        No logs match.
                      </p>
                    ) : (
                      logs.map((log) => {
                        const meta = getMeta(log.event_type);
                        return (
                          <div
                            key={log.id}
                            className="grid grid-cols-12 gap-2 px-4 py-2.5 items-start border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                          >
                            <div className="col-span-2">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${meta.lightBadge}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </span>
                            </div>
                            <span className="col-span-2 text-xs font-mono text-slate-500 truncate">
                              {log.org_slug || "—"}
                            </span>
                            <span className="col-span-5 text-[13px] text-slate-800 leading-5">
                              {log.message}
                            </span>
                            <span className="col-span-2 font-mono text-[11px] text-slate-500">
                              {new Date(log.created_at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="col-span-1 text-[10px] text-slate-400 truncate">
                              {log.actor || "—"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Pagination */}
                  {logTotal > 50 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Showing {logOffset + 1}–
                        {Math.min(logOffset + 50, logTotal)} of {logTotal}
                      </span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => loadLogs(Math.max(0, logOffset - 50))}
                          disabled={logOffset === 0}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => loadLogs(logOffset + 50)}
                          disabled={logOffset + 50 >= logTotal}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
