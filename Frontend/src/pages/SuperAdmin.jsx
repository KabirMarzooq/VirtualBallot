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
  ChevronDown,
  RefreshCw,
  Shield,
  Globe,
} from "lucide-react";
import PageShell from "../components/layout/PageShell";
import VBLoader from "../components/ui/VBLoader";
import { getMeta } from "../constants";
import {
  fetchSuperAdminOverview,
  fetchSuperAdminLogs,
  deactivateOrg,
  reactivateOrg,
} from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "live", label: "Live Now", icon: Activity },
  { id: "logs", label: "Audit Logs", icon: Shield },
];

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("sa_token");

  const [activeTab, setActiveTab] = useState("overview");
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

  // Guard — redirect if no token
  useEffect(() => {
    if (!token) navigate("/superadmin/login");
  }, [token]);

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
    } catch (_) {
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
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (activeTab === "logs") loadLogs(0);
  }, [activeTab, logFilter]);

  const handleLogout = () => {
    sessionStorage.removeItem("sa_token");
    navigate("/");
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight">
                Platform Console
              </h1>
              <p className="text-slate-600 text-xs">
                Virtual Ballot — Super Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOverview}
              className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-32">
            <VBLoader size="lg" label="Loading platform data..." />
          </div>
        ) : (
          <>
            {/* Platform KPI strip */}
            {data?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    label: "Organizations",
                    value: data.stats.total_orgs,
                    icon: Building2,
                    color: "text-violet-400",
                  },
                  {
                    label: "Total Elections",
                    value: data.stats.total_elections,
                    icon: Vote,
                    color: "text-blue-400",
                  },
                  {
                    label: "Total Votes",
                    value: data.stats.total_votes,
                    icon: Users,
                    color: "text-green-400",
                  },
                  {
                    label: "Live Now",
                    value: data.stats.live_elections,
                    icon: Activity,
                    color: "text-red-400",
                    pulse: Number(data.stats.live_elections) > 0,
                  },
                ].map(({ label, value, icon: Icon, color, pulse }) => (
                  <div
                    key={label}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {label}
                      </p>
                      <div className="relative">
                        <Icon className={`w-4 h-4 ${color}`} />
                        {pulse && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    <p className={`text-4xl font-black font-mono ${color}`}>
                      {value ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-1.5">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center cursor-pointer ${
                      active
                        ? "bg-slate-800 text-white shadow"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Overview tab ── */}
            {activeTab === "overview" && data && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent orgs */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-white font-black">
                      Recent Organizations
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Latest 5 registered
                    </p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {data.orgs.slice(0, 5).map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            org.is_active
                              ? "bg-violet-600/20 text-violet-400"
                              : "bg-red-900/20 text-red-500"
                          }`}
                        >
                          {org.slug.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {org.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {org.admin_email}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-slate-400">
                            {org.total_votes_cast} votes
                          </p>
                          {!org.is_active && (
                            <span className="text-[10px] font-bold text-red-500">
                              INACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live elections */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                    <h3 className="text-white font-black">Live Elections</h3>
                    {data.liveElections.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </div>
                  {data.liveElections.length === 0 ? (
                    <div className="p-8 text-center">
                      <Globe className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">
                        No elections running right now
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {data.liveElections.map((e) => {
                        const pct =
                          e.total_voters > 0
                            ? Math.round((e.votes_cast / e.total_voters) * 100)
                            : 0;
                        return (
                          <div key={e.id} className="px-5 py-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-bold text-white">
                                  {e.election_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {e.org_name} · {e.slug}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800/40">
                                LIVE
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-slate-400 shrink-0">
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
            )}

            {/* ── Organizations tab ── */}
            {activeTab === "orgs" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, slug, or email…"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500"
                  />
                </div>

                {/* Orgs table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-800">
                    <span className="col-span-3">Organization</span>
                    <span className="col-span-3">Admin Email</span>
                    <span className="col-span-1 text-center">Elections</span>
                    <span className="col-span-1 text-center">Voters</span>
                    <span className="col-span-1 text-center">Votes</span>
                    <span className="col-span-1 text-center">Status</span>
                    <span className="col-span-2 text-center">Actions</span>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {filteredOrgs.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-10">
                        No organizations match.
                      </p>
                    ) : (
                      filteredOrgs.map((org) => (
                        <div key={org.id}>
                          <div className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-slate-800/30">
                            <div className="col-span-3">
                              <p className="text-sm font-bold text-white truncate">
                                {org.name}
                              </p>
                              <p className="text-xs font-mono text-slate-500">
                                /{org.slug}
                              </p>
                            </div>
                            <span className="col-span-3 text-xs text-slate-400 truncate">
                              {org.admin_email}
                            </span>
                            <span className="col-span-1 text-center text-sm font-mono text-slate-300">
                              {org.total_elections}
                            </span>
                            <span className="col-span-1 text-center text-sm font-mono text-slate-300">
                              {org.total_voters}
                            </span>
                            <span className="col-span-1 text-center text-sm font-mono text-green-400">
                              {org.total_votes_cast}
                            </span>
                            <div className="col-span-1 flex justify-center">
                              {org.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="col-span-2 flex justify-center gap-2">
                              {org.is_active ? (
                                <button
                                  onClick={() => {
                                    setActionOrg(org);
                                    setReason("");
                                  }}
                                  className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-900/20 transition-colors cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(org)}
                                  disabled={acting}
                                  className="text-xs font-bold text-green-400 hover:text-green-300 px-2 py-1 rounded-lg hover:bg-green-900/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deactivation reason form — inline */}
                          {actionOrg?.id === org.id && (
                            <div className="px-5 py-4 bg-red-900/10 border-t border-red-900/30 flex items-center gap-3">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleDeactivate(org)
                                }
                                placeholder="Reason for deactivation (required)"
                                autoFocus
                                className="flex-1 bg-slate-900 border border-red-900/50 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-red-500 placeholder:text-slate-600"
                              />
                              <button
                                onClick={() => handleDeactivate(org)}
                                disabled={acting || !reason.trim()}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer transition-colors"
                              >
                                {acting ? <VBLoader size="sm" /> : "Confirm"}
                              </button>
                              <button
                                onClick={() => setActionOrg(null)}
                                className="text-slate-500 hover:text-white text-xs font-bold cursor-pointer transition-colors"
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
                    <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-white font-black mb-2">
                      No live elections
                    </h3>
                    <p className="text-slate-500 text-sm">
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
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                                Live
                              </span>
                            </div>
                            <h3 className="text-white font-black text-lg">
                              {e.election_name}
                            </h3>
                            <p className="text-slate-500 text-sm">
                              {e.org_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-black text-white font-mono">
                              {pct}%
                            </p>
                            <p className="text-xs text-slate-500">turnout</p>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{e.votes_cast} votes cast</span>
                          <span>{e.total_voters} registered voters</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Audit Logs tab ── */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                  <input
                    value={logFilter.org}
                    onChange={(e) =>
                      setLogFilter((f) => ({ ...f, org: e.target.value }))
                    }
                    placeholder="Filter by org slug…"
                    className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-violet-500 placeholder:text-slate-600 flex-1 min-w-40"
                  />
                  <select
                    value={logFilter.type}
                    onChange={(e) =>
                      setLogFilter((f) => ({ ...f, type: e.target.value }))
                    }
                    className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-violet-500 cursor-pointer"
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-800">
                    <span className="col-span-1">Type</span>
                    <span className="col-span-2">Org</span>
                    <span className="col-span-6">Message</span>
                    <span className="col-span-2">Time</span>
                    <span className="col-span-1">Actor</span>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/50">
                    {logLoading ? (
                      <div className="py-10 flex justify-center">
                        <VBLoader size="md" />
                      </div>
                    ) : logs.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-10">
                        No logs match.
                      </p>
                    ) : (
                      logs.map((log) => {
                        const meta = getMeta(log.event_type);
                        return (
                          <div
                            key={log.id}
                            className="grid grid-cols-12 gap-2 px-5 py-3 items-start hover:bg-slate-800/30"
                          >
                            <div className="col-span-1">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </span>
                            </div>
                            <span className="col-span-2 text-xs font-mono text-violet-400 truncate">
                              {log.org_slug || "—"}
                            </span>
                            <span className="col-span-6 text-sm text-slate-300 leading-snug">
                              {log.message}
                            </span>
                            <span className="col-span-2 text-xs font-mono text-slate-500">
                              {new Date(log.created_at).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            <span className="col-span-1 text-[10px] text-slate-600 truncate">
                              {log.actor || "—"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Pagination */}
                  {logTotal > 50 && (
                    <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Showing {logOffset + 1}–
                        {Math.min(logOffset + 50, logTotal)} of {logTotal}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadLogs(Math.max(0, logOffset - 50))}
                          disabled={logOffset === 0}
                          className="text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => loadLogs(logOffset + 50)}
                          disabled={logOffset + 50 >= logTotal}
                          className="text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
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
