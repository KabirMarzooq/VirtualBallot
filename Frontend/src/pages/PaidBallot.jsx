import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Vote, Clock, Info, Loader2 } from "lucide-react";
import { fetchOpenElection, initializePaidVote, verifyPaidVote } from "../api";
import { ACCENT_MAP } from "../constants";
import VBLoader from "../components/ui/VBLoader";
import { isValidEmail } from "../utils";

const naira = (kobo) => "₦" + (kobo / 100).toLocaleString("en-NG");

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
      } catch {}
    }
  }, []);

  const positions = [...new Set(candidates.map((c) => c.position))];

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
    if (!isValidEmail(email)) return setError("Please enter a valid email address.");
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

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <VBLoader
          size="lg"
          label={verifying ? "Confirming your payment..." : "Loading..."}
        />
      </div>
    );
  }

  if (error && !election) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-white mb-2">Unavailable</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (election.voteType !== "PAID") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-white mb-2">
            Not a paid election
          </h2>
          <p className="text-slate-400">
            This election doesn't use paid voting.
          </p>
        </div>
      </div>
    );
  }

  if (election.status === "NOT_STARTED") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">
            Voting hasn't started
          </h2>
          <p className="text-slate-400">
            Check back when {branding.electionName} opens.
          </p>
        </div>
      </div>
    );
  }
  if (election.status === "ENDED") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-white mb-2">
            Voting has closed
          </h2>
          <p className="text-slate-400">{branding.electionName} has ended.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            Payment confirmed!
          </h2>
          <p className="text-slate-400 mb-6">
            {doneVotes} vote{doneVotes !== 1 ? "s" : ""} recorded. A receipt has
            been emailed to you.
          </p>
          <button
            onClick={() => navigate(`/open/${slug}/results`)}
            className="text-blue-400 font-bold text-sm hover:text-blue-300 cursor-pointer transition-colors"
          >
            View Results →
          </button>
          <button
            onClick={() => navigate("/")}
            className="block mx-auto mt-3 text-xs text-slate-600 hover:text-slate-400 cursor-pointer transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // Main paid ballot
  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="logo"
              className="w-20 h-20 rounded-3xl object-cover mx-auto mb-4 border-4 border-slate-800"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-black text-white">
                {branding.institutionName?.slice(0, 2).toUpperCase() || "VB"}
              </span>
            </div>
          )}
          {branding.institutionName && (
            <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">
              {branding.institutionName}
            </p>
          )}
          <h1 className="text-3xl font-black text-white">
            {branding.electionName}
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-3 bg-amber-600/20 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-600/30">
            <Vote className="w-3.5 h-3.5" /> Paid voting
          </div>
        </div>

        {/* Pick candidate */}
        <div className="space-y-6">
          {positions.map((pos) => {
            const posCandidates = candidates.filter((c) => c.position === pos);
            return (
              <div
                key={pos}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5"
              >
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  {pos}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {posCandidates.map((c) => {
                    const selected = chosen?.id === c.id;
                    const accent =
                      ACCENT_MAP[c.color] ??
                      ACCENT_MAP["from-blue-400 to-blue-600"];
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setChosen({ id: c.id, name: c.name, position: pos })
                        }
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          selected
                            ? `bg-slate-800 ${accent.ring} ring-2 border-transparent`
                            : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white truncate">
                            {c.name}
                          </p>
                          {c.manifesto && (
                            <p className="text-xs text-slate-500 truncate">
                              {c.manifesto}
                            </p>
                          )}
                        </div>
                        {selected && (
                          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote quantity / bundles */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-6 space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {isBundle ? "Choose a bundle" : "How many votes?"}
          </p>

          {isBundle ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bundles.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setBundleIdx(i)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    bundleIdx === i
                      ? "bg-blue-950/40 border-blue-500"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <p className="text-2xl font-black text-white">{b.votes}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    votes
                  </p>
                  <p className="text-sm font-bold text-blue-400 mt-1">
                    {naira(b.amount)}
                  </p>
                  {b.label && (
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      {b.label}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-xl cursor-pointer hover:bg-slate-700"
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
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-xl font-black outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-xl cursor-pointer hover:bg-slate-700"
              >
                +
              </button>
            </div>
          )}

          {!isBundle && (
            <p className="text-sm text-slate-400">
              {naira(election.pricePerVote)} per vote
            </p>
          )}
        </div>

        {/* Email */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-6">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
            Email for receipt
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
        </div>

        {/* Summary + disclaimer */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              {voteCount} vote{voteCount !== 1 ? "s" : ""} for{" "}
              {chosen?.name || "—"}
            </span>
            <span className="text-white font-bold">{naira(baseKobo)}</span>
          </div>
          <div className="flex items-start gap-2 bg-slate-800/60 rounded-xl p-3">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              A small Paystack processing fee is added at checkout. That fee
              goes to Paystack, not Virtual Ballot —
              <span className="text-slate-300 font-bold">
                {" "}
                Virtual Ballot is free to use.
              </span>{" "}
              Your full payment for votes goes to{" "}
              {branding.institutionName || "the organisers"}.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mt-4 bg-red-950/30 border border-red-800/40 rounded-xl py-2.5 px-4">
            {error}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={submitting || !chosen || !email.trim() || voteCount < 1}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            `Pay ${naira(baseKobo)} →`
          )}
        </button>
      </div>
    </div>
  );
}
