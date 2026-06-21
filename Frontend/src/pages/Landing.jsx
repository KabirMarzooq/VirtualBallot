import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  BarChart3,
  Users,
  Clock,
  ArrowRight,
  CheckCircle,
  Building2,
  Lock,
  Globe,
  Wallet,
  Telescope,
  Radio,
  Scale,
  Sparkles,
  MessageCircleQuestion,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Tamper-proof voting",
    desc: "Every ballot is cryptographically secured. Each voter gets a unique receipt ID they can verify independently.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Live results",
    desc: "Watch votes come in as they happen. Broadcast results the moment you're ready — or keep them hidden until the election ends.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: Users,
    title: "Built for organizations",
    desc: "Upload your voter roster via CSV, add candidates with manifestos, and brand the platform with your logo and name.",
    color: "bg-teal-100 text-teal-600",
  },
  {
    icon: Clock,
    title: "Run in minutes",
    desc: "Register your organization, upload your roster, add candidates, set a timer. Your election is live — no IT team required.",
    color: "bg-amber-100 text-amber-600",
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

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-40 px-6 py-4 bg-transparent backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5 font-bold">
            <div className="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-blue-500/30">
              VB
            </div>
            <span className="text-white text-lg">Virtual Ballot</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/login")}
              className="text-slate-400 hover:text-white text-sm font-bold transition-colors px-4 py-2 cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/org/register")}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure · Transparent · Verifiable
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Run secure elections
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              for any organization
            </span>
          </h1>

          <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Virtual Ballot gives your organization a dedicated, branded voting
            platform. Upload your roster, add candidates, share a link — done.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/org/register")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 group transition-all shadow-xl shadow-blue-500/20 cursor-pointer"
            >
              Register your organization
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/admin/login")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-8 py-4 rounded-2xl transition-colors cursor-pointer"
            >
              Sign in to dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Everything your election needs
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Designed specifically for student unions, professional
              associations, and community organizations.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-6 hover:border-slate-600 transition-colors"
              >
                <div
                  className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Election Types ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Pick the format that fits your election
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              One platform, two ways to vote — switch per election, never locked
              in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Closed */}
            <div className="relative bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-12 h-12 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-5">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-xl mb-2">Closed</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
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
                      className="flex items-center gap-2.5 text-sm text-slate-300"
                    >
                      <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Open */}
            <div className="relative bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center">
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2.5 py-1 rounded-full">
                    <Wallet className="w-3 h-3" /> Paid voting available
                  </span>
                </div>
                <h3 className="font-black text-white text-xl mb-2">Open</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  No roster required — share one public link. Perfect for
                  pageants, public polls, and fan-driven contests. Optionally
                  let voters pay per vote, with earnings settled straight to
                  your bank account.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Public link, anyone can vote",
                    "Device or email fraud protection",
                    "Buy votes in bundles, paid via Paystack",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-center gap-2.5 text-sm text-slate-300"
                    >
                      <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for Trust ── */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Results no one can dispute
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every election needs more than a tally — it needs witnesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-7">
              <div className="w-11 h-11 bg-teal-500/15 text-teal-400 rounded-2xl flex items-center justify-center mb-4">
                <Telescope className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white mb-2">Observer access</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hand scrutineers a read-only PIN. They watch the live tally,
                vote ledger, and audit stream in real time — no ability to
                change anything, full visibility into everything.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-7">
              <div className="w-11 h-11 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white mb-2">
                Live, or on your terms
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Broadcast results as votes land, or keep the count private until
                you publish it yourself. You decide when the public sees
                anything.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-7">
              <div className="w-11 h-11 bg-indigo-500/15 text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white mb-2">
                Honest tie handling
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                A genuine tie is shown as a tie — joint leaders, clearly flagged
                — never silently broken by the system. The call stays with your
                commission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Assistant — coming soon ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-indigo-600/15 to-blue-600/10 border border-indigo-500/20 rounded-[2.5rem] p-10 sm:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-8">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-300 rounded-2xl flex items-center justify-center shrink-0">
                <MessageCircleQuestion className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 bg-indigo-900/30 border border-indigo-700/40 px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" /> Coming soon
                </span>
                <h3 className="font-black text-white text-2xl mb-2">
                  An assistant for every role
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                  A built-in guide that answers questions as you go — whether
                  you're an admin setting up your first paid election, a voter
                  unsure how to verify your email, or an observer learning what
                  you can and can't see. Ask in plain language, get a straight
                  answer, no support ticket required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Up and running in minutes
            </h2>
            <p className="text-slate-400 text-lg">
              No technical setup. No IT department. Just a browser.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="relative">
                <div className="text-6xl font-black text-slate-800 mb-3 leading-none">
                  {n}
                </div>
                <h3 className="font-black text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-[2.5rem] p-12">
            <Building2 className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-4">
              Ready to run your election?
            </h2>
            <p className="text-slate-400 mb-8">
              Register your organization in under two minutes. Your branded
              voting page will be live immediately.
            </p>
            <button
              onClick={() => navigate("/org/register")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl inline-flex items-center gap-2 group transition-all cursor-pointer"
            >
              Get started for free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-500">
            <div className="bg-slate-800 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">
              VB
            </div>
            Virtual Ballot
          </div>
          <p>Built for transparent, secure elections.</p>
          <p>
            Built By{" "}
            <a
              href="https://github.com/KabirMarzooq"
              target="_blank"
              className="text-blue-600"
            >
              MaZq
            </a>
            &
            <a
              href="https://github.com/Muyiez101"
              target="_blank"
              className="text-blue-600"
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
