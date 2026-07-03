/**
 * @file src/App.tsx
 * @description Root application component.
 *
 * Responsibilities:
 *   1. Calls authStore.hydrate() on mount to restore session from the
 *      HTTP-only cookie (POST /auth/refresh → GET /auth/me)
 *   2. Defines all application routes using React Router v6
 *   3. Every dashboard route is React.lazy() wrapped for code splitting
 *   4. ProtectedRoute guards role-specific sections
 */

import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { LoadingSpinner } from './shared/components/LoadingSpinner';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { Layout } from './shared/components/Layout';

// ── Auth pages (small — not lazy loaded) ──────────────────────────────────
import { LoginForm }    from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';

// ── Lazy-loaded feature pages ──────────────────────────────────────────────
// Each import() creates a separate JS chunk — critical for slow 2G connections
const PatientDashboard  = lazy(() =>
  import('./features/patient/components/PatientDashboard').then((m) => ({
    default: m.PatientDashboard,
  }))
);
const AppointmentBooking = lazy(() =>
  import('./features/patient/components/AppointmentBooking').then((m) => ({
    default: m.AppointmentBooking,
  }))
);
const ConsultationDetail = lazy(() =>
  import('./features/patient/components/ConsultationDetail').then((m) => ({
    default: m.ConsultationDetail,
  }))
);
const DoctorDashboard   = lazy(() =>
  import('./features/doctor/components/DoctorDashboard').then((m) => ({
    default: m.DoctorDashboard,
  }))
);
const ConsultationQueue = lazy(() =>
  import('./features/doctor/components/ConsultationQueue').then((m) => ({
    default: m.ConsultationQueue,
  }))
);
const VideoRoom         = lazy(() =>
  import('./features/consultation/components/VideoRoom').then((m) => ({
    default: m.VideoRoom,
  }))
);
const EmergencyLogPage  = lazy(() =>
  import('./features/emergency/components/EmergencyLog').then((m) => ({
    default: m.EmergencyLog,
  }))
);

// ── Fallback while lazy chunks load ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" label="Loading page…" />
    </div>
  );
}

// ── Unauthorized page ──────────────────────────────────────────────────────
function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6 text-sm">
          You don&apos;t have permission to view this page.
        </p>
        <a
          href="/"
          className="inline-block px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
/**
 * Wraps public pages (login, register).
 * If the user is already authenticated, redirects them to their dashboard.
 * Prevents logged-in users from accessing /login or /register via URL.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const user       = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Still checking session — show nothing yet to prevent flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  // Already logged in — redirect to correct dashboard
  if (user) {
    if (user.role === 'PATIENT') {
      return <Navigate to="/patient/dashboard" replace />;
    }
    if (user.role === 'DOCTOR') {
      return <Navigate to="/doctor/dashboard" replace />;
    }
  }

  // Not logged in — show the page normally
  return <>{children}</>;
}

// ── App component ──────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────── */}
          {/* ── Public routes — redirect to dashboard if already logged in ── */}
          <Route
            path="/login"
            element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>}
          />
          <Route
            path="/register"
            element={<PublicOnlyRoute><RegisterForm /></PublicOnlyRoute>}
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Patient routes ─────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
            <Route element={<Layout />}>
              <Route path="/patient/dashboard"                element={<PatientDashboard />} />
              <Route path="/patient/consultations/new"       element={<AppointmentBooking />} />
              <Route path="/patient/consultations/:id"       element={<ConsultationDetail />} />
              <Route path="/patient/emergency"               element={<EmergencyLogPage />} />
              {/* Consultations and records added in Step 3 */}
            </Route>
          </Route>

          {/* ── Doctor routes ──────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route element={<Layout />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/queue"     element={<ConsultationQueue />} />
            </Route>
          </Route>

          {/* ── Shared: video room (PATIENT or DOCTOR) ─────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']} />}>
            <Route path="/consultation/:id" element={<VideoRoom />} />
          </Route>

          {/* ── Default redirects ──────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
