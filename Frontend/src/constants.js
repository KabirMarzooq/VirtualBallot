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

export const EVENT_META = {
    vote: { label: "Vote", dot: "bg-green-500", badge: "bg-green-900/40 text-green-300 border border-green-700/40" },
    admin: { label: "Admin", dot: "bg-blue-500", badge: "bg-blue-900/40 text-blue-300 border border-blue-700/40" },
    system: { label: "System", dot: "bg-purple-500", badge: "bg-purple-900/40 text-purple-300 border border-purple-700/40" },
    warning: { label: "Warning", dot: "bg-amber-500", badge: "bg-amber-900/40 text-amber-300 border border-amber-700/40" },
    registry: { label: "Registry", dot: "bg-teal-500", badge: "bg-teal-900/40 text-teal-300 border border-teal-700/40" },
    candidate: { label: "Candidate", dot: "bg-indigo-500", badge: "bg-indigo-900/40 text-indigo-300 border border-indigo-700/40" },
    error: { label: "Error", dot: "bg-red-500", badge: "bg-red-900/40 text-red-300 border border-red-700/40" },
}

export const getMeta = (t) => EVENT_META[t] ?? EVENT_META.system

// ─── Admin Tabs ───────────────────────────────────────────────────────────────

export const CANDIDATE_COLORS = [
    "from-blue-400 to-blue-600",
    "from-indigo-400 to-indigo-600",
    "from-teal-400 to-teal-600",
    "from-orange-400 to-orange-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
]

export const ACCENT_MAP = {
    "from-blue-400 to-blue-600": { bg: "bg-blue-600", ring: "ring-blue-500/30", btn: "bg-blue-600 hover:bg-blue-700", light: "bg-blue-50 border-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
    "from-indigo-400 to-indigo-600": { bg: "bg-indigo-600", ring: "ring-indigo-500/30", btn: "bg-indigo-600 hover:bg-indigo-700", light: "bg-indigo-50 border-indigo-100", text: "text-indigo-700", bar: "bg-indigo-500" },
    "from-teal-400 to-teal-600": { bg: "bg-teal-600", ring: "ring-teal-500/30", btn: "bg-teal-600 hover:bg-teal-700", light: "bg-teal-50 border-teal-100", text: "text-teal-700", bar: "bg-teal-500" },
    "from-orange-400 to-orange-600": { bg: "bg-orange-600", ring: "ring-orange-500/30", btn: "bg-orange-600 hover:bg-orange-700", light: "bg-orange-50 border-orange-100", text: "text-orange-700", bar: "bg-orange-500" },
    "from-purple-400 to-purple-600": { bg: "bg-purple-600", ring: "ring-purple-500/30", btn: "bg-purple-600 hover:bg-purple-700", light: "bg-purple-50 border-purple-100", text: "text-purple-700", bar: "bg-purple-500" },
    "from-pink-400 to-pink-600": { bg: "bg-pink-600", ring: "ring-pink-500/30", btn: "bg-pink-600 hover:bg-pink-700", light: "bg-pink-50 border-pink-100", text: "text-pink-700", bar: "bg-pink-500" },
}