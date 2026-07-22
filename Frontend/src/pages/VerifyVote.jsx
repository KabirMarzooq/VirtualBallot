import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ShieldX,
  Search,
  CheckCircle,
  SearchX,
  AlertTriangle,
} from "lucide-react";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import { verifyVoteHash } from "../api";

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-900/5 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <span
        className={`text-xs font-semibold text-slate-900 text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function VerifyVotePage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hash, setHash] = useState(searchParams.get("hash") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async (h) => {
    const value = (h ?? hash).trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await verifyVoteHash(slug, value);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-check if a hash was passed in the URL
  useEffect(() => {
    if (searchParams.get("hash")) check(searchParams.get("hash"));
    // eslint-disable-next-line
  }, []);

  const tampered = result?.found && !result.chainIntact;

  return (
    <AuthBackground>
      <div className="w-full max-w-[440px] text-slate-800 py-6">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7">
          {/* Crest */}
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto text-white ${
              tampered ? "bg-red-600" : "bg-blue-600"
            }`}
          >
            {tampered ? (
              <ShieldX className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-[22px] leading-7 font-semibold text-slate-900 text-center mt-4">
            Verify your vote
          </h1>
          <p className="text-[13px] leading-5 text-slate-600 text-center mt-1.5">
            Paste the cryptographic fingerprint from your receipt to confirm
            your vote is recorded in the ledger and was never altered.
          </p>

          {/* Hash input */}
          <div className="mt-5">
            <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
              Vote fingerprint (hash)
            </label>
            <textarea
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Paste your vote hash here…"
              rows={3}
              className="w-full font-mono text-[11px] leading-4 text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-3 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 resize-none break-all transition-all"
            />
            <p className="text-[11px] leading-4 text-slate-400 mt-1.5">
              It's the long code under “Cryptographic proof” on your receipt.
            </p>
          </div>

          <button
            onClick={() => check()}
            disabled={!hash.trim() || loading}
            title="Check this hash against the vote ledger"
            className="w-full mt-4 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <VBLoader size="sm" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                {result ? "Verify again" : "Verify"}
              </>
            )}
          </button>

          {error && (
            <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-3">
              {error}
            </p>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="mt-4">
              {result.found ? (
                <div
                  className={`rounded-xl p-4 border ${
                    result.chainIntact
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <p
                    className={`flex items-center gap-2 text-sm font-semibold mb-3 ${
                      result.chainIntact ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.chainIntact ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Vote verified
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" /> Tampering
                        detected
                      </>
                    )}
                  </p>
                  <Row label="Election" value={result.electionName} />
                  <Row label="Position" value={result.position} />
                  <Row label="Recorded as vote #" value={result.sequence} mono />
                  <Row
                    label="Recorded at"
                    value={new Date(result.recordedAt).toLocaleString()}
                    mono
                  />
                  <Row
                    label="Chain status"
                    value={
                      result.chainIntact ? (
                        <span className="text-green-600">
                          ✓ Intact ({result.chainLength} votes)
                        </span>
                      ) : (
                        <span className="text-red-600">✗ Broken</span>
                      )
                    }
                  />
                  <p className="text-[11px] leading-4 text-slate-600 mt-3 pt-3 border-t border-slate-900/5">
                    Your vote exists in the ledger at position{" "}
                    {result.sequence}, and the entire chain{" "}
                    {result.chainIntact
                      ? "verifies cleanly — no vote has been altered."
                      : "does not verify cleanly — one or more votes show signs of alteration. Contact your election commission immediately."}
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-1.5">
                    <SearchX className="w-4 h-4" /> Not found in the ledger
                  </p>
                  <p className="text-xs leading-[18px] text-slate-600">
                    This hash isn't in the ledger. The most common cause is a
                    missing character — check that you pasted it exactly as it
                    appears on your receipt, then try again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Foot link */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="min-h-[44px] px-3 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
          >
            ← Virtual Ballot Home
          </button>
        </div>
      </div>
    </AuthBackground>
  );
}
