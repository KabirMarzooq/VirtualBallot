import { useEffect, useState } from "react";
import { fetchPublicResults } from "../api";
import { BarChart3, FileDown, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getPositions, getTurnout } from "../utils";
import VBLoader from "../components/ui/VBLoader";
import VotePulse from "../components/results/VotePulse";
import { useSlug } from "../context/SlugContext";

/* ────────────────────────────────────────────────────────────────────────
   Shared shaping — the page, the PDF and the History report all read the
   same structure, so a position always means the same thing everywhere.
   ──────────────────────────────────────────────────────────────────────── */
export function shapePosition(position, allCandidates) {
  const pcs = allCandidates
    .filter((c) => c.position === position)
    .sort((a, b) => b.votes - a.votes);
  const total = pcs.reduce((s, c) => s + c.votes, 0);
  const topVotes = pcs[0]?.votes ?? 0;
  const tiedGroup = topVotes > 0 ? pcs.filter((c) => c.votes === topVotes) : [];
  const tied = tiedGroup.length > 1;
  const margin = pcs.length > 1 ? topVotes - pcs[1].votes : topVotes;
  return {
    position,
    candidates: pcs,
    total,
    topVotes,
    tiedGroup,
    tied,
    margin,
    // A race inside 5% of the total is worth flagging as still open.
    close: !tied && total > 0 && margin / total < 0.05,
    leader: tied ? null : pcs[0] ?? null,
  };
}

const pctOf = (votes, total) => (total === 0 ? 0 : Math.round((votes / total) * 100));

/* ── Printable results document ─────────────────────────────────────────
   Mirrors the on-screen hierarchy: summary, then leaders, then the full
   breakdown. Flat rules and a single ink colour — no gradients or fills
   that cost toner and add nothing.                                       */
export function buildResultsDocument({ title, subtitle, meta, blocks, stats }) {
  const leaders = blocks
    .map((b) => {
      const val = b.tied
        ? `Tied &mdash; ${b.tiedGroup.length} candidates`
        : b.leader?.name ?? "&mdash;";
      const m = b.tied ? "tied" : `+${b.margin}`;
      return `<tr>
        <td class="pos">${b.position}</td>
        <td class="who">${val}</td>
        <td class="num">${m}</td>
      </tr>`;
    })
    .join("");

  const breakdown = blocks
    .map((b) => {
      const rows = b.candidates
        .map((c, i) => {
          const pct = pctOf(c.votes, b.total);
          const lead = c.votes === b.topVotes && b.total > 0;
          return `<tr class="${lead ? "lead" : ""}">
            <td class="rk">${i + 1}</td>
            <td class="nm">${c.name}</td>
            <td class="num">${c.votes}</td>
            <td class="num">${pct}%</td>
            <td class="bar"><span style="width:${pct}%"></span></td>
          </tr>`;
        })
        .join("");
      return `<section>
        <h3>${b.position}<em>${b.total} vote${b.total !== 1 ? "s" : ""}</em></h3>
        ${b.tied ? `<p class="tie">Tie &mdash; ${b.tiedGroup.map((c) => c.name).join(", ")} each have ${b.topVotes} votes. A commission decision is required.</p>` : ""}
        <table class="rows">${rows}</table>
      </section>`;
    })
    .join("");

  const statCells = stats
    .map((s) => `<div><b>${s.value}</b><span>${s.label}</span></div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
  @media print{body{margin:0;padding:24px}}
  body{font-family:Georgia,'Times New Roman',serif;margin:0;padding:40px;background:#F7F8F6;color:#2A312B}
  .page{max-width:760px;margin:0 auto;background:#fff;padding:48px 52px 40px}
  .eyebrow{font-family:Arial,sans-serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#565E57}
  h1{font-size:27px;font-weight:700;margin:6px 0 2px;letter-spacing:-.01em;color:#161B17}
  .sub{font-family:Arial,sans-serif;font-size:12px;color:#565E57}
  .meta{font-family:Arial,sans-serif;font-size:11px;color:#8A928A;margin-top:6px}
  .stats{display:flex;gap:32px;border-top:1px solid #DFE2DC;margin-top:20px;padding-top:16px}
  .stats div b{display:block;font-family:'Courier New',monospace;font-size:21px;color:#161B17}
  .stats div span{display:block;font-family:Arial,sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8A928A;margin-top:3px}
  h2{font-family:Arial,sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#161B17;
     border-bottom:1px solid #DFE2DC;padding-bottom:6px;margin:34px 0 0}
  table{width:100%;border-collapse:collapse}
  .lead-table td{padding:9px 0;border-bottom:1px solid #EDEFEB;font-family:Arial,sans-serif;font-size:12px}
  .lead-table .pos{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8A928A;width:34%}
  .lead-table .who{font-weight:700;color:#161B17}
  .num{text-align:right;font-family:'Courier New',monospace;font-size:12px;color:#565E57;white-space:nowrap}
  section{margin-top:26px;break-inside:avoid}
  section h3{font-size:15px;font-weight:700;color:#161B17;margin:0 0 2px;
     display:flex;justify-content:space-between;align-items:baseline}
  section h3 em{font-family:'Courier New',monospace;font-size:10px;font-style:normal;color:#8A928A}
  .tie{font-family:Arial,sans-serif;font-size:11px;color:#7A5F25;background:#FAF6EB;
     border:1px solid #E6D5A8;padding:7px 10px;margin:8px 0 4px}
  .rows td{padding:7px 0;border-bottom:1px solid #EDEFEB;font-family:Arial,sans-serif;font-size:12px;vertical-align:middle}
  .rows .rk{width:20px;font-family:'Courier New',monospace;color:#C4C9C0}
  .rows .nm{color:#3D453E}
  .rows tr.lead .nm{font-weight:700;color:#161B17}
  .rows tr.lead .num{color:#1F4636;font-weight:700}
  .rows .bar{width:120px;padding-left:14px}
  .rows .bar span{display:block;height:3px;background:#C4C9C0}
  .rows tr.lead .bar span{background:#1F4636}
  .foot{border-top:1px solid #DFE2DC;margin-top:34px;padding-top:12px;
     font-family:Arial,sans-serif;font-size:9.5px;color:#8A928A;display:flex;justify-content:space-between}
</style></head><body><div class="page">
  <p class="eyebrow">${subtitle}</p>
  <h1>${title}</h1>
  <p class="meta">${meta}</p>
  <div class="stats">${statCells}</div>
  <h2>Leading</h2>
  <table class="lead-table">${leaders}</table>
  <h2>Full breakdown</h2>
  ${breakdown}
  <div class="foot">
    <span>Virtual Ballot &middot; every ballot is hash-chained and publicly verifiable</span>
    <span>Generated ${new Date().toLocaleString("en-GB")}</span>
  </div>
</div></body></html>`;
}

export function printDocument(html) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export default function ResultsPage() {
  const {
    electionConfig,
    candidates,
    users,
    branding,
    setCurrentUser,
    resetBallotSession,
    electionId,
  } = useApp();
  const navigate = useNavigate();
  const [resultsData, setResultsData] = useState(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const slug = useSlug();

  useEffect(() => {
    const load = () => {
      fetchPublicResults(slug)
        .then((data) => {
          setResultsData(data);
          setLastUpdated(new Date());
          setIsStale(false);
        })
        .catch(() => {
          // Keep showing the last good data, just flag it as stale
          if (resultsData) {
            setIsStale(true);
          } else {
            setResultsData({
              published: false,
              candidates: [],
              stats: { total: 0, accredited: 0, voted: 0 },
            });
          }
        })
        .finally(() => setLoadingResults(false));
    };

    load();
    // Poll every 30s — keeps live results fresh and recovers after an outage
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  const displayCandidates = resultsData?.candidates?.length
    ? resultsData.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        image: c.image_url,
        color: c.color,
        votes: c.vote_count,
      }))
    : candidates;

  const displayStats = resultsData?.stats || {
    total: getTurnout(users).total,
    accredited: getTurnout(users).accredited,
    voted: getTurnout(users).voted,
  };
  const isPublished =
    resultsData?.published ??
    (electionConfig.isPublished || electionConfig.status === "ENDED");
  const positions = getPositions(displayCandidates);
  const { total, voted } = displayStats;
  const pct = total > 0 ? Math.round((voted / total) * 100) : 0;
  const isLive = electionConfig.status === "ACTIVE" && isPublished;

  const blocks = positions.map((p) => shapePosition(p, displayCandidates));

  const handleHome = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  const toggle = (position) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(position) ? next.delete(position) : next.add(position);
      return next;
    });

  const downloadAll = () =>
    printDocument(
      buildResultsDocument({
        title: branding.electionName || "Election Results",
        subtitle: `${branding.institutionName || "Electoral Commission"} · Official Results`,
        meta: isLive
          ? `Provisional count · generated ${new Date().toLocaleString("en-GB")}`
          : "Final declared result",
        blocks,
        stats: [
          { label: "Registered", value: total },
          { label: "Votes cast", value: voted },
          { label: "Turnout", value: `${pct}%` },
          { label: "Positions", value: positions.length },
        ],
      })
    );

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Stale-connection banner */}
        {isStale && lastUpdated && (
          <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 rounded-lg px-4 py-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
            <p className="text-xs leading-4 text-amber-800">
              Connection lost — showing results from{" "}
              {lastUpdated.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . This page reconnects automatically.
            </p>
          </div>
        )}

        {/* ── Masthead ── */}
        {branding.institutionName && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-400">
            {branding.institutionName}
          </p>
        )}
        <div className="flex items-start justify-between gap-4 mt-1.5">
          <h1 className="text-[26px] sm:text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] text-slate-900">
            {branding.electionName || "Election Results"}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] border rounded-full px-2.5 py-1 shrink-0 ${
              isLive
                ? "border-slate-300 text-slate-600"
                : "border-slate-800 text-slate-900"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? "bg-green-600 animate-pulse" : "bg-slate-900"
              }`}
            />
            {isLive ? "Live" : "Final"}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {isLive
            ? `Updated ${lastUpdated ? lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"} · refreshes automatically`
            : "Official declared result"}
        </p>

        {loadingResults ? (
          <div className="flex justify-center py-32">
            <VBLoader size="lg" label="Loading results..." />
          </div>
        ) : !isPublished ? (
          <div className="border-t border-slate-200 mt-6 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-[17px] font-semibold text-slate-900">
              Counting in progress
            </h2>
            <p className="text-[13px] leading-5 text-slate-600 mt-1">
              Results appear here once the commission broadcasts them.
            </p>
            <p className="text-[11px] text-slate-400 mt-3">
              This page checks for updates every 30 seconds.
            </p>
          </div>
        ) : (
          <>
            {/* ── Tallies ── */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-200 mt-5 pt-4">
              {[
                { label: "Registered", value: total.toLocaleString() },
                { label: "Votes cast", value: voted.toLocaleString() },
                { label: "Turnout", value: `${pct}%` },
                { label: "Positions", value: positions.length },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-mono text-[22px] leading-none font-semibold text-slate-900 tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mt-1.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="h-[3px] bg-slate-200 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span>
                  {voted.toLocaleString()} of {total.toLocaleString()} voters
                </span>
                <span>{pct}%</span>
              </div>
            </div>

            {isLive && (
              <div className="mt-7">
                <VotePulse
                  electionId={electionId}
                  initialCandidates={displayCandidates}
                />
              </div>
            )}

            <div className="lg:grid lg:grid-cols-[264px_1fr] lg:gap-12 lg:items-start">
              {/* ── Leading index ──
                  One constant-height row per position, so the whole election
                  stays scannable however many seats are contested. */}
              <div className="lg:sticky lg:top-6">
                <div className="flex items-center gap-3 mt-8 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-900">
                    Leading
                  </span>
                  <span className="text-[11px] text-slate-400">
                    margin over second
                  </span>
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
              </div>

              {/* ── Full breakdown ── */}
              <div>
                <div className="flex items-center gap-3 mt-8 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-900">
                    Full breakdown
                  </span>
                  <span className="flex-1 h-px bg-slate-200" />
                  <button
                    onClick={downloadAll}
                    title="Download the full results document"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <FileDown className="w-3 h-3" /> Download
                  </button>
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
                            <b className="font-semibold">
                              {b.tiedGroup.length}-way tie
                            </b>{" "}
                            on {b.topVotes} votes. A commission decision is
                            required before this seat is declared.
                          </p>
                        </div>
                      )}

                      {shown.map((c, i) => {
                        const cpct = pctOf(c.votes, b.total);
                        const isLead = c.votes === b.topVotes && !b.tied && b.total > 0;
                        const isTied = c.votes === b.topVotes && b.tied;
                        return (
                          <div
                            key={c.id}
                            className="grid grid-cols-[18px_1fr_auto] gap-x-3 items-baseline py-2.5 border-b border-slate-100"
                          >
                            <span
                              className={`font-mono text-xs tabular-nums ${
                                isLead
                                  ? "text-blue-600"
                                  : isTied
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
                                    : isTied
                                    ? "text-sm text-amber-600"
                                    : "text-sm text-slate-800"
                                }`}
                              >
                                {cpct}%
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
                                    : isTied
                                    ? "bg-amber-600"
                                    : "bg-slate-300"
                                }`}
                                style={{ width: `${cpct}%` }}
                              />
                            </span>
                          </div>
                        );
                      })}

                      {(hidden > 0 || open) && b.candidates.length > 2 && (
                        <button
                          onClick={() => toggle(b.position)}
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
                    Virtual Ballot · every ballot is hash-chained and publicly
                    verifiable
                  </span>
                  <button
                    onClick={handleHome}
                    className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                  >
                    ← Back to voter home
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
