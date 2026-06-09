import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { SlugProvider } from "./context/SlugContext";

import Navbar      from "./components/layout/Navbar";
import GlobalModal from "./components/ui/GlobalModal";
import VBLoader    from "./components/ui/VBLoader";

// ── Lazy-load every page for code splitting ───────────────────────────────────
const LandingPage        = lazy(() => import("./pages/Landing"));
const OrgRegisterPage    = lazy(() => import("./pages/OrgRegister"));
const LoginPage          = lazy(() => import("./pages/Login"));
const RegisterPage       = lazy(() => import("./pages/Register"));
const OtpPage            = lazy(() => import("./pages/OtpPage"));
const BallotPage         = lazy(() => import("./pages/Ballot"));
const ReceiptPage        = lazy(() => import("./pages/Receipt"));
const ResultsPage        = lazy(() => import("./pages/Results"));
const AdminLoginPage     = lazy(() => import("./pages/AdminLogin"));
const AdminPage          = lazy(() => import("./pages/Admin"));
const ObserverLoginPage  = lazy(() => import("./pages/ObserverLogin"));
const ObserverPage       = lazy(() => import("./pages/Observer"));
const SuperAdminLoginPage = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminPage      = lazy(() => import("./pages/SuperAdmin"));

// ── Route guard — redirects unauthenticated users at the router level ─────────
function ProtectedRoute({ children, role }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to={role === "ADMIN" ? "/admin/login" : "/observer/login"} replace />;
  if (role && currentUser.role !== role) return <Navigate to="/" replace />;
  return children;
}

// ── Page-level suspense fallback ──────────────────────────────────────────────
function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <VBLoader size="lg" label="Loading..." />
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ── Marketing / public ─────────────────────────────────────────── */}
          <Route path="/"             element={<LandingPage />} />
          <Route path="/org/register" element={<OrgRegisterPage />} />

          {/* ── Voter flow — scoped to org slug ─────────────────────────────── */}
          <Route path="/vote/:slug"          element={<SlugProvider><LoginPage /></SlugProvider>} />
          <Route path="/vote/:slug/register" element={<SlugProvider><RegisterPage /></SlugProvider>} />
          <Route path="/vote/:slug/otp"      element={<SlugProvider><OtpPage /></SlugProvider>} />
          <Route path="/vote/:slug/ballot"   element={<SlugProvider><BallotPage /></SlugProvider>} />
          <Route path="/vote/:slug/receipt"  element={<SlugProvider><ReceiptPage /></SlugProvider>} />
          <Route path="/vote/:slug/results"  element={<SlugProvider><ResultsPage /></SlugProvider>} />

          {/* ── Admin ──────────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={
            <ProtectedRoute role="ADMIN"><AdminPage /></ProtectedRoute>
          } />

          {/* ── Observer ───────────────────────────────────────────────────── */}
          <Route path="/observer/login" element={<ObserverLoginPage />} />
          <Route path="/observer"       element={<ObserverPage />} />

          {/* ── Super admin ─────────────────────────────────────────────────── */}
          <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
          <Route path="/superadmin"       element={<SuperAdminPage />} />

          {/* ── Fallback ───────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <GlobalModal />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        {/* root bg is slate-950 — every page that needs lighter tones overrides locally */}
        <div className="min-h-screen bg-slate-950 font-sans text-white selection:bg-blue-500/30">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
