import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ShieldX,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { verifyVoteHash } from "../api";

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Verify Your Vote</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            Paste the cryptographic fingerprint from your receipt to confirm
            your vote is recorded in the ledger and was never altered.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Vote fingerprint (hash)
          </label>
          <textarea
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Paste your vote hash here…"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-green-500 resize-none break-all"
          />
          <button
            onClick={() => check()}
            disabled={!hash.trim() || loading}
            className="w-full mt-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" /> Verify
              </>
            )}
          </button>

          {error && (
            <p className="text-red-400 text-sm font-bold text-center mt-4">
              {error}
            </p>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="mt-6">
              {result.found ? (
                <div className="bg-green-950/40 border border-green-700/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="font-black text-green-300">Vote Verified</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Election" value={result.electionName} />
                    <Row label="Position" value={result.position} />
                    <Row label="Recorded as vote #" value={result.sequence} />
                    <Row
                      label="Recorded at"
                      value={new Date(result.recordedAt).toLocaleString()}
                    />
                    <Row
                      label="Chain status"
                      value={
                        result.chainIntact ? (
                          <span className="text-green-400 font-bold">
                            ✓ Intact ({result.chainLength} votes)
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold">
                            ✗ Tampering detected
                          </span>
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                    Your vote exists in the ledger at position {result.sequence}
                    , and the entire chain{" "}
                    {result.chainIntact
                      ? "verifies cleanly — no vote has been altered."
                      : "shows signs of alteration. Contact the election commission."}
                  </p>
                </div>
              ) : (
                <div className="bg-red-950/40 border border-red-700/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <p className="font-black text-red-300">Not Found</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    This hash isn't in the ledger. Check that you pasted it
                    exactly as it appears on your receipt.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-slate-600 hover:text-slate-400 text-xs font-bold mx-auto block mt-6 cursor-pointer transition-colors"
        >
          ← Virtual Ballot Home
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-medium text-right">{value}</span>
    </div>
  );
}
