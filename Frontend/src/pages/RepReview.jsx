import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ArrowRight,
  Flag,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import VBLoader from "../components/ui/VBLoader";
import {
  lookupReviewCode,
  submitRepReview,
  submitRepApproval,
  submitRepFlag,
} from "../api";

export default function RepReviewPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [approval, setApproval] = useState(null);
  const [voters, setVoters] = useState([]);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  // matric → reason for entries this reviewer has flagged during the session
  const [flags, setFlags] = useState({});
  const [flaggingMatric, setFlaggingMatric] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagBusy, setFlagBusy] = useState(false);

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const listRef = useRef(null);

  const hasFlags = Object.keys(flags).length > 0;

  // ── Step 1: look up the code → load the voter list ──────────────────────────
  const handleReview = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError("");
    try {
      const { slug: foundSlug } = await lookupReviewCode(clean);
      const data = await submitRepReview(clean, foundSlug);
      setSlug(foundSlug);
      setApproval(data.approval);
      setVoters(data.voters);
      setAlreadyApproved(data.alreadyApproved);
      setStep(2);
    } catch (_) {
      setError("Invalid or expired review code");
    } finally {
      setLoading(false);
    }
  };

  // If the voter list is too short to scroll, unlock the approve button.
  useEffect(() => {
    if (step !== 2) return;
    const el = listRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 20) {
      setScrolledToBottom(true);
    }
  }, [step, voters]);

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) setScrolledToBottom(true);
  };

  // ── Flag a specific voter entry ─────────────────────────────────────────────
  const submitFlag = async (matric) => {
    if (!flagReason.trim()) return;
    setFlagBusy(true);
    try {
      await submitRepFlag(code.trim().toUpperCase(), matric, flagReason.trim(), slug);
      setFlags((prev) => ({ ...prev, [matric]: flagReason.trim() }));
      setFlaggingMatric(null);
      setFlagReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setFlagBusy(false);
    }
  };

  // ── Step 2 → 3: record the approval ─────────────────────────────────────────
  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await submitRepApproval(code.trim().toUpperCase(), slug);
      setConfirmation({
        reviewerName: data.reviewerName,
        approvedAt: data.approvedAt,
      });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveDisabled =
    loading || alreadyApproved || hasFlags || !scrolledToBottom;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 sm:p-10">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Roster Review Portal</h1>
            <p className="text-slate-400 text-sm mt-1">
              Committee members only
            </p>
          </div>

          {/* ── Step 1: code entry ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                  Review Code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && code && handleReview()}
                  maxLength={6}
                  autoFocus
                  placeholder="XK4M9P"
                  className={`w-full bg-slate-800 text-white text-center text-2xl font-mono tracking-[0.4em] py-5 rounded-2xl border-2 outline-none transition-all placeholder:text-slate-700 ${
                    error
                      ? "border-red-500 text-red-400"
                      : "border-slate-700 focus:border-blue-500"
                  }`}
                />
                {error && (
                  <p className="text-red-400 text-xs font-bold text-center mt-2">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleReview}
                disabled={!code.trim() || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 group transition-colors cursor-pointer"
              >
                {loading ? (
                  <VBLoader size="sm" />
                ) : (
                  <>
                    Review Voter List
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 2: voter list review ──────────────────────────────────── */}
          {step === 2 && approval && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em]">
                  Reviewing as
                </p>
                <p className="text-lg font-black text-white">
                  {approval.reviewerName}
                </p>
              </div>

              {alreadyApproved && (
                <div className="flex items-center gap-3 p-4 bg-blue-900/30 border border-blue-700/40 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <p className="text-sm font-bold text-blue-300">
                    You approved this voter list on{" "}
                    {approval.approvedAt
                      ? new Date(approval.approvedAt).toLocaleString()
                      : "record"}
                    .
                  </p>
                </div>
              )}

              {/* Voter table */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">Matric</span>
                  <span className="col-span-5">Name</span>
                  <span className="col-span-2"></span>
                </div>
                <div
                  ref={listRef}
                  onScroll={handleScroll}
                  className="max-h-80 overflow-y-auto"
                >
                  {voters.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-10">
                      No voters on the roster yet.
                    </p>
                  ) : (
                    voters.map((v, i) => {
                      const flaggedReason = flags[v.matric];
                      return (
                        <div
                          key={v.matric}
                          className={`px-4 py-2.5 border-b border-slate-700/30 last:border-0 ${
                            flaggedReason ? "bg-slate-900/60" : ""
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-1 text-xs text-slate-600 font-mono">
                              {i + 1}
                            </span>
                            <span className="col-span-4 font-mono text-sm text-slate-300 truncate">
                              {v.matric}
                            </span>
                            <span className="col-span-5 text-sm font-bold text-white truncate">
                              {v.name}
                            </span>
                            <div className="col-span-2 flex justify-end">
                              {flaggedReason ? (
                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                  <Flag className="w-3 h-3" /> Flagged
                                </span>
                              ) : (
                                !alreadyApproved && (
                                  <button
                                    onClick={() => {
                                      setFlaggingMatric(v.matric);
                                      setFlagReason("");
                                    }}
                                    className="text-[11px] font-bold text-slate-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Flag className="w-3 h-3" /> Flag
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {flaggedReason && (
                            <p className="text-xs text-amber-300 mt-1 ml-[8.333%]">
                              Reason: {flaggedReason}
                            </p>
                          )}

                          {flaggingMatric === v.matric && (
                            <div className="mt-2 flex gap-2">
                              <input
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && submitFlag(v.matric)
                                }
                                placeholder="Reason (e.g. Not a registered student)"
                                autoFocus
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 placeholder:text-slate-600"
                              />
                              <button
                                onClick={() => submitFlag(v.matric)}
                                disabled={!flagReason.trim() || flagBusy}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Flag
                              </button>
                              <button
                                onClick={() => {
                                  setFlaggingMatric(null);
                                  setFlagReason("");
                                }}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="px-4 py-2 border-t border-slate-700 text-[11px] text-slate-600">
                  {voters.length} voters — scroll to the bottom to enable approval
                </div>
              </div>

              {error && (
                <p className="text-sm font-bold text-red-400 text-center">
                  {error}
                </p>
              )}

              {hasFlags && !alreadyApproved && (
                <p className="text-xs font-bold text-amber-400 text-center">
                  Resolve your flagged entries or remove your flags before
                  approving — the admin has been notified.
                </p>
              )}

              {!alreadyApproved && (
                <button
                  onClick={handleApprove}
                  disabled={approveDisabled}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {loading ? (
                    <VBLoader size="sm" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" /> I approve this voter list
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── Step 3: confirmation ───────────────────────────────────────── */}
          {step === 3 && confirmation && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-11 h-11 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Approval recorded</h2>
              <p className="text-sm text-slate-300">
                You approved the voter list as{" "}
                <span className="font-bold text-white">
                  {confirmation.reviewerName}
                </span>{" "}
                on{" "}
                {confirmation.approvedAt
                  ? new Date(confirmation.approvedAt).toLocaleString()
                  : "record"}
                .
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your approval has been recorded. The electoral commission has been
                notified.
              </p>
            </div>
          )}
        </div>

        <p className="text-center mt-3">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="text-slate-600 hover:text-slate-400 text-xs font-bold mx-auto transition-colors cursor-pointer"
          >
            ← Virtual Ballot Home
          </button>
        </p>
      </div>
    </div>
  );
}
