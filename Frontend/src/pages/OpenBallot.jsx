import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ArrowRight,
  Vote,
  Clock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { fetchOpenElection, requestOpenOtp, castOpenVote } from "../api";
import { getDeviceFingerprint, isValidEmail } from "../utils";
import { ACCENT_MAP } from "../constants";
import VBLoader from "../components/ui/VBLoader";

export default function OpenBallotPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [branding, setBranding] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [ballot, setBallot] = useState({}); // { position: candidateId }
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [error, setError] = useState("");

  // EMAIL tier state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // Load election
  useEffect(() => {
    fetchOpenElection(slug)
      .then((data) => {
        setElection(data.election);
        setBranding(data.branding);
        setCandidates(data.candidates);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const positions = [...new Set(candidates.map((c) => c.position))];
  const allChosen = positions.every((p) => ballot[p]);

  const select = (position, candidateId) =>
    setBallot((b) => ({ ...b, [position]: candidateId }));

  const handleRequestOtp = async () => {
    if (!email.trim()) return;
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    setOtpSending(true);
    try {
      await requestOpenOtp(email.trim(), slug);
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVote = async () => {
    if (!allChosen) return;
    setSubmitting(true);
    setError("");
    try {
      const selections = Object.entries(ballot).map(
        ([position, candidateId]) => ({
          position,
          candidateId,
        })
      );

      let payload = { selections };
      if (election.fraudTier === "EMAIL") {
        if (!email.trim() || !otp.trim()) {
          setError("Enter your email and the verification code.");
          setSubmitting(false);
          return;
        }
        payload = { ...payload, email: email.trim(), otp: otp.trim() };
      } else {
        payload = { ...payload, fingerprint: await getDeviceFingerprint() };
      }

      const data = await castOpenVote(payload, slug);
      setReceiptId(data.receiptId);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <VBLoader size="lg" label="Loading ballot..." />
      </div>
    );
  }

  // Error / unavailable states
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

  if (election.status === "NOT_STARTED") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">
            Voting hasn't started
          </h2>
          <p className="text-slate-400">
            Check back when {branding.electionName || "the election"} opens.
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
          <p className="text-slate-400">
            Thank you for your interest. {branding.electionName} has ended.
          </p>
        </div>
      </div>
    );
  }

  // Success
  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            Vote recorded!
          </h2>
          <p className="text-slate-400 mb-6">
            Thank you for voting in {branding.electionName}.
          </p>
          <div className="bg-slate-800 rounded-2xl p-4 mb-6">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              Receipt
            </p>
            <p className="font-mono font-black text-green-400 text-lg">
              {receiptId}
            </p>
          </div>
          <button
            onClick={() => navigate(`/open/${slug}/results`)}
            className="text-blue-400 font-bold text-sm hover:text-blue-300 cursor-pointer transition-colors"
          >
            View Results →
          </button>
          <p className="text-xs text-slate-600 mt-3">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  // Main ballot
  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
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
            {branding.electionName || "Cast Your Vote"}
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-600/20 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-600/30">
            <Vote className="w-3.5 h-3.5" /> Open public voting
          </div>
        </div>

        {/* Positions */}
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
                    const selected = ballot[pos] === c.id;
                    const accent =
                      ACCENT_MAP[c.color] ??
                      ACCENT_MAP["from-blue-400 to-blue-600"];
                    return (
                      <button
                        key={c.id}
                        onClick={() => select(pos, c.id)}
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

        {/* EMAIL tier verification */}
        {election.fraudTier === "EMAIL" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                Verify to vote
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={otpSent}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 disabled:opacity-60 placeholder:text-slate-600"
              />
              <button
                onClick={handleRequestOtp}
                disabled={!email.trim() || otpSending || otpSent}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {otpSending ? (
                  <VBLoader size="sm" />
                ) : otpSent ? (
                  "Sent ✓"
                ) : (
                  "Send code"
                )}
              </button>
            </div>
            {otpSent && (
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="Enter 6-digit code"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-widest outline-none focus:border-teal-500 placeholder:text-slate-600"
              />
            )}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center mt-4 bg-red-950/30 border border-red-800/40 rounded-xl py-2.5 px-4">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleVote}
          disabled={
            !allChosen ||
            submitting ||
            (election.fraudTier === "EMAIL" && (!otpSent || otp.length < 6))
          }
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <VBLoader size="sm" />
          ) : (
            <>
              Cast My Vote <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        {!allChosen && (
          <p className="text-center text-xs text-slate-600 mt-2">
            Select a candidate for every position to continue.
          </p>
        )}
      </div>
    </div>
  );
}
