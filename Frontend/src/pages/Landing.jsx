import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  BarChart3,
  Users,
  Clock,
  ArrowRight,
  Check,
  Building2,
  Lock,
  Globe,
  Telescope,
  Radio,
  Scale,
  Sparkles,
  MessageCircleQuestion,
} from "lucide-react";
// Reuses the auth pages' ring animation for the hero motif
import "../styles/auth-background.css";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Tamper-proof voting",
    desc: "Every ballot is cryptographically secured. Each voter gets a unique receipt ID they can verify independently.",
  },
  {
    icon: BarChart3,
    title: "Live results",
    desc: "Watch votes come in as they happen. Broadcast results the moment you're ready — or keep them hidden until the election ends.",
  },
  {
    icon: Users,
    title: "Built for organizations",
    desc: "Upload your voter roster via CSV, add candidates with manifestos, and brand the platform with your logo and name.",
  },
  {
    icon: Clock,
    title: "Run in minutes",
    desc: "Register your organization, upload your roster, add candidates, set a timer. Your election is live — no IT team required.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Register your org",
    desc: "Create your organization account and get your unique voting URL.",
  },
  {
    n: "02",
    title: "Set up your election",
    desc: "Add candidates, upload your voter roster, and brand the interface.",
  },
  {
    n: "03",
    title: "Share and vote",
    desc: "Send voters your URL. They check eligibility, get an OTP, and vote securely.",
  },
  {
    n: "04",
    title: "See the results",
    desc: "Broadcast live results or reveal them when voting closes. Download official PDFs.",
  },
];

const dotGrid = (size = "28px") => ({
  backgroundImage: "radial-gradient(circle, #BFDBFE 1px, transparent 1px)",
  backgroundSize: `${size} ${size}`,
});

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-40 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-[13px] font-bold">
              VB
            </div>
            Virtual Ballot
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/login")}
              title="Sign in to the commission portal"
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] px-4 rounded-lg transition-all cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/org/register")}
              title="Register your organization"
              className="text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 min-h-[40px] px-[18px] rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={dotGrid()}
        />
        <div
          className="absolute w-[640px] h-[640px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #EFF6FF 0%, transparent 70%)",
          }}
        />
        <span
          className="auth-ring"
          style={{ width: 300, height: 300 }}
          aria-hidden="true"
        />
        <span
          className="auth-ring"
          style={{ width: 520, height: 520, animationDelay: "1.3s" }}
          aria-hidden="true"
        />
        <span
          className="auth-ring"
          style={{ width: 740, height: 740, animationDelay: "2.6s" }}
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-3.5 py-1.5 rounded-full mb-6 uppercase tracking-[0.1em]">
            <ShieldCheck className="w-3 h-3" strokeWidth={2.4} />
            Secure · Transparent · Verifiable
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-extrabold leading-[1.08] tracking-tight text-slate-900 mb-5">
            Run secure elections
            <br />
            <span className="text-blue-600">for any organization</span>
          </h1>

          <p className="text-slate-600 text-lg leading-7 max-w-xl mx-auto mb-8">
            Virtual Ballot gives your organization a dedicated, branded voting
            platform. Upload your roster, add candidates, share a link — done.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/org/register")}
              title="Register your organization"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm min-h-[52px] px-7 rounded-xl shadow-sm flex items-center justify-center gap-2 group transition-all cursor-pointer"
            >
              Register your organization
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/admin/login")}
              title="Sign in to the commission portal"
              className="bg-white border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 font-semibold text-sm min-h-[52px] px-7 rounded-xl transition-all cursor-pointer"
            >
              Sign in to dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[28px] leading-9 font-bold tracking-tight text-slate-900 mb-2">
              Everything your election needs
            </h2>
            <p className="text-sm leading-[22px] text-slate-600">
              Designed specifically for student unions, professional
              associations, and community organizations.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">
                  {title}
                </h3>
                <p className="text-[13px] leading-5 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Election Types ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[28px] leading-9 font-bold tracking-tight text-slate-900 mb-2">
              Pick the format that fits your election
            </h2>
            <p className="text-sm leading-[22px] text-slate-600">
              One platform, two ways to vote — switch per election, never
              locked in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Closed */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 mb-2">
                Closed
              </h3>
              <p className="text-[13px] leading-5 text-slate-600 mb-5">
                Upload a voter roster. Each person verifies by email OTP and
                gets exactly one ballot. Built for student unions, staff
                elections, and member votes where eligibility matters.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Matric / ID roster upload",
                  "One-time email verification",
                  "Per-voter audit trail",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 text-[13px] text-slate-800"
                  >
                    <Check
                      className="w-4 h-4 text-blue-600 shrink-0"
                      strokeWidth={2.4}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Open */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  ₦ Paid voting available
                </span>
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 mb-2">
                Open
              </h3>
              <p className="text-[13px] leading-5 text-slate-600 mb-5">
                No roster required — share one public link. Perfect for
                pageants, public polls, and fan-driven contests. Optionally let
                voters pay per vote, with earnings settled straight to your
                bank account.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Public link, anyone can vote",
                  "Device or email fraud protection",
                  "Buy votes in bundles, paid via Paystack",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 text-[13px] text-slate-800"
                  >
                    <Check
                      className="w-4 h-4 text-blue-600 shrink-0"
                      strokeWidth={2.4}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for Trust ── */}
      <section className="py-20 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[28px] leading-9 font-bold tracking-tight text-slate-900 mb-2">
              Results no one can dispute
            </h2>
            <p className="text-sm leading-[22px] text-slate-600">
              Every election needs more than a tally — it needs witnesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Telescope className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">
                Observer access
              </h3>
              <p className="text-[13px] leading-5 text-slate-600">
                Hand scrutineers a read-only PIN. They watch the live tally,
                vote ledger, and audit stream in real time — no ability to
                change anything, full visibility into everything.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">
                Live, or on your terms
              </h3>
              <p className="text-[13px] leading-5 text-slate-600">
                Broadcast results as votes land, or keep the count private
                until you publish it yourself. You decide when the public sees
                anything.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-200 hover:shadow-md transition-all">
              {/* Amber on purpose — ties render amber in the product itself */}
              <div className="w-11 h-11 bg-amber-50 text-amber-800 rounded-xl flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">
                Honest tie handling
              </h3>
              <p className="text-[13px] leading-5 text-slate-600">
                A genuine tie is shown as a tie — joint leaders, clearly
                flagged — never silently broken by the system. The call stays
                with your commission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Assistant — coming soon ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 sm:p-9 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <MessageCircleQuestion className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-full mb-2.5 uppercase tracking-[0.1em]">
                <Sparkles className="w-3 h-3" /> Coming soon
              </span>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                An assistant for every role
              </h3>
              <p className="text-[13px] leading-5 text-slate-600 max-w-xl">
                A built-in guide that answers questions as you go — whether
                you're an admin setting up your first paid election, a voter
                unsure how to verify your email, or an observer learning what
                you can and can't see. Ask in plain language, get a straight
                answer, no support ticket required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[28px] leading-9 font-bold tracking-tight text-slate-900 mb-2">
              Up and running in minutes
            </h2>
            <p className="text-sm leading-[22px] text-slate-600">
              No technical setup. No IT department. Just a browser.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n}>
                <div className="font-mono text-[40px] leading-none font-semibold text-blue-100 mb-3">
                  {n}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                  {title}
                </h3>
                <p className="text-xs leading-[18px] text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto">
          <div className="relative bg-white border border-blue-200 rounded-2xl p-10 sm:p-12 text-center shadow-md overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={dotGrid("24px")}
            />
            <div className="relative">
              <span className="w-12 h-12 bg-blue-600 text-white rounded-xl inline-flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-4 mb-2">
                Ready to run your election?
              </h2>
              <p className="text-[13px] leading-5 text-slate-600 mb-6">
                Register your organization in under two minutes. Your branded
                voting page will be live immediately.
              </p>
              <button
                onClick={() => navigate("/org/register")}
                title="Register your organization"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm min-h-[48px] px-6 rounded-xl shadow-sm inline-flex items-center gap-2 group transition-all cursor-pointer"
              >
                Get started for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-6 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-600">
              VB
            </div>
            Virtual Ballot
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              Privacy
            </button>
          </div>
          <p>
            Built by{" "}
            <a
              href="https://github.com/KabirMarzooq"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-semibold"
            >
              MaZq
            </a>{" "}
            &{" "}
            <a
              href="https://github.com/Muyiez101"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-semibold"
            >
              Muiz
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
