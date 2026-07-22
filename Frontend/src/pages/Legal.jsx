import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ScrollText, ArrowLeft } from "lucide-react";

const EFFECTIVE = "22 July 2026";
const CONTACT = "support@virtualballot.app";
const PRIVACY_CONTACT = "support@virtualballot.app";

// ── Terms of Use ──────────────────────────────────────────────────────────────
const TERMS = {
  title: "Terms of Use",
  icon: ScrollText,
  intro:
    "These Terms of Use govern your access to and use of Virtual Ballot (the “Platform”), an online voting service that lets organizations run branded elections. By creating an account, uploading a voter roster, casting a ballot, or otherwise using the Platform, you agree to these Terms. If you do not agree, do not use the Platform.",
  sections: [
    {
      h: "1. Who these Terms apply to",
      p: [
        "The Platform serves several roles, and these Terms apply to all of them: organization administrators who set up and run elections; voters who cast ballots; committee reviewers who approve voter rosters; observers who monitor elections read-only; and support staff who answer voter questions.",
        "Where an organization uses the Platform to run an election, that organization is responsible for its own election and for the people it invites. Virtual Ballot provides the software; it does not administer, certify, or adjudicate any organization’s election.",
      ],
    },
    {
      h: "2. Accounts and access",
      p: [
        "Organization administrators register with an email address and password and receive a unique election URL. You are responsible for keeping your credentials, observer PINs, committee review codes, and administrative secrets confidential, and for all activity that occurs under them.",
        "You must provide accurate information and keep it current. You may not share access with unauthorized persons or attempt to access areas of the Platform you are not permitted to use.",
      ],
    },
    {
      h: "3. Organization responsibilities",
      p: [
        "If you run an election, you are solely responsible for: the accuracy and lawful sourcing of your voter roster; obtaining any consent required to process your voters’ personal data; the eligibility rules and conduct of your election; and compliance with your own constitution, bylaws, and any applicable law or regulation.",
        "You confirm that you have the authority to run the election and to upload the roster data you provide, and that doing so does not violate anyone’s rights.",
      ],
    },
    {
      h: "4. Voting and acceptable use",
      p: [
        "Voters must cast their ballot honestly and only where eligible. You agree not to: attempt to vote more than permitted; impersonate another person; interfere with, probe, or attempt to tamper with the vote record, the tamper-evident vote chain, or any other voter’s ballot; automate or manipulate voting; or disrupt the Platform’s operation.",
        "The Platform records a cryptographic fingerprint for each vote so it can be independently verified. Attempting to forge, alter, or defeat this mechanism is a serious breach of these Terms.",
      ],
    },
    {
      h: "5. Paid voting and payments",
      p: [
        "Some elections may charge per vote. Where they do, payments are processed by our third-party payment provider (Paystack) and settle to the organizing entity’s designated account. Virtual Ballot does not take a share of your vote payments; the payment provider’s processing fee is disclosed at checkout and is borne by the paying voter.",
        "Except where required by law, vote payments are non-refundable once a vote is recorded. Disputes about a paid election are between the voter and the organizing entity; Virtual Ballot is not a party to them. Fraudulent payments or chargeback abuse may result in suspension.",
      ],
    },
    {
      h: "6. Election integrity, not outcomes",
      p: [
        "The Platform provides tools for integrity — email verification, a tamper-evident vote ledger, independent vote verification, committee roster approval, and read-only observer access. These tools help make an election auditable. They do not, and cannot, guarantee any particular result, turnout, or that an organization has run its election fairly.",
        "A genuine tie is presented as a tie and is never broken automatically by the Platform; resolving it is the organizing commission’s responsibility.",
      ],
    },
    {
      h: "7. Intellectual property",
      p: [
        "The Platform, including its software, design, and branding, is owned by Virtual Ballot and protected by law. You may not copy, modify, reverse-engineer, resell, or create derivative works from the Platform except as expressly permitted. Content you upload (logos, candidate details, rosters) remains yours; you grant us a limited licence to host and display it solely to provide the service.",
      ],
    },
    {
      h: "8. Service availability and changes",
      p: [
        "We aim to keep the Platform available but do not guarantee uninterrupted or error-free operation. We may modify, suspend, or discontinue features, and we may perform maintenance that temporarily affects access. We will make reasonable efforts to avoid disruption during an active election.",
      ],
    },
    {
      h: "9. Disclaimers",
      p: [
        "The Platform is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, or non-infringement, to the fullest extent permitted by law.",
      ],
    },
    {
      h: "10. Limitation of liability",
      p: [
        "To the fullest extent permitted by law, Virtual Ballot and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, revenue, or reputation, arising from your use of the Platform. Nothing in these Terms excludes liability that cannot lawfully be excluded.",
      ],
    },
    {
      h: "11. Suspension and termination",
      p: [
        "We may suspend or terminate access — including deactivating an organization — where we reasonably believe these Terms have been breached, where required by law, or to protect the Platform or its users. Organizations may stop using the Platform at any time.",
      ],
    },
    {
      h: "12. Changes to these Terms",
      p: [
        "We may update these Terms from time to time. Material changes will be reflected by the “Last updated” date below. Continuing to use the Platform after a change means you accept the revised Terms.",
      ],
    },
    {
      h: "13. Contact",
      p: [
        `Questions about these Terms can be sent to ${CONTACT}.`,
      ],
    },
  ],
};

// ── Privacy Policy ────────────────────────────────────────────────────────────
const PRIVACY = {
  title: "Privacy Policy",
  icon: ShieldCheck,
  intro:
    "This Privacy Policy explains what personal information Virtual Ballot processes, why, and the choices you have. Virtual Ballot is designed so that elections are auditable while keeping the link between a voter and their specific choices protected. When an organization runs an election, that organization decides who is on its roster and why; Virtual Ballot processes that data on its behalf to provide the service.",
  sections: [
    {
      h: "1. Information we process",
      p: [
        "Organization accounts: the administrator’s name, email, password (stored hashed), organization name, logo, and election settings.",
        "Voters: the identifying details an organization uploads to its roster — typically a matriculation or membership number, name, and email address — plus, for those who take part, the fact and time that a ballot was cast and a receipt identifier.",
        "Votes: each ballot is recorded and linked into a tamper-evident chain via a cryptographic hash so it can be independently verified. Ballot choices are stored to produce the tally; the Platform is built to let a vote be verified as recorded without publicly revealing who a person voted for.",
        "Payments (paid elections only): the paying voter’s email and the transaction details needed to process payment through our payment provider. We do not store full card details.",
        "Support chat: messages you send to live support, so staff can help you.",
        "Technical data: session tokens (held in your browser’s session storage), and standard information such as approximate connection status, used to operate and secure the service.",
      ],
    },
    {
      h: "2. How we use information",
      p: [
        "To run elections: verifying voter eligibility, sending one-time verification codes, recording and tallying votes, issuing receipts, and enabling independent verification.",
        "To operate the Platform: authentication, security, fraud prevention, maintaining the audit log, and providing observer and committee-review functions.",
        "To process payments for paid elections and to provide live support when you request it.",
        "To maintain integrity: detecting tampering, duplicate voting, and misuse.",
      ],
    },
    {
      h: "3. Ballot confidentiality",
      p: [
        "Protecting the secrecy of the ballot is central to the design. Observers are given read-only access and see aggregate tallies, a masked vote ledger, and the audit stream — not the identities behind individual choices. Independent verification confirms that a specific vote exists in the ledger and has not been altered, without disclosing the voter’s selections to the public.",
      ],
    },
    {
      h: "4. When we share information",
      p: [
        "Payment provider: for paid elections, payment data is shared with Paystack to process transactions, under their own terms and privacy policy.",
        "Email delivery: verification codes and receipts are sent through an email delivery service.",
        "Cloud infrastructure: the Platform and its database run on third-party cloud hosting.",
        "Legal and safety: we may disclose information where required by law or to protect the Platform, its users, or the public.",
        "We do not sell personal information.",
      ],
    },
    {
      h: "5. Retention",
      p: [
        "Election data, including rosters, votes, and audit logs, is retained for the organizing entity while its account is active and past elections are stored in its history, so results remain auditable. An organization may request deletion of its data; some records may be retained where necessary to comply with law, resolve disputes, or preserve election integrity.",
      ],
    },
    {
      h: "6. Security",
      p: [
        "We use measures appropriate to the sensitivity of the data, including hashed passwords, scoped access tokens, role-based access (voter, admin, observer, committee, staff, platform), and the tamper-evident vote chain that makes undetected alteration of recorded votes evident. No system is perfectly secure, but integrity and confidentiality are primary design goals.",
      ],
    },
    {
      h: "7. Your choices and rights",
      p: [
        "Depending on your location and applicable law (such as the Nigeria Data Protection Regulation and similar frameworks), you may have rights to access, correct, delete, or restrict the processing of your personal data, and to object or withdraw consent.",
        "Because organizations control their own rosters, voters should usually raise access, correction, or deletion requests with the organization running their election; we will support that organization in responding. You can also contact us using the details below.",
      ],
    },
    {
      h: "8. Browser storage",
      p: [
        "The Platform uses your browser’s session storage to hold short-lived tokens that keep you signed in during a session and to remember the current tab. These are cleared when your session ends and are not used for advertising or cross-site tracking.",
      ],
    },
    {
      h: "9. Children",
      p: [
        "The Platform is intended for use in organizational elections and is not directed at children. Organizations are responsible for ensuring their use is appropriate for their electorate.",
      ],
    },
    {
      h: "10. Changes",
      p: [
        "We may update this Policy from time to time; the “Last updated” date below reflects the latest version. Material changes will be made available through the Platform.",
      ],
    },
    {
      h: "11. Contact",
      p: [
        `For privacy questions or to exercise your rights, contact ${PRIVACY_CONTACT}.`,
      ],
    },
  ],
};

function slugify(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function LegalPage({ doc = "terms" }) {
  const navigate = useNavigate();
  const data = doc === "privacy" ? PRIVACY : TERMS;
  const Icon = data.icon;
  const otherPath = doc === "privacy" ? "/terms" : "/privacy";
  const otherLabel = doc === "privacy" ? "Terms of Use" : "Privacy Policy";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${data.title} · Virtual Ballot`;
  }, [data.title]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top bar */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <button
            onClick={() => navigate("/")}
            title="Back to Virtual Ballot home"
            className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 cursor-pointer"
          >
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              VB
            </span>
            Virtual Ballot
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] px-3 rounded-lg transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[28px] leading-9 font-semibold text-slate-900">
              {data.title}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Last updated: {EFFECTIVE}
            </p>
          </div>
        </div>

        <p className="text-[14px] leading-6 text-slate-600 mt-6">{data.intro}</p>

        {/* Contents */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mt-6">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-3">
            Contents
          </p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {data.sections.map((s) => (
              <li key={s.h}>
                <a
                  href={`#${slugify(s.h)}`}
                  className="text-[13px] text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <div className="mt-8 space-y-7">
          {data.sections.map((s) => (
            <section key={s.h} id={slugify(s.h)} className="scroll-mt-20">
              <h2 className="text-[17px] leading-6 font-semibold text-slate-900">
                {s.h}
              </h2>
              <div className="mt-2 space-y-2.5">
                {s.p.map((para, i) => (
                  <p key={i} className="text-[14px] leading-6 text-slate-600">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[13px] text-slate-500">
            See also our{" "}
            <button
              onClick={() => navigate(otherPath)}
              className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"
            >
              {otherLabel}
            </button>
            .
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
