/**
 * @file src/shared/components/Layout.tsx
 * @description Main application shell rendered for all authenticated pages.
 * Contains: top nav bar, sidebar navigation, main content area.
 * Adapts navigation links based on user role (PATIENT vs DOCTOR).
 */

import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  FileText,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { OfflineBanner } from './OfflineBanner';

interface NavItem {
  to:    string;
  label: string;
  icon:  React.ReactNode;
}

const patientNav: NavItem[] = [
  { to: '/patient/dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={18} /> },
  { to: '/patient/consultations/new', label: 'New Consultation', icon: <Stethoscope size={18} /> },
  { to: '/patient/records',       label: 'Health Records', icon: <FileText size={18} /> },
  { to: '/patient/emergency',     label: 'Emergency',      icon: <AlertTriangle size={18} /> },
];

const doctorNav: NavItem[] = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/doctor/queue',     label: 'Queue',     icon: <Stethoscope size={18} /> },
];

export function Layout() {
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'DOCTOR' ? doctorNav : patientNav;

  const navLinkClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
    transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${isActive
      ? 'bg-primary-100 text-primary-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }
  `;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OfflineBanner />

      {/* Top nav bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="text-lg font-bold text-primary-700">
            🏥 HealthSetu
          </Link>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-sm text-gray-600">
              {user.fullName ?? user.email}
              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                {user.role}
              </span>
            </span>
          )}
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop always visible, mobile slides in */}
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 z-20 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <aside
            className={`
              fixed lg:static inset-y-0 left-0 z-20
              w-56 bg-white border-r border-gray-200
              flex flex-col pt-4
              transform transition-transform duration-200
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            <nav className="flex-1 px-3 space-y-1" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Bottom user card */}
            <div className="p-3 border-t border-gray-100 mt-auto">
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </aside>
        </>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
