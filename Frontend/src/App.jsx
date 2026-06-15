import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { SlugProvider } from "./context/SlugContext";

import GlobalModal from "./components/ui/GlobalModal";
import NetworkIndicator from "./components/ui/NetworkIndicator";
import VBLoader from "./components/ui/VBLoader";

// ── Lazy-load every page for code splitting ───────────────────────────────────
const LandingPage = lazy(() => import("./pages/Landing"));
const OrgRegisterPage = lazy(() => import("./pages/OrgRegister"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const OtpPage = lazy(() => import("./pages/OtpPage"));
const BallotPage = lazy(() => import("./pages/Ballot"));
const ReceiptPage = lazy(() => import("./pages/Receipt"));
const ResultsPage = lazy(() => import("./pages/Results"));
const AdminLoginPage = lazy(() => import("./pages/AdminLogin"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const AdminPage = lazy(() => import("./pages/Admin"));
const ObserverLoginPage = lazy(() => import("./pages/ObserverLogin"));
const ObserverPage = lazy(() => import("./pages/Observer"));
const SuperAdminLoginPage = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdmin"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const OpenBallotPage = lazy(() => import("./pages/OpenBallot"));
const OpenResultsPage = lazy(() => import("./pages/OpenResults"));

// ── Route guard — redirects unauthenticated users at the router level ─────────
function ProtectedRoute({ children, role }) {
  const { currentUser, accessToken, appLoading } = useApp();
  if (appLoading) return null;
  // Observer uses accessToken only (no currentUser), Admin uses currentUser
  if (role === "OBSERVER") {
    const obsToken = accessToken || sessionStorage.getItem("vb_observer_token");
    const obsSlug = sessionStorage.getItem("vb_observer_slug");
    if (!obsToken) {
      return (
        <Navigate
          to={obsSlug ? `/observer/login?slug=${obsSlug}` : "/observer/login"}
          replace
        />
      );
    }
    return children;
  }
  if (!currentUser)
    return <Navigate to={role === "ADMIN" ? "/admin/login" : "/"} replace />;
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ── Marketing / public ─────────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/org/register" element={<OrgRegisterPage />} />
          <Route path="/open/:slug" element={<OpenBallotPage />} />
          <Route path="/open/:slug/results" element={<OpenResultsPage />} />

          {/* ── Voter flow — scoped to org slug ─────────────────────────────── */}
          <Route
            path="/vote/:slug"
            element={
              <SlugProvider>
                <LoginPage />
              </SlugProvider>
            }
          />
          <Route
            path="/vote/:slug/register"
            element={
              <SlugProvider>
                <RegisterPage />
              </SlugProvider>
            }
          />
          <Route
            path="/vote/:slug/otp"
            element={
              <SlugProvider>
                <OtpPage />
              </SlugProvider>
            }
          />
          <Route
            path="/vote/:slug/ballot"
            element={
              <SlugProvider>
                <BallotPage />
              </SlugProvider>
            }
          />
          <Route
            path="/vote/:slug/receipt"
            element={
              <SlugProvider>
                <ReceiptPage />
              </SlugProvider>
            }
          />
          <Route
            path="/vote/:slug/results"
            element={
              <SlugProvider>
                <ResultsPage />
              </SlugProvider>
            }
          />

          {/* ── Admin ──────────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* ── Observer ───────────────────────────────────────────────────── */}
          <Route path="/observer/login" element={<ObserverLoginPage />} />
          <Route
            path="/observer"
            element={
              <ProtectedRoute role="OBSERVER">
                <ObserverPage />
              </ProtectedRoute>
            }
          />

          {/* ── Super admin ─────────────────────────────────────────────────── */}
          <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
          <Route path="/superadmin" element={<SuperAdminPage />} />

          {/* ── Fallback ───────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <GlobalModal />
      <NetworkIndicator />
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
