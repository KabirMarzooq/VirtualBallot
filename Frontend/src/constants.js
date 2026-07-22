// ─── Initial Data ─────────────────────────────────────────────────────────────

export const OBSERVER_PIN = "5566"
export const ADMIN_PIN = "9988"
export const OTP_CODE = "1234"

export const INITIAL_CANDIDATES = [
    {
        id: 1, name: "Sarah Adebayo", position: "President", votes: 0,
        color: "from-blue-400 to-blue-600",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        manifesto: "I will champion student welfare, improve campus infrastructure, and create direct communication channels between students and administration. My three pillars: access, accountability, and action.",
    },
    {
        id: 2, name: "Michael Okon", position: "President", votes: 0,
        color: "from-indigo-400 to-indigo-600",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
        manifesto: "A transparent, student-first leadership. I will digitise all student services, establish a 24-hour welfare hotline, and publish a monthly report on how student funds are spent.",
    },
    {
        id: 3, name: "Chioma Nwachukwu", position: "Gen. Secretary", votes: 0,
        color: "from-teal-400 to-teal-600",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma",
        manifesto: "Accurate records, open communication, and efficient administration. I will modernise our documentation systems, ensure every student voice is recorded, and publish all meeting minutes within 48 hours.",
    },
    {
        id: 4, name: "David Ibrahim", position: "Gen. Secretary", votes: 0,
        color: "from-orange-400 to-orange-600",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        manifesto: "Organisation and integrity. I will implement a digital filing system, create a central notice board for student communications, and ensure no decision is made without proper documentation and consent.",
    },
]

export const INITIAL_USERS = [
    { matric: "ADMIN", name: "System Admin", hasVoted: false, email: "admin@vb.edu.ng", role: "ADMIN", votedAt: null },
]

export const INITIAL_ELECTION_CONFIG = {
    status: "NOT_STARTED",   // NOT_STARTED | ACTIVE | ENDED
    isPublished: false,
    registryLocked: false,
    endTime: null,
    showCountdown: false,
}

export const INITIAL_BRANDING = {
    electionName: "",
    institutionName: "",
    logoUrl: "",
}

// ─── Event Metadata ───────────────────────────────────────────────────────────

// `badge` styles the dark (legacy) surfaces, `lightBadge` the new light UI.
// Drop `badge` once every consumer is on the light design system.
export const EVENT_META = {
    vote: { label: "Vote", dot: "bg-green-500", badge: "bg-green-900/40 text-green-300 border border-green-700/40", lightBadge: "bg-green-50 text-green-700" },
    admin: { label: "Admin", dot: "bg-blue-500", badge: "bg-blue-900/40 text-blue-300 border border-blue-700/40", lightBadge: "bg-blue-50 text-blue-700" },
    system: { label: "System", dot: "bg-purple-500", badge: "bg-purple-900/40 text-purple-300 border border-purple-700/40", lightBadge: "bg-purple-50 text-purple-700" },
    warning: { label: "Warning", dot: "bg-amber-500", badge: "bg-amber-900/40 text-amber-300 border border-amber-700/40", lightBadge: "bg-amber-50 text-amber-800" },
    registry: { label: "Registry", dot: "bg-teal-500", badge: "bg-teal-900/40 text-teal-300 border border-teal-700/40", lightBadge: "bg-teal-50 text-teal-700" },
    candidate: { label: "Candidate", dot: "bg-indigo-500", badge: "bg-indigo-900/40 text-indigo-300 border border-indigo-700/40", lightBadge: "bg-indigo-50 text-indigo-700" },
    error: { label: "Error", dot: "bg-red-500", badge: "bg-red-900/40 text-red-300 border border-red-700/40", lightBadge: "bg-red-50 text-red-700" },
}

export const getMeta = (t) => EVENT_META[t] ?? EVENT_META.system

