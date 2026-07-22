import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  Vote,
  Clock,
  Lock,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { fetchOpenElection, requestOpenOtp, castOpenVote } from "../api";
import { getDeviceFingerprint, isValidEmail } from "../utils";
import VBLoader from "../components/ui/VBLoader";

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <VBLoader size="lg" label="Loading ballot..." />
      </div>
    );
  }

  // Error / unavailable states
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

  if (election.status === "NOT_STARTED") {
    return (
      <StateCard
        icon={<Clock className="w-6 h-6" />}
        iconClass="bg-amber-50 border border-amber-200 text-amber-600"
        title="Voting hasn't started"
      >
        Check back when {branding.electionName || "the election"} opens.
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
        Thank you for your interest. {branding.electionName} has ended.
      </StateCard>
    );
  }

  // Success
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
            Vote recorded
          </h2>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            Thanks for voting in {branding.electionName}.
          </p>
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 mt-5 text-left">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em]">
              Receipt
            </p>
            <p className="font-mono text-[15px] font-semibold text-slate-900 break-all mt-1">
              {receiptId}
            </p>
          </div>
          <button
            onClick={() => navigate(`/open/${slug}/results`)}
            title="Watch the live results"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" /> View results
          </button>
          <p className="text-[11px] text-slate-400 mt-3">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  // Why the vote button is disabled, in words
  const missing = positions.filter((p) => !ballot[p]);
  const gateParts = [];
  if (missing.length)
    gateParts.push(
      `pick a candidate for ${missing.join(", ")}`
    );
  if (election.fraudTier === "EMAIL") {
    if (!otpSent) gateParts.push("verify your email below");
    else if (otp.length < 6) gateParts.push("finish entering your 6-digit code");
  }

  // Main ballot
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
            {branding.electionName || "Cast Your Vote"}
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-3 py-1.5 rounded-full">
            <Vote className="w-3.5 h-3.5" /> Open public voting
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-4">
          {positions.map((pos) => {
            const posCandidates = candidates.filter((c) => c.position === pos);
            const chosen = !!ballot[pos];
            return (
              <div
                key={pos}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
                    {pos}
                  </p>
                  {chosen && (
                    <span className="text-[10px] font-semibold text-green-600">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {posCandidates.map((c) => {
                    const selected = ballot[pos] === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => select(pos, c.id)}
                        title={`Vote for ${c.name}`}
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
                          {c.manifesto && (
                            <span className="block text-[11px] text-slate-600 truncate mt-0.5">
                              {c.manifesto}
                            </span>
                          )}
                        </span>
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verify to
              vote — one vote per email
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="your@email.com"
                disabled={otpSent}
                className="flex-1 min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600 transition-all"
              />
              <button
                onClick={handleRequestOtp}
                disabled={!email.trim() || otpSending || otpSent}
                title="Email me a verification code"
                className={`min-h-[44px] px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                  otpSent
                    ? "bg-green-50 text-green-600 border border-green-200 cursor-default"
                    : "bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white"
                }`}
              >
                {otpSending ? (
                  <VBLoader size="sm" />
                ) : otpSent ? (
                  "✓ Sent"
                ) : (
                  "Send code"
                )}
              </button>
            </div>
            {otpSent && (
              <>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  placeholder="••••••"
                  className="w-full min-h-[48px] mt-2 font-mono text-lg font-semibold text-center tracking-[0.4em] indent-[0.4em] text-slate-900 bg-white border border-slate-300 rounded-lg outline-none placeholder:text-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all"
                />
                <p className="text-[11px] leading-4 text-slate-400 mt-2">
                  We emailed a 6-digit code to {email.trim()} — it may take a
                  minute.
                </p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mt-4 text-center">
            <p className="text-xs font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleVote}
          disabled={
            !allChosen ||
            submitting ||
            (election.fraudTier === "EMAIL" && (!otpSent || otp.length < 6))
          }
          title="Cast your vote"
          className="w-full mt-5 min-h-[52px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {submitting ? <VBLoader size="sm" /> : <>Cast my vote →</>}
        </button>
        {gateParts.length > 0 && !submitting && (
          <p className="text-center text-[11px] leading-4 text-slate-600 mt-2">
            Before you can vote: {gateParts.join(" and ")}.
          </p>
        )}
      </div>
    </div>
  );
}
