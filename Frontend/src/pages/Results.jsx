import { useEffect, useState } from "react";
import { fetchPublicResults } from "../api";
import { BarChart3, FileDown, Trophy, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PageShell from "../components/layout/PageShell";
import { getPositions, getTurnout } from "../utils";
import VBLoader from "../components/ui/VBLoader";
import VotePulse from "../components/results/VotePulse";
import { useSlug } from "../context/SlugContext"

function downloadCategoryPDF(position, displayCandidates, branding, turnout) {
  const pcs = displayCandidates
    .filter((c) => c.position === position)
    .sort((a, b) => b.votes - a.votes);
  const tot = pcs.reduce((s, c) => s + c.votes, 0);
  const winner = tot > 0 ? pcs[0] : null;
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
  // Local state for results data — fetched fresh from backend
  // so any user (voter, observer, public) can see results, not just admins
  const [resultsData, setResultsData] = useState(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const slug = useSlug()

  useEffect(() => {
    fetchPublicResults(slug)
      .then((data) => setResultsData(data))
      .catch(() =>
        setResultsData({
          published: false,
          candidates: [],
          stats: { total: 0, voted: 0 },
        })
      )
      .finally(() => setLoadingResults(false));
  }, []);

  // Use fetched data if available, fall back to context (for admin previews)
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
    voted: getTurnout(users).voted,
  };
  const isPublished =
    resultsData?.published ??
    (electionConfig.isPublished || electionConfig.status === "ENDED");

  const positions = getPositions(displayCandidates);
  const total = displayStats.total;
  const voted = displayStats.voted;
  const pct = total > 0 ? Math.round((voted / total) * 100) : 0;

  const handleHome = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            {branding.institutionName && (
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                {branding.institutionName}
              </p>
            )}
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              {branding.electionName
                ? `${branding.electionName} — Results`
                : "Final Results"}
              {electionConfig.isPublished &&
                electionConfig.status === "ACTIVE" && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse uppercase tracking-wider">
                    Live
                  </span>
                )}
            </h1>
            <p className="text-slate-500 mt-1">
              Official vote counts and statistics
            </p>
          </div>
          <button
            onClick={handleHome}
            className="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 shrink-0 transition-colors"
          >
            ← Home
          </button>
        </header>

        {/* Only show stats if published */}
        {loadingResults ? (
          <div className="flex justify-center py-32">
            <VBLoader size="lg" label="Loading results..." />
          </div>
        ) : isPublished ? (
          <>
            {/* Live Pulse — shown when election is active and published */}
            {electionConfig.status === "ACTIVE" && isPublished && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wider animate-pulse">
                    Live
                  </span>
                  <h2 className="text-xl font-black text-slate-800">
                    Vote Pulse
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Real-time as votes are cast
                  </p>
                </div>
                <div className="bg-slate-900 rounded-[2rem] p-6">
                  <VotePulse
                    electionId={electionId}
                    initialCandidates={displayCandidates}
                  />
                </div>
              </div>
            )}
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Registered", value: total, accent: false },
                { label: "Votes Cast", value: voted, accent: true },
                { label: "Voter Turnout", value: `${pct}%`, accent: false },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className={`p-6 rounded-4xl border ${
                    accent
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white/80 border-white"
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                      accent ? "text-blue-200" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-4xl sm:text-5xl font-black ${
                      accent ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Turnout bar */}
            <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-white mb-8">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Participation
                </p>
                <p className="text-sm font-mono font-bold text-slate-600">
                  {voted} of {total} voters
                </p>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Per-position results */}
            <div className="space-y-8">
              {positions.map((position) => {
                const pcs = displayCandidates
                  .filter((c) => c.position === position)
                  .sort((a, b) => b.votes - a.votes);
                const tot = pcs.reduce((s, c) => s + c.votes, 0);
                const winner = tot > 0 ? pcs[0] : null;

                return (
                  <div
                    key={position}
                    className="bg-white/80 backdrop-blur p-6 sm:p-8 rounded-[2.5rem] border border-white"
                  >
                    {/* Position header */}
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                          Position
                        </p>
                        <h3 className="text-xl font-black text-slate-800">
                          {position}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full">
                          {tot} vote{tot !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() =>
                            downloadCategoryPDF(
                              position,
                              candidates,
                              branding,
                              pct
                            )
                          }
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>

                    {/* Winner card */}
                    {winner && (
                      <div className="relative overflow-hidden bg-linear-to-br from-slate-900 to-slate-800 p-6 rounded-3xl mb-6 flex items-center gap-6">
                        <div
                          className={`absolute right-0 top-0 bottom-0 w-48 bg-linear-to-l ${winner.color} opacity-20`}
                        />
                        <div className="relative shrink-0">
                          <img
                            src={winner.image}
                            alt={winner.name}
                            className="w-20 h-20 rounded-2xl border-4 border-white/10 bg-slate-700 object-cover"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-yellow-400 w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                            <Trophy className="w-3.5 h-3.5 text-yellow-900" />
                          </div>
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            Elected {position}
                          </p>
                          <h4 className="text-2xl font-black text-white leading-tight truncate">
                            {winner.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-slate-300 text-sm font-bold">
                              {Math.round((winner.votes / tot) * 100)}% of votes
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-slate-400 text-sm">
                              {winner.votes} vote{winner.votes !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        {/* Arc chart */}
                        <div className="relative shrink-0 w-14 h-14">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-14 h-14 -rotate-90"
                          >
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="none"
                              stroke="#334155"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="none"
                              stroke="#facc15"
                              strokeWidth="3"
                              strokeDasharray={`${Math.round(
                                (winner.votes / tot) * 100
                              )} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-yellow-400">
                            {Math.round((winner.votes / tot) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* All candidates */}
                    <div className="space-y-4">
                      {pcs.map((c, i) => {
                        const cpct =
                          tot === 0 ? 0 : Math.round((c.votes / tot) * 100);
                        const isWinner = i === 0 && tot > 0;
                        return (
                          <div
                            key={c.id}
                            className={`p-4 rounded-2xl ${
                              isWinner
                                ? "bg-blue-50 border border-blue-100"
                                : "bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <img
                                src={c.image}
                                alt={c.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-200 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-bold text-sm ${
                                      isWinner
                                        ? "text-blue-900"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {c.name}
                                  </span>
                                  {isWinner && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-full uppercase tracking-wider">
                                      Winner
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span
                                  className={`text-2xl font-black ${
                                    isWinner
                                      ? "text-blue-700"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {cpct}%
                                </span>
                                <p className="text-xs text-slate-400">
                                  {c.votes} vote{c.votes !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-100">
                              <div
                                className={`h-full bg-linear-to-r ${c.color} transition-all duration-1000 rounded-full`}
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
          /* Not yet published */
          <div className="bg-white/60 p-20 rounded-[3rem] text-center border border-white">
            <BarChart3 className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-600">
              Counting in progress
            </h3>
            <p className="text-slate-400 mt-2">
              Results will appear here once the admin broadcasts them.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
