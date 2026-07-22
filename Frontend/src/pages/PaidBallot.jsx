import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  Vote,
  Clock,
  Lock,
  Info,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { fetchOpenElection, initializePaidVote, verifyPaidVote } from "../api";
import VBLoader from "../components/ui/VBLoader";
import { isValidEmail } from "../utils";

const naira = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");

function StateCard({ icon, iconClass, title, children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${iconClass}`}
        >
          {icon}
        </div>
        <h2 className="text-[17px] leading-6 font-semibold text-slate-900">
          {title}
        </h2>
        <div className="text-[13px] leading-5 text-slate-600 mt-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PaidBallotPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [branding, setBranding] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");

  // selection
  const [chosen, setChosen] = useState(null); // { id, name, position }
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1); // FIXED model
  const [bundleIdx, setBundleIdx] = useState(0); // BUNDLE model
  const [submitting, setSubmitting] = useState(false);

  // post-redirect verify
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [doneVotes, setDoneVotes] = useState(0);
  const [verificationHash, setVerificationHash] = useState("");

  // Load election
  useEffect(() => {
    fetchOpenElection(slug)
      .then((d) => {
        setElection(d.election);
        setBranding(d.branding);
        setCandidates(d.candidates);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // If returning from Paystack with ?reference=, verify it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    if (ref) {
      setVerifying(true);
      verifyPaidVote(ref, slug)
        .then((d) => {
          if (d.success) {
            sessionStorage.removeItem("vb_paid_draft");
            setDone(true);
            setDoneVotes(d.votes);
            setVerificationHash(d.verificationHash || "");
          } else {
            setError("Payment was not completed.");
          }
        })
        .catch(() => setError("Could not verify your payment."))
        .finally(() => setVerifying(false));
    }
  }, [slug]);

  useEffect(() => {
    const draft = sessionStorage.getItem("vb_paid_draft");
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.chosen) setChosen(d.chosen);
        if (d.email) setEmail(d.email);
        if (d.qty) setQty(d.qty);
        if (typeof d.bundleIdx === "number") setBundleIdx(d.bundleIdx);
      } catch (err) {
        console.error("Failed to restore paid ballot draft:", err);
      }
    }
  }, []);

  // Pricing
  const isBundle = election?.pricingModel === "BUNDLE";
  const bundles = election?.voteBundles || [];
  const voteCount = isBundle ? Number(bundles[bundleIdx]?.votes || 0) : qty;
  const baseKobo = isBundle
    ? Number(bundles[bundleIdx]?.amount || 0)
    : qty * Number(election?.pricePerVote || 0);

  const handlePay = async () => {
    if (!chosen) return setError("Select a candidate first.");
    if (!email.trim()) return setError("Enter your email for the receipt.");
    if (!isValidEmail(email))
      return setError("Please enter a valid email address.");
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        candidateId: chosen.id,
        position: chosen.position,
        email: email.trim(),
        ...(isBundle ? { bundleIndex: bundleIdx } : { votes: qty }),
      };
      const data = await initializePaidVote(payload, slug);

      sessionStorage.setItem(
        "vb_paid_draft",
        JSON.stringify({
          chosen,
          email,
          qty,
          bundleIdx,
        })
      );
      // Redirect to Paystack
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <VBLoader size="lg" label="Loading..." />
      </div>
    );
  }

  if (verifying) {
    return (
      <StateCard
        icon={<VBLoader size="md" />}
        iconClass="bg-blue-50 text-blue-600"
        title="Confirming your payment…"
      >
        Hang tight while we check with Paystack. This only takes a moment.
      </StateCard>
    );
  }

  if (error && !election) {
    return (
      <StateCard
        icon={<AlertTriangle className="w-6 h-6" />}
        iconClass="bg-amber-50 border border-amber-200 text-amber-600"
        title="Unavailable"
      >
        {error}
      </StateCard>
    );
  }

  if (election.voteType !== "PAID") {
    return (
      <StateCard
        icon={<Info className="w-6 h-6" />}
        iconClass="bg-slate-100 text-slate-400"
        title="Not a paid election"
      >
        This election doesn't use paid voting.
      </StateCard>
    );
  }

  if (election.status === "NOT_STARTED") {
    return (
      <StateCard
        icon={<Clock className="w-6 h-6" />}
        iconClass="bg-amber-50 border border-amber-200 text-amber-600"
        title="Voting hasn't started"
      >
        Check back when {branding.electionName} opens.
      </StateCard>
    );
  }
  if (election.status === "ENDED") {
    return (
      <StateCard
        icon={<Lock className="w-6 h-6" />}
        iconClass="bg-slate-100 text-slate-400"
        title="Voting has closed"
      >
        {branding.electionName} has ended.
      </StateCard>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-md p-8 sm:px-7 max-w-sm w-full text-center">
          <div className="w-[72px] h-[72px] bg-green-50 border-[1.5px] border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M20 6 9 17l-5-5"
                className="vb-draw"
                style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
              />
            </svg>
          </div>
          <h2 className="text-[22px] leading-7 font-semibold text-slate-900 mt-4">
            Payment confirmed
          </h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            {doneVotes} vote{doneVotes !== 1 ? "s" : ""} recorded
            {chosen?.name ? ` for ${chosen.name}` : ""}. A receipt has been
            emailed to you.
          </p>

          {verificationHash && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mt-5 text-left">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 uppercase tracking-[0.08em]">
                <ShieldCheck className="w-3 h-3" strokeWidth={2.4} /> Verify
                your vote
              </p>
              <p className="font-mono text-[11px] leading-4 text-slate-600 break-all bg-slate-50 rounded-lg px-3 py-2 mt-2.5">
                {verificationHash}
              </p>
              <a
                href={`/verify/${slug}?hash=${encodeURIComponent(
                  verificationHash
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the public vote verifier"
                className="inline-flex items-center gap-1.5 text-xs font-semibold min-h-[36px] px-3 mt-3 rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-all cursor-pointer"
              >
                Verify my vote →
              </a>
            </div>
          )}

          <button
            onClick={() => navigate(`/open/${slug}/results`)}
            title="Watch the live results"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" /> View results
          </button>
          <p className="text-[11px] text-slate-400 mt-3">
            You can close this page — a receipt is on its way to your inbox.
          </p>
        </div>
      </div>
    );
  }

  // Gate hint for the disabled pay button
  const gateParts = [];
  if (!chosen) gateParts.push("choose a candidate");
  if (!email.trim()) gateParts.push("enter your email for the receipt");

  // Main paid ballot
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 text-slate-800">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="logo"
              className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-[22px] font-bold text-white">
                {branding.institutionName?.slice(0, 2).toUpperCase() || "VB"}
              </span>
            </div>
          )}
          {branding.institutionName && (
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-[0.15em] mt-3.5">
              {branding.institutionName}
            </p>
          )}
          <h1 className="text-[26px] leading-8 font-semibold text-slate-900 mt-0.5">
            {branding.electionName}
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-3 py-1.5 rounded-full">
            <Vote className="w-3.5 h-3.5" /> Paid voting
          </div>
        </div>

        {/* Pick candidate — one candidate globally */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
            Choose your candidate
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {candidates.map((c) => {
              const selected = chosen?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    setChosen({ id: c.id, name: c.name, position: c.position })
                  }
                  title={`Back ${c.name}`}
                  className={`relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                    selected
                      ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600"
                      : "bg-white border-slate-300 hover:border-blue-500 hover:shadow-sm"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-blue-600 text-white flex items-center justify-center vb-pop">
                      <Check className="w-2.5 h-2.5" strokeWidth={3.2} />
                    </span>
                  )}
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="w-11 h-11 rounded-xl object-cover bg-slate-200 shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-[13px] font-semibold truncate ${
                        selected ? "text-blue-700" : "text-slate-900"
                      }`}
                    >
                      {c.name}
                    </span>
                    <span className="block text-[11px] text-slate-600 truncate mt-0.5">
                      {c.position}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            Pick one contestant to back — paid votes all go to a single
            candidate.
          </p>
        </div>

        {/* Vote quantity / bundles */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
            {isBundle ? "Choose a bundle" : "How many votes?"}
          </p>

          {isBundle ? (
            <div className="grid grid-cols-3 gap-2">
              {bundles.map((b, i) => {
                const on = bundleIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => setBundleIdx(i)}
                    title={`${b.votes} votes for ${naira(b.amount)}`}
                    className={`relative rounded-xl border px-2.5 py-3.5 text-center transition-all cursor-pointer ${
                      on
                        ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600"
                        : "bg-white border-slate-300 hover:border-blue-500"
                    }`}
                  >
                    {on && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-2 h-2" strokeWidth={3.2} />
                      </span>
                    )}
                    <p
                      className={`text-[22px] leading-6 font-semibold tabular-nums ${
                        on ? "text-blue-700" : "text-slate-900"
                      }`}
                    >
                      {b.votes}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
                      vote{b.votes !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-semibold text-blue-700 mt-1">
                      {naira(b.amount)}
                    </p>
                    {b.label && (
                      <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                        {b.label}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  title="One fewer vote"
                  className="w-11 h-11 rounded-lg bg-white border border-slate-300 text-slate-700 text-xl font-semibold hover:border-slate-400 hover:bg-slate-50 shrink-0 transition-all cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg text-center text-lg font-semibold text-slate-900 tabular-nums outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  title="One more vote"
                  className="w-11 h-11 rounded-lg bg-white border border-slate-300 text-slate-700 text-xl font-semibold hover:border-slate-400 hover:bg-slate-50 shrink-0 transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2.5">
                {naira(election.pricePerVote)} per vote
              </p>
            </>
          )}
        </div>

        {/* Email */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">
            Email for receipt
          </label>
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="your@email.com"
            className="w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Summary + disclaimer */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-slate-600">
              {voteCount} vote{voteCount !== 1 ? "s" : ""} for{" "}
              {chosen?.name || "—"}
            </span>
            <span className="font-mono text-base font-semibold text-slate-900">
              {naira(baseKobo)}
            </span>
          </div>
          <div className="flex gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
            <p className="text-[11px] leading-4 text-slate-600">
              A small Paystack processing fee is added at checkout. That fee
              goes to Paystack, not Virtual Ballot —{" "}
              <span className="font-semibold text-slate-800">
                Virtual Ballot is free to use.
              </span>{" "}
              Your full payment for votes goes to{" "}
              {branding.institutionName || "the organisers"}.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mt-4 text-center">
            <p className="text-xs font-medium text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={submitting || !chosen || !email.trim() || voteCount < 1}
          title="Pay and cast your votes"
          className="w-full mt-5 min-h-[52px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {submitting ? <VBLoader size="sm" /> : `Pay ${naira(baseKobo)} →`}
        </button>
        {gateParts.length > 0 && !submitting && (
          <p className="text-center text-[11px] leading-4 text-slate-600 mt-2">
            Before you can pay: {gateParts.join(" and ")}.
          </p>
        )}
      </div>
    </div>
  );
}
