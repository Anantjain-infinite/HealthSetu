/**
 * @file src/features/doctor/components/DoctorDashboard.tsx
 * @description Doctor dashboard home page.
 * Shows: welcome, queue summary stats, link to full queue.
 */

import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, Users } from 'lucide-react';
import { useAuthStore } from '../../../features/auth/store/authStore';
import { useDoctorQueue } from '../hooks/useDoctorQueue';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';

export function DoctorDashboard() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const { data, isLoading } = useDoctorQueue();

  const pendingCount = data?.data?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Dr. {user?.fullName ?? 'Doctor'} 👨‍⚕️
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's your consultation overview for today.
        </p>
      </div>

      {/* Stats cards */}
      <ErrorBoundary>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data?.meta.total ?? 0}</p>
                <p className="text-xs text-gray-500">Total today</p>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* Go to queue CTA */}
      <button
        onClick={() => navigate('/doctor/queue')}
        className="btn-primary w-full py-3 text-base"
      >
        <Stethoscope size={18} />
        Open Consultation Queue
        {pendingCount > 0 && (
          <span className="ml-2 bg-white text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Recent pending preview */}
      {!isLoading && data && data.data.length > 0 && (
        <ErrorBoundary>
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Next in queue</h2>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Stethoscope size={16} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {data.data[0]?.patient.fullName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {data.data[0]?.symptoms}
                </p>
              </div>
              <button
                onClick={() => navigate('/doctor/queue')}
                className="text-xs text-primary-600 font-medium hover:text-primary-700 focus:outline-none focus:underline flex-shrink-0"
              >
                View →
              </button>
            </div>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
