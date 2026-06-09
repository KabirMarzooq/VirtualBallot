import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppProvider } from "./context/AppContext"
import { SlugProvider } from "./context/SlugContext"

import Navbar        from "./components/layout/Navbar"
import GlobalModal   from "./components/ui/GlobalModal"

// Public / marketing
import LandingPage      from "./pages/Landing"
import OrgRegisterPage  from "./pages/OrgRegister"

// Voter flow — all scoped under /vote/:slug
import LoginPage        from "./pages/Login"
import RegisterPage     from "./pages/Register"
import OtpPage          from "./pages/OtpPage"
import BallotPage       from "./pages/Ballot"
import ReceiptPage      from "./pages/Receipt"
import ResultsPage      from "./pages/Results"

// Admin
import AdminLoginPage   from "./pages/AdminLogin"
import AdminPage        from "./pages/Admin"

// Observer
import ObserverLoginPage from "./pages/ObserverLogin"
import ObserverPage      from "./pages/Observer"

// Super admin
import SuperAdminLoginPage from "./pages/SuperAdminLogin"
import SuperAdminPage      from "./pages/SuperAdmin"

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* ── Marketing / public ─────────────────────────────────────────── */}
        <Route path="/"             element={<LandingPage />} />
        <Route path="/org/register" element={<OrgRegisterPage />} />

        {/* ── Voter flow — all scoped to an org slug ──────────────────────
            SlugProvider wraps these routes so every child can call
            useSlug() and get "nuesa", "siwes", etc. from the URL.        */}
        <Route path="/vote/:slug" element={<SlugProvider><LoginPage /></SlugProvider>} />
        <Route path="/vote/:slug/register" element={<SlugProvider><RegisterPage /></SlugProvider>} />
        <Route path="/vote/:slug/otp"      element={<SlugProvider><OtpPage /></SlugProvider>} />
        <Route path="/vote/:slug/ballot"   element={<SlugProvider><BallotPage /></SlugProvider>} />
        <Route path="/vote/:slug/receipt"  element={<SlugProvider><ReceiptPage /></SlugProvider>} />
        <Route path="/vote/:slug/results"  element={<SlugProvider><ResultsPage /></SlugProvider>} />

        {/* ── Admin ──────────────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin"       element={<AdminPage />} />

        {/* ── Observer ───────────────────────────────────────────────────── */}
        <Route path="/observer/login" element={<ObserverLoginPage />} />
        <Route path="/observer"       element={<ObserverPage />} />

        {/* ── Super admin ─────────────────────────────────────────────────── */}
        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
        <Route path="/superadmin"       element={<SuperAdminPage />} />

        {/* ── Fallback ───────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalModal />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 selection:bg-blue-200">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}