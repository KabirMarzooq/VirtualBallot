import { useState, useEffect } from "react";
import {
  Archive,
  Trophy,
  Calendar,
  X,
  Download,
  Users,
  Vote,
  Clock,
  TrendingUp,
  Medal,
  ChevronRight,
  UserX,
  UserCheck,
  BarChart3,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchElectionHistory } from "../../api";
import VBLoader from "../ui/VBLoader";

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ElectionDetailModal({ election, branding, onClose }) {
  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  const formatTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatDuration = (start, end) => {
    if (!start || !end) return "—";
    const ms = new Date(end) - new Date(start);
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Group candidates by position
  const byPosition = {};
  (election.candidates || []).forEach((c) => {
    if (!byPosition[c.position]) byPosition[c.position] = [];
    byPosition[c.position].push(c);
  });
  // Sort each group by votes desc
  Object.keys(byPosition).forEach((pos) => {
    byPosition[pos].sort((a, b) => b.votes - a.votes);
  });

  const isRosterless = election.votingMode === "OPEN";
  const totalVotesCast = (election.candidates || []).reduce(
    (s, c) => s + (c.votes || 0),
    0
  );

  const handleDownload = () => {
    const org = branding?.institutionName || "Organization";
    const date = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const positionBlocks = Object.entries(byPosition)
      .map(([pos, candidates]) => {
        const total = candidates[0]?.total || 0;
        const rows = candidates
          .map(
            (c, i) => `
        <tr style="background:${i === 0 ? "#eff6ff" : "white"}">
          <td style="padding:10px 16px;font-weight:${i === 0 ? "700" : "400"}">
            ${i === 0 ? "🏆 " : `${i + 1}. `}${c.name}
          </td>
          <td style="padding:10px 16px;text-align:center;font-weight:700;color:${
            i === 0 ? "#1d4ed8" : "#374151"
          }">${c.votes}</td>
          <td style="padding:10px 16px;text-align:center;font-weight:700">${
            c.pct
          }%</td>
          <td style="padding:10px 16px">
            <div style="background:#e2e8f0;border-radius:4px;height:8px">
              <div style="background:${
                i === 0 ? "#2563eb" : "#94a3b8"
              };height:8px;width:${c.pct}%;border-radius:4px"></div>
            </div>
          </td>
        </tr>`
          )
          .join("");

        return `
        <div style="margin-bottom:32px">
          <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;
            font-family:Arial;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px">
            ${pos} <span style="color:#94a3b8;font-weight:400">· ${total} votes</span>
          </h3>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;text-align:left;font-family:Arial;color:#64748b;border-bottom:2px solid #e2e8f0">Candidate</th>
                <th style="padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;text-align:center;font-family:Arial;color:#64748b;border-bottom:2px solid #e2e8f0">Votes</th>
                <th style="padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;text-align:center;font-family:Arial;color:#64748b;border-bottom:2px solid #e2e8f0">Share</th>
                <th style="padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-family:Arial;color:#64748b;border-bottom:2px solid #e2e8f0">Distribution</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      })
      .join("");

    const winnersRows = election.winners
      .map(
        (w) => `
      <tr>
        <td style="padding:10px 16px;font-weight:700;font-family:Arial">${w.winner}</td>
        <td style="padding:10px 16px;font-family:Arial;color:#64748b">${w.position}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:700;color:#16a34a;font-family:Arial">${w.votes}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:700;color:#1d4ed8;font-family:Arial">${w.pct}%</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${election.name} — Official Report</title>
      <style>
        @media print { body { margin: 0; } .no-print { display: none; } }
        body { font-family: Georgia, serif; margin: 0; padding: 40px; background: #f8fafc; }
        .page { max-width: 780px; margin: 0 auto; background: white; padding: 56px; border-radius: 8px; }
        .header { border-bottom: 4px double #1e293b; padding-bottom: 24px; margin-bottom: 32px; }
        h1 { font-size: 28px; font-weight: 900; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .05em; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
        .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-val { font-size: 28px; font-weight: 900; font-family: monospace; margin-bottom: 4px; }
        .stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; font-family: Arial; }
        .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em;
          color: #1e293b; font-family: Arial; margin: 32px 0 16px; border-left: 4px solid #2563eb; padding-left: 12px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
        th { background: #f1f5f9; padding: 10px 16px; font-size: 11px; text-transform: uppercase;
          letter-spacing: .1em; text-align: left; font-family: Arial; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { border-bottom: 1px solid #f1f5f9; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0;
          font-size: 10px; color: #94a3b8; font-family: monospace;
          display: flex; justify-content: space-between; }
        .turnout-bar { background: #e2e8f0; border-radius: 4px; height: 10px; margin-top: 8px; }
        .turnout-fill { background: linear-gradient(90deg, #2563eb, #4338ca); height: 10px; border-radius: 4px; width: ${
          election.turnout
        }%; }
      </style>
      </head><body><div class="page">
  
      <div class="header">
        <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#64748b;font-family:Arial;margin-bottom:8px">
          ${org} · Official Election Report
        </div>
        <h1>${election.name}</h1>
        <div style="font-size:12px;color:#64748b;font-family:Arial;margin-top:8px;display:flex;gap:24px;flex-wrap:wrap">
          <span>📅 ${formatDate(election.startedAt)}</span>
          <span>⏱ Duration: ${formatDuration(
            election.startedAt,
            election.endsAt
          )}</span>
          <span>🕐 Started: ${formatTime(election.startedAt)}</span>
          <span>🕐 Ended: ${formatTime(election.endsAt)}</span>
        </div>
      </div>
  
      ${
        isRosterless
          ? `
        <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
          <div class="stat-box"><div class="stat-val" style="color:#16a34a">${totalVotesCast}</div><div class="stat-lbl">Total Votes</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#2563eb">${
            (election.candidates || []).length
          }</div><div class="stat-lbl">Candidates</div></div>
        </div>
        `
          : `
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-val" style="color:#1e293b">${
            election.totalVoters
          }</div><div class="stat-lbl">Registered</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#2563eb">${
            election.accredited ?? 0
          }</div><div class="stat-lbl">Accredited</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#16a34a">${
            election.votesCast
          }</div><div class="stat-lbl">Votes Cast</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#dc2626">${
            election.didNotVote ?? election.totalVoters - election.votesCast
          }</div><div class="stat-lbl">Did Not Vote</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#2563eb">${
            election.turnout
          }%</div><div class="stat-lbl">Turnout</div></div>
        </div>
        <div class="turnout-bar"><div class="turnout-fill"></div></div>
        `
      }
  
      <div class="section-title">Results by Position</div>
      ${positionBlocks}
  
      <div class="section-title">Winners Summary</div>
      <table>
        <thead><tr>
          <th>Winner</th><th>Position</th>
          <th style="text-align:center">Votes</th><th style="text-align:center">Share</th>
        </tr></thead>
        <tbody>${winnersRows}</tbody>
      </table>
  
      <div class="footer">
        <span>Virtual Ballot · Secure Election Platform</span>
        <span>Generated: ${date}</span>
      </div>
    </div></body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl my-6">
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="logo"
                className="w-12 h-12 rounded-xl object-cover border-2 border-slate-700 shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600
                flex items-center justify-center shrink-0"
              >
                <span className="text-lg font-black text-white">
                  {branding?.institutionName?.slice(0, 2).toUpperCase() || "VB"}
                </span>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {branding?.institutionName || "Organization"}
              </p>
              <h2 className="text-white font-black text-lg leading-tight">
                {election.name}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Official Election Report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              title="Download report"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white
                text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800
                rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Election Meta ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: Calendar,
                label: "Date",
                value: formatDate(election.startedAt),
              },
              {
                icon: Clock,
                label: "Duration",
                value: formatDuration(election.startedAt, election.endsAt),
              },
              {
                icon: Clock,
                label: "Started",
                value: formatTime(election.startedAt),
              },
              {
                icon: Clock,
                label: "Ended",
                value: formatTime(election.endsAt),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-800 rounded-2xl p-4 border border-slate-700"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {s.label}
                  </p>
                </div>
                <p className="text-sm font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Voter Stats ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {isRosterless ? "Vote Statistics" : "Voter Statistics"}
            </p>
            <div
              className={`grid gap-3 ${
                isRosterless ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5"
              }`}
            >
              {(isRosterless
                ? [
                    {
                      icon: Vote,
                      label: "Total Votes",
                      value: totalVotesCast,
                      color: "text-green-400",
                    },
                    {
                      icon: BarChart3,
                      label: "Candidates",
                      value: (election.candidates || []).length,
                      color: "text-blue-400",
                    },
                  ]
                : [
                    {
                      icon: Users,
                      label: "Registered",
                      value: election.totalVoters,
                      color: "text-white",
                    },
                    {
                      icon: UserCheck,
                      label: "Accredited",
                      value: election.accredited ?? 0,
                      color: "text-blue-400",
                    },
                    {
                      icon: Vote,
                      label: "Votes Cast",
                      value: election.votesCast,
                      color: "text-green-400",
                    },
                    {
                      icon: UserX,
                      label: "Did Not Vote",
                      value:
                        election.didNotVote ??
                        election.totalVoters - election.votesCast,
                      color: "text-red-400",
                    },
                    {
                      icon: TrendingUp,
                      label: "Turnout",
                      value: `${election.turnout}%`,
                      color: "text-blue-400",
                    },
                  ]
              ).map((s) => (
                <div
                  key={s.label}
                  className="bg-slate-800 rounded-2xl p-4 border border-slate-700"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <s.icon className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {s.label}
                    </p>
                  </div>
                  <p className={`text-3xl font-black font-mono ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Turnout bar — roster elections only */}
            {!isRosterless && (
              <div className="mt-3 bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Participation
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    {election.votesCast} / {election.totalVoters}
                  </p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Results by Position ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Results by Position
            </p>
            <div className="space-y-4">
              {Object.entries(byPosition).map(([pos, candidates]) => (
                <div
                  key={pos}
                  className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-slate-700 bg-slate-700/30 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                      {pos}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {candidates[0]?.total || 0} total votes
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {(() => {
                      const topVotes = candidates[0]?.votes ?? 0;
                      const tiedCandidates =
                        topVotes > 0
                          ? candidates.filter((c) => c.votes === topVotes)
                          : [];
                      if (tiedCandidates.length < 2) return null;
                      return (
                        <div
                          className="mx-4 mt-3 mb-1 flex items-start gap-2 bg-amber-900/20
      border border-amber-700/30 rounded-xl px-4 py-3"
                        >
                          <span className="text-base shrink-0">⚖️</span>
                          <p className="text-xs text-amber-300 font-bold leading-relaxed">
                            {tiedCandidates.length}-way tie —{" "}
                            {tiedCandidates.map((c) => c.name).join(", ")} each
                            have {topVotes} vote{topVotes !== 1 ? "s" : ""}.
                            Commission decision required.
                          </p>
                        </div>
                      );
                    })()}
                    {(() => {
                      const topVotes = candidates[0]?.votes ?? 0;
                      const isTied =
                        topVotes > 0 &&
                        candidates.filter((c) => c.votes === topVotes).length >
                          1;
                      return candidates.map((c, i) => {
                        const isTopTied = isTied && c.votes === topVotes;
                        const isSoleWinner = !isTied && i === 0 && topVotes > 0;
                        return (
                          <div
                            key={c.name}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              isSoleWinner
                                ? "bg-blue-950/40 border border-blue-700/30"
                                : isTopTied
                                ? "bg-amber-900/20 border border-amber-700/30"
                                : "bg-slate-900/50"
                            }`}
                          >
                            {/* Rank */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center
      text-xs font-black shrink-0 ${
        isSoleWinner
          ? "bg-yellow-500 text-yellow-950"
          : isTopTied
          ? "bg-amber-500 text-amber-950"
          : "bg-slate-700 text-slate-400"
      }`}
                            >
                              {isSoleWinner ? "★" : isTopTied ? "⚖" : i + 1}
                            </div>
                            {/* Photo */}
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-700 shrink-0"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-xl bg-slate-700 flex items-center
                            justify-center shrink-0"
                              >
                                <span className="text-sm font-black text-slate-400">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p
                                  className={`font-black text-sm truncate
                              ${i === 0 ? "text-white" : "text-slate-300"}`}
                                >
                                  {c.name}
                                </p>
                                {isSoleWinner && (
                                  <span
                                    className="text-[10px] font-black bg-yellow-500/20 text-yellow-400
                              border border-yellow-600/30 px-1.5 py-0.5 rounded-full shrink-0"
                                  >
                                    WINNER
                                  </span>
                                )}
                                {isTopTied && (
                                  <span
                                    className="text-[10px] font-black bg-amber-500/20 text-amber-400
                              border border-amber-600/30 px-1.5 py-0.5 rounded-full shrink-0"
                                  >
                                    TIED
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all
                              ${i === 0 ? "bg-blue-500" : "bg-slate-500"}`}
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="text-right shrink-0 min-w-[60px]">
                              <p
                                className={`text-base font-black ${
                                  i === 0 ? "text-blue-400" : "text-slate-400"
                                }`}
                              >
                                {c.pct}%
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {c.votes} votes
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Winners Summary Table ────────────────────────────────────────── */}
          {election.winners.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Winners Summary
              </p>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-700/30">
                      <th className="text-left px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        #
                      </th>
                      <th className="text-left px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Winner
                      </th>
                      <th className="text-left px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Position
                      </th>
                      <th className="text-right px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Votes
                      </th>
                      <th className="text-right px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {election.winners.map((w, i) => (
                      <tr
                        key={w.position}
                        className="hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Medal className="w-4 h-4 text-yellow-500" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {w.image_url ? (
                              <img
                                src={w.image_url}
                                alt={w.winner}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-700 shrink-0"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg bg-slate-700 flex items-center
                                justify-center shrink-0"
                              >
                                <span className="text-xs font-black text-slate-400">
                                  {w.winner.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm">
                                {w.winner}
                              </span>
                              {w.tied && (
                                <span
                                  className="text-[10px] font-black bg-amber-500/20 text-amber-400
      border border-amber-600/30 px-1.5 py-0.5 rounded-full shrink-0"
                                >
                                  TIE
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {w.position}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono font-bold text-green-400 text-sm">
                            {w.votes}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono font-bold text-blue-400 text-sm">
                            {w.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main HistoryTab ──────────────────────────────────────────────────────────
export default function HistoryTab() {
  const { accessToken, orgSlug, branding } = useApp();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // election open in modal

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchElectionHistory(accessToken, orgSlug);
        setHistory(data.elections);
      } catch (err) {
        console.error("History load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, orgSlug]);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-black text-lg">Election History</h3>
          <p className="text-slate-400 text-sm mt-0.5">
            All concluded elections for your organization
          </p>
        </div>
      </div>

      {/* ── History List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <VBLoader size="lg" label="Loading history..." />
        </div>
      ) : history.length === 0 ? (
        <div
          className="bg-slate-800 border border-dashed border-slate-600
          rounded-2xl p-12 text-center"
        >
          <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-black mb-2">
            No concluded elections yet
          </h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Once an election ends, it will appear here with full results,
            turnout stats, and winner information.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((election) => (
            <div
              key={election.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl
                hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Logo / initials */}
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="logo"
                    className="w-11 h-11 rounded-xl object-cover border-2
                      border-slate-700 shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500
                    to-indigo-600 flex items-center justify-center shrink-0"
                  >
                    <span className="text-sm font-black text-white">
                      {branding?.institutionName?.slice(0, 2).toUpperCase() ||
                        "VB"}
                    </span>
                  </div>
                )}

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white truncate">
                    {election.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(election.startedAt)}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      {election.votesCast}/{election.totalVoters} voted
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <BarChart3 className="w-3 h-3" />
                      {election.turnout}% turnout
                    </span>
                  </div>
                </div>

                {/* Quick winner preview */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  {election.winners.slice(0, 2).map((w) => (
                    <div
                      key={w.position}
                      className="flex items-center gap-1.5 bg-slate-900/60
                        border border-slate-700 rounded-xl px-3 py-1.5"
                    >
                      <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[100px]">
                        {w.winner}
                      </span>
                    </div>
                  ))}
                  {election.winners.length > 2 && (
                    <span className="text-xs text-slate-500 font-bold">
                      +{election.winners.length - 2} more
                    </span>
                  )}
                </div>

                {/* View button */}
                <button
                  onClick={() => setSelected(election)}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600
                    text-white text-xs font-bold px-4 py-2.5 rounded-xl
                    transition-colors cursor-pointer shrink-0"
                >
                  View <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Slim turnout bar at bottom of card */}
              <div className="px-5 pb-4">
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500
                    h-1 rounded-full"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {selected && (
        <ElectionDetailModal
          election={selected}
          branding={branding}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
