import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart3, ArrowLeft, Clock } from "lucide-react";
import { fetchOpenResults, fetchOpenElection } from "../api";
import VBLoader from "../components/ui/VBLoader";
import { formatTimeLeft } from "../utils";

export default function OpenResultsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branding, setBranding] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [endsAt, setEndsAt] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Branding once
    fetchOpenElection(slug)
      .then((d) => {
        setBranding(d.branding);
        setEndsAt(d.election.endsAt);
        setStatus(d.election.status);
      })
      .catch((err) => console.error("Failed to load open election branding:", err));

    const load = () => {
      fetchOpenResults(slug)
        .then((d) => {
          setData(d);
          setLastUpdated(new Date());
        })
        .catch((err) => console.error("Failed to load open results:", err))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  // Live countdown to election end
  useEffect(() => {
    if (!endsAt || status !== "ACTIVE") {
      setTimeLeft("");
      return;
    }
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft("Ended");
        return;
      }
      setTimeLeft(formatTimeLeft(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <VBLoader size="lg" label="Loading results..." />
      </div>
    );
  }

  if (!data?.published) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-[17px] leading-6 font-semibold text-slate-900">
            Results not yet published
          </h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            The organisers haven't released the results yet. This page checks
            again automatically every 30 seconds.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-5 text-left">
            <p className="text-[12px] leading-[18px] font-medium text-amber-800">
              ⚠ Keep this page open — if you leave, you may not be able to
              return to watch the live count once results are published.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            title="Leave to the Virtual Ballot home"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 mt-4 text-[13px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Leave to home
          </button>
        </div>
      </div>
    );
  }

  const candidates = data.candidates.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    image: c.image_url,
    color: c.color,
    votes: c.vote_count,
  }));
  const positions = [...new Set(candidates.map((c) => c.position))];
  const totalVotes = data.stats?.totalVotes ?? 0;
  const isActive = status === "ACTIVE";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 text-slate-800">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="logo"
              className="w-14 h-14 rounded-2xl object-cover mx-auto shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white">
              <BarChart3 className="w-7 h-7" />
            </div>
          )}
          {branding.institutionName && (
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-[0.15em] mt-3">
              {branding.institutionName}
            </p>
          )}
          <h1 className="text-[24px] leading-8 font-semibold text-slate-900 mt-0.5">
            {branding.electionName || "Results"}
          </h1>
          <p className="text-[13px] text-slate-600 mt-1">
            {totalVotes} total vote{totalVotes !== 1 ? "s" : ""} cast
          </p>
          {timeLeft && timeLeft !== "Ended" && (
            <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{timeLeft}</span> remaining
            </div>
          )}
        </div>

        {/* Per-position results */}
        <div className="space-y-4">
          {positions.map((pos) => {
            const pcs = candidates
              .filter((c) => c.position === pos)
              .sort((a, b) => b.votes - a.votes);
            const tot = pcs.reduce((s, c) => s + c.votes, 0);
            const topVotes = pcs[0]?.votes ?? 0;
            const tiedGroup =
              topVotes > 0 ? pcs.filter((c) => c.votes === topVotes) : [];
            const tied = tiedGroup.length > 1;

            return (
              <div
                key={pos}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    {pos}
                  </p>
                  <span className="font-mono text-[11px] text-slate-600">
                    {tot} vote{tot !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4">
                  {pcs.map((c, i) => {
                    const pct =
                      tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                    const isLead = !tied && i === 0 && tot > 0;
                    const isTiedTop = tied && c.votes === topVotes;
                    return (
                      <div key={c.id} className="mb-3 last:mb-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0"
                          />
                          <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                            <span className="truncate">{c.name}</span>
                            {isLead && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.06em] bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">
                                {isActive ? "Leading" : "Winner"}
                              </span>
                            )}
                            {isTiedTop && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.06em] bg-amber-600 text-white px-2 py-0.5 rounded-full shrink-0">
                                Tied
                              </span>
                            )}
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block text-lg leading-[22px] font-semibold text-slate-900 tabular-nums">
                              {pct}%
                            </span>
                            <span className="block text-[11px] text-slate-600">
                              {c.votes} vote{c.votes !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-[42px]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isLead
                                ? "bg-blue-600"
                                : isTiedTop
                                ? "bg-amber-600"
                                : "bg-slate-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {lastUpdated && (
          <p className="text-center text-[11px] text-slate-400 mt-5">
            Updated{" "}
            {lastUpdated.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · refreshes automatically every 30 seconds
          </p>
        )}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => navigate("/")}
            title="Back to the Virtual Ballot home"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 text-[13px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
