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
  Scale,
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
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto vb-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${election.name} — official election report`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] my-6 vb-modal-pop"
      >
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-4 min-w-0">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="logo"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-[15px] font-semibold text-white">
                  {branding?.institutionName?.slice(0, 2).toUpperCase() || "VB"}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.1em]">
                {branding?.institutionName || "Organization"}
              </p>
              <h2 className="text-base leading-6 font-semibold text-slate-900 truncate">
                {election.name}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Election Report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              title="Open a printable copy of this report"
              className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
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
                className="bg-slate-50 border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    {s.label}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Voter Stats ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
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
                      color: "text-green-600",
                    },
                    {
                      icon: BarChart3,
                      label: "Candidates",
                      value: (election.candidates || []).length,
                      color: "text-blue-600",
                    },
                  ]
                : [
                    {
                      icon: Users,
                      label: "Registered",
                      value: election.totalVoters,
                      color: "text-slate-900",
                    },
                    {
                      icon: UserCheck,
                      label: "Accredited",
                      value: election.accredited ?? 0,
                      color: "text-blue-600",
                    },
                    {
                      icon: Vote,
                      label: "Votes Cast",
                      value: election.votesCast,
                      color: "text-green-600",
                    },
                    {
                      icon: UserX,
                      label: "Did Not Vote",
                      value:
                        election.didNotVote ??
                        election.totalVoters - election.votesCast,
                      color: "text-red-600",
                    },
                    {
                      icon: TrendingUp,
                      label: "Turnout",
                      value: `${election.turnout}%`,
                      color: "text-blue-600",
                    },
                  ]
              ).map((s) => (
                <div
                  key={s.label}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <s.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                      {s.label}
                    </p>
                  </div>
                  <p className={`text-2xl font-semibold font-mono ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Turnout bar — roster elections only */}
            {!isRosterless && (
              <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    Participation
                  </p>
                  <p className="font-mono text-[11px] text-slate-600">
                    {election.votesCast} / {election.totalVoters}
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Results by Position ─────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
              Results by Position
            </p>
            <div className="space-y-4">
              {Object.entries(byPosition).map(([pos, candidates]) => (
                <div
                  key={pos}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-[0.08em]">
                      {pos}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {candidates[0]?.total || 0} total votes
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {(() => {
                      const topVotes = candidates[0]?.votes ?? 0;
                      const tiedCandidates =
                        topVotes > 0
                          ? candidates.filter((c) => c.votes === topVotes)
                          : [];
                      if (tiedCandidates.length < 2) return null;
                      return (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-600/30 rounded-xl px-4 py-3">
                          <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs leading-[18px] font-medium text-amber-700">
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
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isSoleWinner
                                ? "bg-blue-50 border-blue-200"
                                : isTopTied
                                ? "bg-amber-50 border-amber-600/30"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            {/* Rank */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isSoleWinner
                                  ? "bg-blue-600 text-white"
                                  : isTopTied
                                  ? "bg-amber-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-600"
                              }`}
                            >
                              {isSoleWinner ? (
                                <Trophy className="w-3.5 h-3.5" />
                              ) : isTopTied ? (
                                <Scale className="w-3.5 h-3.5" />
                              ) : (
                                i + 1
                              )}
                            </div>
                            {/* Photo */}
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt={c.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-[13px] font-semibold text-slate-600">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {/* Name + bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-[13px] font-semibold text-slate-900 truncate">
                                  {c.name}
                                </p>
                                {isSoleWinner && (
                                  <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                    Winner
                                  </span>
                                )}
                                {isTopTied && (
                                  <span className="text-[10px] font-semibold bg-amber-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                    Tied
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    isSoleWinner
                                      ? "bg-blue-600"
                                      : isTopTied
                                      ? "bg-amber-600"
                                      : "bg-slate-400"
                                  }`}
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="text-right shrink-0 min-w-[60px]">
                              <p
                                className={`font-mono text-[15px] font-semibold ${
                                  isSoleWinner
                                    ? "text-blue-600"
                                    : isTopTied
                                    ? "text-amber-600"
                                    : "text-slate-600"
                                }`}
                              >
                                {c.pct}%
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
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
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
                Winners Summary
              </p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        #
                      </th>
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Winner
                      </th>
                      <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Position
                      </th>
                      <th className="text-right px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Votes
                      </th>
                      <th className="text-right px-5 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.winners.map((w) => (
                      <tr
                        key={w.position}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Medal className="w-4 h-4 text-blue-600" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {w.image_url ? (
                              <img
                                src={w.image_url}
                                alt={w.winner}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-semibold text-slate-600">
                                  {w.winner.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-slate-900">
                                {w.winner}
                              </span>
                              {w.tied && (
                                <span className="text-[10px] font-semibold bg-amber-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-[0.06em]">
                                  Tie
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-medium text-slate-600 uppercase tracking-[0.06em]">
                            {w.position}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono text-[13px] font-semibold text-green-600">
                            {w.votes}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono text-[13px] font-semibold text-blue-600">
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
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">
          Election History
        </h3>
        <p className="text-xs leading-[18px] text-slate-600 mt-0.5">
          All concluded elections for your organization
        </p>
      </div>

      {/* ── History List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <VBLoader size="lg" label="Loading history..." />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900">
            No concluded elections yet
          </p>
          <p className="text-xs leading-[18px] text-slate-600 mt-1 max-w-sm mx-auto">
            Once an election ends, it will appear here with full results,
            turnout stats, and winner information.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((election) => (
            <div
              key={election.id}
              className="bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Logo / initials */}
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="logo"
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-semibold text-white">
                      {branding?.institutionName?.slice(0, 2).toUpperCase() ||
                        "VB"}
                    </span>
                  </div>
                )}

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">
                    {election.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(election.startedAt)}
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Users className="w-3 h-3 text-slate-400" />
                      {election.votesCast}/{election.totalVoters} voted
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                      <BarChart3 className="w-3 h-3 text-slate-400" />
                      {election.turnout}% turnout
                    </span>
                  </div>
                </div>

                {/* Quick winner preview */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  {election.winners.slice(0, 2).map((w) => (
                    <div
                      key={w.position}
                      className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1"
                    >
                      <Trophy className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-blue-700 truncate max-w-[100px]">
                        {w.winner}
                      </span>
                    </div>
                  ))}
                  {election.winners.length > 2 && (
                    <span className="text-[11px] font-medium text-slate-400">
                      +{election.winners.length - 2} more
                    </span>
                  )}
                </div>

                {/* View button */}
                <button
                  onClick={() => setSelected(election)}
                  title="View the full election report"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer shrink-0"
                >
                  View <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Slim turnout bar at bottom of card */}
              <div className="px-5 pb-4">
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1 rounded-full"
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
