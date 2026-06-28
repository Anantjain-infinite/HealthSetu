/**
 * @file src/shared/components/ProtectedRoute.tsx
 * @description Route guard component.
 *
 * Behaviour:
 *   1. If !isHydrated → show LoadingSpinner (prevents flash of /login before
 *      the session check completes on page reload)
 *   2. If !user       → redirect to /login
 *   3. If allowedRoles provided and user.role not in allowedRoles → redirect to /unauthorized
 *   4. Otherwise      → render <Outlet /> (children render normally)
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';
import { LoadingSpinner } from './LoadingSpinner';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  /** If provided, only users with one of these roles may access the route. */
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isHydrated } = useAuthStore();

  // Waiting for session restore — don't flash the login page
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" label="Restoring session…" />
      </div>
    );
  }

  // Not authenticated — send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role — send to unauthorized page
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed — render the child routes
  return <Outlet />;
}
