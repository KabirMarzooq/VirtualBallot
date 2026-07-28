import { useState, useEffect } from "react";
import {
  Receipt,
  TrendingUp,
  Vote,
  Download,
  X,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchInvoices } from "../../api";
import VBLoader from "../ui/VBLoader";

const naira = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");

function InvoiceModal({ inv, branding, onClose }) {
  const fmtDate = (d) =>
    new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDownload = () => {
    const org = branding?.institutionName || "Organization";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${
      inv.reference
    }</title>
    <style>
      body{font-family:Georgia,serif;margin:0;padding:40px;background:#f8fafc}
      .page{max-width:680px;margin:0 auto;background:white;padding:48px;border-radius:8px}
      .head{border-bottom:4px double #1e293b;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
      h1{font-size:24px;font-weight:900;margin:0;text-transform:uppercase;letter-spacing:.05em}
      .status{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;font-family:Arial;text-transform:uppercase}
      .ok{background:#dcfce7;color:#16a34a}.pend{background:#fef3c7;color:#92400e}.fail{background:#fee2e2;color:#dc2626}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      td{padding:10px 0;font-family:Arial;font-size:14px;border-bottom:1px solid #f1f5f9}
      .label{color:#64748b}.val{text-align:right;font-weight:700;color:#0f172a}
      .total td{border-top:2px solid #1e293b;border-bottom:none;font-size:18px;font-weight:900;padding-top:16px}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;font-family:monospace}
    </style></head><body><div class="page">
    <div class="head">
      <div>
        <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#64748b;font-family:Arial;margin-bottom:6px">${org}</div>
        <h1>Vote Invoice</h1>
        <div style="font-family:monospace;font-size:12px;color:#94a3b8;margin-top:6px">${
          inv.reference
        }</div>
      </div>
      <span class="status ${
        inv.status === "SUCCESS"
          ? "ok"
          : inv.status === "PENDING"
          ? "pend"
          : "fail"
      }">${inv.status}</span>
    </div>
    <table>
      <tr><td class="label">Date</td><td class="val">${fmtDate(
        inv.created_at
      )}</td></tr>
      <tr><td class="label">Election</td><td class="val">${
        inv.election_name
      }</td></tr>
      <tr><td class="label">Voter email</td><td class="val">${
        inv.voter_email
      }</td></tr>
      <tr><td class="label">Voted for</td><td class="val">${
        inv.candidate_name
      } (${inv.position})</td></tr>
      <tr><td class="label">Votes purchased</td><td class="val">${
        inv.votes_purchased
      }</td></tr>
      <tr><td class="label">Vote amount</td><td class="val">${naira(
        inv.amount_kobo
      )}</td></tr>
      <tr><td class="label">Paystack processing fee</td><td class="val">${naira(
        inv.fee_kobo
      )}</td></tr>
      <tr class="total"><td>Total paid by voter</td><td class="val">${naira(
        inv.amount_kobo + inv.fee_kobo
      )}</td></tr>
    </table>
    <p style="font-size:11px;color:#64748b;font-family:Arial">The vote amount of ${naira(
      inv.amount_kobo
    )} settles to ${org}. The processing fee is retained by Paystack. Virtual Ballot charges nothing.</p>
    <div class="footer">Virtual Ballot · Secure Election Platform · Generated ${new Date().toLocaleString(
      "en-GB"
    )}</div>
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
        aria-label="Vote invoice"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] my-6 vb-modal-pop"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.1em]">
              {inv.election_name}
            </p>
            <h2 className="text-base leading-6 font-semibold text-slate-900 mt-0.5">
              Vote Invoice
            </h2>
            <p className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
              {inv.reference}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              title="Open a printable copy of this invoice"
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
        <div className="p-6">
          {[
            ["Status", inv.status],
            ["Date", fmtDate(inv.created_at)],
            ["Voter email", inv.voter_email],
            ["Voted for", `${inv.candidate_name} (${inv.position})`],
            ["Votes purchased", inv.votes_purchased],
            ["Vote amount", naira(inv.amount_kobo)],
            ["Paystack fee", naira(inv.fee_kobo)],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 text-[13px] leading-5 py-2.5 border-b border-slate-100"
            >
              <span className="text-slate-600">{k}</span>
              <span className="font-semibold text-slate-900 text-right">
                {v}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-4">
            <span className="text-[13px] font-semibold text-slate-900">
              Total paid
            </span>
            <span className="font-mono text-lg font-semibold text-green-600">
              {naira(inv.amount_kobo + inv.fee_kobo)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceTab() {
  const { accessToken, orgSlug, branding } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = () => {
      fetchInvoices(accessToken, orgSlug)
        .then((d) => {
          setInvoices(d.invoices);
          setSummary(d.summary);
        })
        .catch((err) => console.error("Failed to load invoices:", err))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [accessToken, orgSlug]);

  const statusIcon = (s) =>
    s === "SUCCESS" ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : s === "PENDING" ? (
      <Clock className="w-4 h-4 text-amber-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <VBLoader size="lg" label="Loading invoices..." />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: TrendingUp,
              label: "Revenue",
              value: naira(summary.revenueKobo),
              color: "text-green-600",
            },
            {
              icon: Vote,
              label: "Votes Sold",
              value: summary.votesSold,
              color: "text-blue-600",
            },
            {
              icon: Receipt,
              label: "Transactions",
              value: summary.paidCount,
              color: "text-slate-900",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200 rounded-xl p-5"
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
      )}

      {/* List */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900">
            No transactions yet
          </p>
          <p className="text-xs leading-[18px] text-slate-600 mt-1 max-w-sm mx-auto">
            Paid vote transactions for your organization will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <div className="shrink-0">{statusIcon(inv.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">
                  {inv.candidate_name}{" "}
                  <span className="text-slate-600 font-normal">
                    · {inv.votes_purchased} vote
                    {inv.votes_purchased !== 1 ? "s" : ""}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {inv.voter_email} · {inv.reference}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[13px] font-semibold text-green-600">
                  {naira(inv.amount_kobo)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelected(inv)}
                title="View the full invoice"
                className="text-xs font-semibold min-h-[36px] px-3.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer shrink-0"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <InvoiceModal
          inv={selected}
          branding={branding}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
