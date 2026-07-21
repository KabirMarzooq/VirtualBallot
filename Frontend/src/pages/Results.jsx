import { useEffect, useState } from "react";
import { fetchPublicResults } from "../api";
import { BarChart3, FileDown, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getPositions, getTurnout } from "../utils";
import VBLoader from "../components/ui/VBLoader";
import VotePulse from "../components/results/VotePulse";
import { useSlug } from "../context/SlugContext";

function downloadCategoryPDF(position, displayCandidates, branding, turnout) {
  const pcs = displayCandidates
    .filter((c) => c.position === position)
    .sort((a, b) => b.votes - a.votes);
  const tot = pcs.reduce((s, c) => s + c.votes, 0);
  const topVotes = pcs[0]?.votes ?? 0;
  const tiedGroup = topVotes > 0 ? pcs.filter((c) => c.votes === topVotes) : [];
  const tied = tiedGroup.length > 1;
  const winner = tot > 0 && !tied ? pcs[0] : null;
  const date = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = pcs
    .map((c, i) => {
      const pct = tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
      return `<tr style="background:${
        i === 0 && tot > 0 ? "#eff6ff" : "white"
      }">
      <td style="padding:12px 16px;font-weight:${i === 0 ? "700" : "400"}">${
        i === 0 && tot > 0 ? "🏆 " : ""
      }${c.name}</td>
      <td style="padding:12px 16px;text-align:center;font-weight:700;color:${
        i === 0 && tot > 0 ? "#1d4ed8" : "#374151"
      }">${c.votes}</td>
      <td style="padding:12px 16px;text-align:center;font-weight:700">${pct}%</td>
      <td style="padding:12px 16px"><div style="background:#e2e8f0;border-radius:4px;height:10px"><div style="background:${
        i === 0 && tot > 0 ? "#2563eb" : "#64748b"
      };height:10px;width:${pct}%;border-radius:4px"></div></div></td>
    </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${position} Results</title>
  <style>body{font-family:Georgia,serif;margin:0;padding:40px;background:#f8fafc}
  .page{max-width:740px;margin:0 auto;background:white;padding:48px;border-radius:8px}
  .header{border-bottom:4px double #1e293b;padding-bottom:20px;margin-bottom:28px}
  h1{font-size:26px;font-weight:900;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em}
  h2{font-size:20px;font-weight:700;color:#1d4ed8;margin:0 0 16px}
  .meta{font-size:11px;color:#94a3b8;font-family:monospace;display:flex;gap:20px;margin-top:8px}
  .winner-box{background:linear-gradient(135deg,#1d4ed8,#4338ca);color:white;border-radius:12px;padding:28px;margin-bottom:32px;display:flex;align-items:center;gap:20px}
  .winner-img{width:72px;height:72px;border-radius:12px;border:3px solid rgba(255,255,255,.3);object-fit:cover}
  table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}
  th{background:#f1f5f9;padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;text-align:left;font-family:Arial;color:#64748b;border-bottom:2px solid #e2e8f0}
  td{border-bottom:1px solid #f1f5f9;font-family:Arial;color:#374151}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;font-family:monospace;display:flex;justify-content:space-between}</style>
  </head><body><div class="page">
  <div class="header">
    <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#64748b;font-family:Arial">${
      branding.institutionName || "Electoral Commission"
    } · Official Results</div>
    <h1>${branding.electionName || "Election Results"}</h1>
    <h2>${position}</h2>
    <div class="meta"><span>Generated: ${date}</span><span>Total votes: ${tot}</span><span>Turnout: ${turnout}%</span></div>
  </div>
  ${
    winner
      ? `<div class="winner-box"><span style="font-size:28px">🏆</span>
    <img class="winner-img" src="${winner.image}" alt="${winner.name}" />
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:rgba(255,255,255,.6);font-family:Arial;margin-bottom:4px">Elected ${position}</div>
    <div style="font-size:24px;font-weight:900;margin-bottom:4px">${
      winner.name
    }</div>
    <div style="font-size:14px;color:rgba(255,255,255,.7);font-family:Arial">${Math.round(
      (winner.votes / tot) * 100
    )}% of votes · ${winner.votes} vote${
          winner.votes !== 1 ? "s" : ""
        }</div></div></div>`
      : tied
      ? `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:24px">
    <div style="font-size:13px;font-weight:900;color:#92400e;margin-bottom:8px">⚖️ TIE — Commission Decision Required</div>
    <div style="font-size:12px;color:#78350f;font-family:Arial">The following candidates are tied with ${
      pcs[0].votes
    } votes each: ${tiedGroup.map((c) => c.name).join(", ")}</div>
    </div>`
      : ""
  }
  <table><thead><tr><th>Candidate</th><th style="text-align:center">Votes</th><th style="text-align:center">Share</th><th>Distribution</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer"><span>Virtual Ballot · Secure Election Platform</span><span>Official election record</span></div>
  </div></body></html>`;

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
    // Poll every 30s — keeps live results fresh and recovers automatically after an outage
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
  const { total, accredited, voted } = displayStats;
  const pct = total > 0 ? Math.round((voted / total) * 100) : 0;

  const handleHome = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  const isLive = electionConfig.status === "ACTIVE" && isPublished;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Stale-connection banner */}
        {isStale && lastUpdated && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
            <p className="text-xs leading-4 font-medium text-amber-800">
              Connection lost — showing results from{" "}
              {lastUpdated.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . This page refreshes automatically when back online.
            </p>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
          <div>
            {branding.institutionName && (
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-[0.1em]">
                {branding.institutionName}
              </p>
            )}
            <h1 className="text-2xl leading-8 font-semibold text-slate-900 flex items-center gap-3 flex-wrap mt-1">
              {branding.electionName
                ? `${branding.electionName} — Results`
                : "Final Results"}
              {isLive && (
                <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              )}
            </h1>
            <p className="text-[13px] leading-5 text-slate-600 mt-1">
              Official vote counts and statistics
            </p>
          </div>
          <button
            onClick={handleHome}
            title="Return to voter home"
            className="min-h-[44px] px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:border-slate-400 hover:text-slate-800 shrink-0 transition-all cursor-pointer"
          >
            ← Home
          </button>
        </header>

        {loadingResults ? (
          <div className="flex justify-center py-32">
            <VBLoader size="lg" label="Loading results..." />
          </div>
        ) : isPublished ? (
          <>
            {/* Live pulse */}
            {isLive && (
              <div className="mb-6">
                <VotePulse
                  electionId={electionId}
                  initialCandidates={displayCandidates}
                />
              </div>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Registered", value: total, hero: false },
                { label: "Accredited", value: accredited ?? 0, hero: false },
                { label: "Votes cast", value: voted, hero: true },
                { label: "Turnout", value: `${pct}%`, hero: false },
              ].map(({ label, value, hero }) => (
                <div
                  key={label}
                  className={`rounded-xl border p-4 ${
                    hero
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      hero ? "text-blue-100" : "text-slate-600"
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-[28px] leading-9 font-semibold tabular-nums mt-1 ${
                      hero ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Participation bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                  Participation
                </p>
                <p className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                  {voted} of {total} voters
                </p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Per-position results */}
            <div className="space-y-6">
              {positions.map((position) => {
                const pcs = displayCandidates
                  .filter((c) => c.position === position)
                  .sort((a, b) => b.votes - a.votes);
                const tot = pcs.reduce((s, c) => s + c.votes, 0);
                const topVotes = pcs[0]?.votes ?? 0;
                const tiedGroup =
                  topVotes > 0 ? pcs.filter((c) => c.votes === topVotes) : [];
                const tied = tiedGroup.length > 1;
                const winner = tot > 0 && !tied ? pcs[0] : null;
                const winnerPct = winner
                  ? Math.round((winner.votes / tot) * 100)
                  : 0;

                return (
                  <div
                    key={position}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6"
                  >
                    {/* Position header */}
                    <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">
                          Position
                        </p>
                        <h3 className="text-lg leading-6 font-semibold text-slate-900 mt-0.5">
                          {position}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                          {tot} vote{tot !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() =>
                            downloadCategoryPDF(
                              position,
                              displayCandidates,
                              branding,
                              pct
                            )
                          }
                          title={`Download PDF results for ${position}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>

                    {/* Winner strip */}
                    {winner && (
                      <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <div className="relative shrink-0">
                          <img
                            src={winner.image}
                            alt={winner.name}
                            className="w-14 h-14 rounded-xl object-cover bg-slate-200 block"
                          />
                          <span className="absolute -right-1.5 -bottom-1.5 w-[22px] h-[22px] bg-blue-600 border-2 border-blue-50 rounded-full flex items-center justify-center text-white">
                            <Trophy className="w-3 h-3" strokeWidth={2.4} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-[0.1em]">
                            Elected {position}
                          </p>
                          <h4 className="text-lg leading-6 font-semibold text-slate-900 truncate mt-0.5">
                            {winner.name}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {winnerPct}% of votes · {winner.votes} vote
                            {winner.votes !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {/* Vote-share arc */}
                        <div className="relative w-[52px] h-[52px] shrink-0 hidden sm:block">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-[52px] h-[52px] -rotate-90"
                          >
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="none"
                              stroke="#DBEAFE"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="none"
                              stroke="#2563EB"
                              strokeWidth="3"
                              strokeDasharray={`${winnerPct} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-blue-700 tabular-nums">
                            {winnerPct}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tie panel */}
                    {tied && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-[0.08em] flex items-center gap-1.5 mb-3">
                          ⚖️ Tied — commission decision required
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {tiedGroup.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2.5 bg-white border border-amber-200 rounded-lg px-3 py-2"
                            >
                              <img
                                src={c.image}
                                alt={c.name}
                                className="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 truncate">
                                  {c.name}
                                </p>
                                <p className="text-[11px] text-amber-800">
                                  {c.votes} votes ·{" "}
                                  {Math.round((c.votes / tot) * 100)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Candidate rows */}
                    <div>
                      {pcs.map((c, i) => {
                        const cpct =
                          tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                        const isWinner = tot > 0 && !tied && i === 0;
                        const isTieCandidate = tied && c.votes === topVotes;
                        return (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <img
                                src={c.image}
                                alt={c.name}
                                className="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0"
                              />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800 truncate">
                                  {c.name}
                                </span>
                                {isWinner && (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-blue-600 text-white rounded-full uppercase tracking-[0.06em] shrink-0">
                                    Winner
                                  </span>
                                )}
                                {isTieCandidate && (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-amber-600 text-white rounded-full uppercase tracking-[0.06em] shrink-0">
                                    Tied
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xl leading-6 font-semibold text-slate-900 tabular-nums">
                                  {cpct}%
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  {c.votes} vote{c.votes !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden sm:ml-12">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isWinner
                                    ? "bg-blue-600"
                                    : isTieCandidate
                                    ? "bg-amber-600"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${cpct}%` }}
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
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 px-6 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Counting in progress
            </h3>
            <p className="text-[13px] leading-5 text-slate-600 mt-1">
              Results will appear here once the commission broadcasts them.
            </p>
            <p className="text-[11px] text-slate-400 mt-3">
              This page checks for updates every 30 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
