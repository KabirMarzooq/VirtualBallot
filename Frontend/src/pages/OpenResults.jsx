import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart3, ArrowLeft, Scale } from "lucide-react";
import { fetchOpenResults, fetchOpenElection } from "../api";
import VBLoader from "../components/ui/VBLoader";
import { formatTimeLeft } from "../utils";
import PageBackground from "../components/layout/PageBackground";
import { shapePosition } from "./Results";

export default function OpenResultsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(() => new Set());
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
      <PageBackground
        variant="aurora"
        contentClassName="min-h-screen flex items-center justify-center"
      >
        <VBLoader size="lg" label="Loading results..." />
      </PageBackground>
    );
  }

  if (!data?.published) {
    return (
      <PageBackground
        variant="aurora"
        contentClassName="min-h-screen flex items-center justify-center p-4"
      >
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
      </PageBackground>
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

  // Same shaping as the closed-election results page, so both read alike.
  const blocks = positions.map((pos) => shapePosition(pos, candidates));

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* ── Masthead ── */}
        {branding.institutionName && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-400">
            {branding.institutionName}
          </p>
        )}
        <div className="flex items-start justify-between gap-4 mt-1.5">
          <h1 className="text-[26px] sm:text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] text-slate-900">
            {branding.electionName || "Results"}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] border rounded-full px-2.5 py-1 shrink-0 ${
              isActive
                ? "border-slate-300 text-slate-600"
                : "border-slate-800 text-slate-900"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-green-600 animate-pulse" : "bg-slate-900"
              }`}
            />
            {isActive ? "Live" : "Final"}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · refreshes automatically`
            : "Open election · public results"}
        </p>

        {/* ── Tallies ── */}
        <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-200 mt-5 pt-4">
          <div>
            <p className="font-mono text-[22px] leading-none font-semibold text-slate-900 tabular-nums">
              {totalVotes.toLocaleString()}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mt-1.5">
              Votes cast
            </p>
          </div>
          <div>
            <p className="font-mono text-[22px] leading-none font-semibold text-slate-900 tabular-nums">
              {positions.length}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mt-1.5">
              Positions
            </p>
          </div>
          <div>
            <p className="font-mono text-[22px] leading-none font-semibold text-slate-900 tabular-nums">
              {candidates.length}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mt-1.5">
              Candidates
            </p>
          </div>
          {timeLeft && timeLeft !== "Ended" && (
            <div>
              <p className="font-mono text-[22px] leading-none font-semibold text-slate-900 tabular-nums">
                {timeLeft}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mt-1.5">
                Remaining
              </p>
            </div>
          )}
        </div>

        {/* ── Leading index ── */}
        <div className="flex items-center gap-3 mt-8 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-900">
            Leading
          </span>
          <span className="text-[11px] text-slate-400">margin over second</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>
        <nav className="border-t border-slate-200 mt-2.5">
          {blocks.map((b) => (
            <a
              key={b.position}
              href={`#pos-${encodeURIComponent(b.position)}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(`pos-${b.position}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {b.position}
                </span>
                <span className="block text-sm font-semibold text-slate-900 truncate mt-0.5">
                  {b.tied
                    ? `Tied — ${b.tiedGroup.length} candidates`
                    : b.leader?.name ?? "No votes yet"}
                </span>
              </span>
              <span
                className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                  b.tied
                    ? "text-amber-600"
                    : b.close
                    ? "text-blue-700"
                    : "text-slate-600"
                }`}
              >
                {b.tied ? "tied" : `+${b.margin}`}
              </span>
              <span className="text-slate-300 text-[13px]">›</span>
            </a>
          ))}
        </nav>

        {/* ── Full breakdown ── */}
        <div className="flex items-center gap-3 mt-9 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-900">
            Full breakdown
          </span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        {blocks.map((b) => {
          const open = expanded.has(b.position);
          const shown = open ? b.candidates : b.candidates.slice(0, 2);
          const hidden = b.candidates.length - shown.length;
          return (
            <section
              key={b.position}
              id={`pos-${b.position}`}
              className="border-t border-slate-200 pt-4 mt-7 scroll-mt-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900 tracking-[-0.01em]">
                  {b.position}
                </h2>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                  {b.total} vote{b.total !== 1 ? "s" : ""}
                </span>
              </div>

              {b.tied && (
                <div className="flex gap-2 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 mt-3">
                  <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-[17px] text-amber-800">
                    <b className="font-semibold">{b.tiedGroup.length}-way tie</b>{" "}
                    on {b.topVotes} votes.
                  </p>
                </div>
              )}

              {shown.map((c, i) => {
                const pct =
                  b.total === 0 ? 0 : Math.round((c.votes / b.total) * 100);
                const isLead = c.votes === b.topVotes && !b.tied && b.total > 0;
                const isTiedTop = c.votes === b.topVotes && b.tied;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[18px_1fr_auto] gap-x-3 items-baseline py-2.5 border-b border-slate-100"
                  >
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isLead
                          ? "text-blue-600"
                          : isTiedTop
                          ? "text-amber-600"
                          : "text-slate-300"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`truncate ${
                        isLead
                          ? "text-[15px] font-semibold text-slate-900"
                          : "text-sm font-medium text-slate-800"
                      }`}
                    >
                      {c.name}
                    </span>
                    <span className="text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          isLead
                            ? "text-base text-blue-700"
                            : isTiedTop
                            ? "text-sm text-amber-600"
                            : "text-sm text-slate-800"
                        }`}
                      >
                        {pct}%
                      </span>
                      <span className="text-[11px] text-slate-400 ml-2 tabular-nums">
                        {c.votes}
                      </span>
                    </span>
                    <span className="col-start-2 col-span-2 h-0.5 bg-slate-100 rounded-sm overflow-hidden mt-1.5">
                      <span
                        className={`block h-full transition-all duration-700 ${
                          isLead
                            ? "bg-blue-600"
                            : isTiedTop
                            ? "bg-amber-600"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </div>
                );
              })}

              {b.candidates.length > 2 && (
                <button
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(b.position)
                        ? next.delete(b.position)
                        : next.add(b.position);
                      return next;
                    })
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline pt-2.5 cursor-pointer"
                >
                  {hidden > 0
                    ? `Show all ${b.candidates.length} candidates`
                    : "Show fewer"}
                </button>
              )}
            </section>
          );
        })}

        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 mt-9 pt-4 text-[11px] text-slate-400">
          <span>
            Virtual Ballot · every ballot is hash-chained and publicly verifiable
          </span>
          <button
            onClick={() => navigate("/")}
            title="Back to the Virtual Ballot home"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
