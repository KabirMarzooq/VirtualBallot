import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Flag, ShieldCheck } from "lucide-react";
import AuthBackground from "../components/layout/AuthBackground";
import VBLoader from "../components/ui/VBLoader";
import MobileNoticeBanner from "../components/ui/MobileNoticeBanner";
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
  // Presentational only: estimated rows the reviewer has had on screen
  const [seenCount, setSeenCount] = useState(0);
  const [confirmation, setConfirmation] = useState(null);

  const listRef = useRef(null);

  const hasFlags = Object.keys(flags).length > 0;
  const flagCount = Object.keys(flags).length;

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
    } catch {
      setError("Invalid or expired review code — check the invite you received.");
    } finally {
      setLoading(false);
    }
  };

  // If the voter list is too short to scroll, unlock the approve button.
  useEffect(() => {
    if (step !== 2) return;
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 20) {
      setScrolledToBottom(true);
      setSeenCount(voters.length);
    } else if (voters.length > 0) {
      // Initial estimate of rows visible before any scrolling
      setSeenCount(
        Math.min(
          voters.length,
          Math.ceil((el.clientHeight / el.scrollHeight) * voters.length)
        )
      );
    }
  }, [step, voters]);

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) setScrolledToBottom(true);
    if (voters.length > 0) {
      const est = Math.min(
        voters.length,
        Math.ceil(((scrollTop + clientHeight) / scrollHeight) * voters.length)
      );
      setSeenCount((prev) => Math.max(prev, est));
    }
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

  // Why the approve button is disabled, in words (UX rule: no silent disables)
  const gateReasons = [];
  if (hasFlags)
    gateReasons.push(
      `you have ${flagCount} flagged entr${
        flagCount === 1 ? "y" : "ies"
      } — the commission must resolve ${flagCount === 1 ? "it" : "them"} first`
    );
  if (!scrolledToBottom)
    gateReasons.push("scroll through the full list to confirm you've seen it");
  const gateHint =
    gateReasons.length > 0
      ? `Before you can approve: ${gateReasons.join("; ")}.`
      : "Approving records your name and a timestamp for the commission.";

  return (
    <AuthBackground>
      <div
        className={`w-full text-slate-800 ${
          step === 2 ? "max-w-[540px]" : "max-w-[400px]"
        }`}
      >
        <MobileNoticeBanner message="The roster review portal is built for larger displays — for the best experience, switch to a laptop or desktop." />

        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-7 sm:p-8">
          {/* ── Step 1: code entry ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="text-[22px] leading-7 font-semibold text-slate-900 text-center mt-4">
                Roster Review Portal
              </h1>
              <p className="text-[13px] leading-5 text-slate-600 text-center mt-1">
                Committee members only
              </p>

              <div className="mt-5">
                <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
                  Review code
                </label>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && code && handleReview()}
                  maxLength={6}
                  autoFocus
                  placeholder="XK4M9P"
                  className={`w-full min-h-[56px] font-mono text-2xl font-semibold text-center tracking-[0.4em] indent-[0.4em] bg-white border rounded-xl outline-none transition-all placeholder:text-slate-300 ${
                    error
                      ? "border-red-500 text-red-600"
                      : "border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100"
                  }`}
                />
                {error && (
                  <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-2">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleReview}
                disabled={!code.trim() || loading}
                title="Open the voter list for review"
                className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <VBLoader size="sm" /> : <>Review voter list →</>}
              </button>
              <p className="text-[11px] leading-4 text-slate-400 text-center mt-2">
                Your commission sent you a personal 6-character code with the
                invite.
              </p>
            </>
          )}

          {/* ── Step 2: voter list review ──────────────────────────────────── */}
          {step === 2 && approval && (
            <>
              <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="text-center mt-3">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.15em]">
                  Reviewing as
                </p>
                <p className="text-base leading-6 font-semibold text-slate-900 mt-0.5">
                  {approval.reviewerName}
                </p>
              </div>

              {alreadyApproved && (
                <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mt-4">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-xs leading-4 font-medium text-slate-800">
                    You approved this voter list on{" "}
                    {approval.approvedAt
                      ? new Date(approval.approvedAt).toLocaleString()
                      : "record"}
                    . The list below is read-only.
                  </p>
                </div>
              )}

              {/* Voter table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-3">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] bg-slate-50 border-b border-slate-100">
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
                    <p className="text-[13px] text-slate-600 text-center py-10">
                      No voters on the roster yet.
                    </p>
                  ) : (
                    voters.map((v, i) => {
                      const flaggedReason = flags[v.matric];
                      const isFlagging = flaggingMatric === v.matric;
                      return (
                        <div
                          key={v.matric}
                          className={`px-4 py-2.5 border-b border-slate-100 last:border-0 ${
                            flaggedReason ? "bg-amber-50" : ""
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-1 font-mono text-[11px] text-slate-400">
                              {i + 1}
                            </span>
                            <span className="col-span-4 font-mono text-xs text-slate-800 truncate">
                              {v.matric}
                            </span>
                            <span className="col-span-5 text-[13px] font-semibold text-slate-900 truncate">
                              {v.name}
                            </span>
                            <div className="col-span-2 flex justify-end">
                              {flaggedReason ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                                  <Flag className="w-2.5 h-2.5" /> Flagged
                                </span>
                              ) : (
                                !alreadyApproved &&
                                (isFlagging ? (
                                  <button
                                    onClick={() => {
                                      setFlaggingMatric(null);
                                      setFlagReason("");
                                    }}
                                    title="Cancel flagging this entry"
                                    className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded-md transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setFlaggingMatric(v.matric);
                                      setFlagReason("");
                                    }}
                                    title={`Flag ${v.matric} for the commission`}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md transition-all cursor-pointer"
                                  >
                                    <Flag className="w-3 h-3" /> Flag
                                  </button>
                                ))
                              )}
                            </div>
                          </div>

                          {flaggedReason && (
                            <p className="text-[11px] leading-4 text-amber-800 mt-1.5 pl-[12%]">
                              Reason: {flaggedReason}
                            </p>
                          )}

                          {isFlagging && (
                            <div className="flex gap-2 mt-2">
                              <input
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && submitFlag(v.matric)
                                }
                                placeholder="Reason (e.g. not a registered student)"
                                autoFocus
                                className="flex-1 min-h-[36px] text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-3 outline-none placeholder:text-slate-400 focus:border-amber-600 focus:ring-[3px] focus:ring-amber-50 transition-all"
                              />
                              <button
                                onClick={() => submitFlag(v.matric)}
                                disabled={!flagReason.trim() || flagBusy}
                                title="Send this flag to the commission"
                                className="text-xs font-semibold min-h-[36px] px-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                              >
                                Flag entry
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100 text-[11px] text-slate-600">
                  {voters.length} voter{voters.length !== 1 ? "s" : ""} on the
                  roster
                  {!scrolledToBottom && voters.length > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {seenCount} of {voters.length} seen — keep scrolling
                    </span>
                  )}
                  {scrolledToBottom && voters.length > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      ✓ Full list seen
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-[11px] leading-4 font-medium text-red-600 text-center mt-3">
                  {error}
                </p>
              )}

              {!alreadyApproved && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveDisabled}
                    title="Record your approval of this voter list"
                    className="w-full mt-4 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <VBLoader size="sm" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> I approve this voter
                        list
                      </>
                    )}
                  </button>
                  <p
                    className={`text-[11px] leading-4 text-center mt-2 ${
                      approveDisabled && !loading
                        ? "text-amber-800"
                        : "text-slate-400"
                    }`}
                  >
                    {gateHint}
                  </p>
                </>
              )}
            </>
          )}

          {/* ── Step 3: confirmation ───────────────────────────────────────── */}
          {step === 3 && confirmation && (
            <div className="text-center py-2">
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
                Approval recorded
              </h2>
              <p className="text-[13px] leading-5 text-slate-600 mt-2">
                You approved the voter list as{" "}
                <span className="font-semibold text-slate-900">
                  {confirmation.reviewerName}
                </span>{" "}
                on{" "}
                {confirmation.approvedAt
                  ? new Date(confirmation.approvedAt).toLocaleString()
                  : "record"}
                .
              </p>
              <p className="text-[11px] leading-4 text-slate-400 mt-3 max-w-[340px] mx-auto">
                The electoral commission has been notified. You can close this
                page — your part is done.
              </p>
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
