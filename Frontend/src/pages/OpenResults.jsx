import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart3, Trophy, ArrowLeft, Clock } from "lucide-react";
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <VBLoader size="lg" label="Loading results..." />
      </div>
    );
  }

  if (!data?.published) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">
            Results not yet published
          </h2>
          <p className="text-slate-400">
            The organisers haven't released the results yet. Check back soon.
          </p>
          <div className="mt-6 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-amber-300 font-bold leading-relaxed">
              ⚠ Results aren't live yet. Keep this page open — if you leave, you
              may not be able to return to watch the live count once they're
              published.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-slate-500 font-bold text-sm hover:text-slate-300 cursor-pointer transition-colors flex items-center gap-2 mx-auto"
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

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="logo"
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border-4 border-slate-800"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          )}
          {branding.institutionName && (
            <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">
              {branding.institutionName}
            </p>
          )}
          <h1 className="text-3xl font-black text-white">
            {branding.electionName || "Results"}
          </h1>
          <p className="text-slate-500 mt-1">
            {totalVotes} total vote{totalVotes !== 1 ? "s" : ""} cast
          </p>
          {timeLeft && timeLeft !== "Ended" && (
            <div className="inline-flex items-center gap-1.5 mt-3 bg-amber-600/20 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-600/30">
              <Clock className="w-3.5 h-3.5" /> {timeLeft} remaining
            </div>
          )}
        </div>

        {/* Per-position results */}
        <div className="space-y-6">
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
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {pos}
                  </p>
                  <span className="text-xs font-mono text-slate-500">
                    {tot} votes
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {pcs.map((c, i) => {
                    const pct =
                      tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                    const isWinner = !tied && i === 0 && tot > 0;
                    const isTiedTop = tied && c.votes === topVotes;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-2xl border ${
                          isWinner
                            ? "bg-blue-950/40 border-blue-700/30"
                            : isTiedTop
                            ? "bg-amber-900/20 border-amber-700/30"
                            : "bg-slate-800/50 border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-700 shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-black text-white truncate">
                              {c.name}
                            </span>
                            {isWinner && (
                              <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                                Winner
                              </span>
                            )}
                            {isTiedTop && (
                              <span className="text-[9px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                                Tied
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-white">
                              {pct}%
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {c.votes} votes
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isWinner
                                ? "bg-blue-500"
                                : isTiedTop
                                ? "bg-amber-500"
                                : "bg-slate-500"
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
          <p className="text-center text-xs text-slate-600 mt-6">
            Updated{" "}
            {lastUpdated.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · refreshes automatically
          </p>
        )}
        <button
          onClick={() => navigate("/")}
          className="mx-auto mt-4 text-slate-500 font-bold text-sm hover:text-slate-300 cursor-pointer transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
      </div>
    </div>
  );
}
