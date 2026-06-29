/**
 * @file src/features/patient/components/PatientDashboard.tsx
 * @description Patient dashboard — spec section 5.5.
 * Sections: welcome, SOS, quick stats, New Consultation button,
 *           upcoming appointments, virtualised health record list.
 */

import { useState } from 'react';
import { Plus, Clock, CheckCircle, Activity, Calendar } from 'lucide-react';
import { useAuthStore } from '../../../features/auth/store/authStore';
import { SOSButton } from './SOSButton';
import { SymptomForm } from './SymptomForm';
import { HealthRecordList } from './HealthRecordList';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { usePatientStats } from '../hooks/useHealthRecords';
import { useUpcomingConsultations } from '../hooks/usePatientConsultations';
import type { ConsultationSummary } from '../../../shared/types';

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, colour,
}: {
  label:  string;
  value:  number | string;
  icon:   React.ReactNode;
  colour: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 ${colour} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Upcoming appointment card ──────────────────────────────────────────────

function UpcomingCard({ consultation }: { consultation: ConsultationSummary }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
      <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Calendar size={16} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">Dr. {consultation.doctor.fullName}</p>
        <p className="text-xs text-gray-500 truncate">{consultation.doctor.specialisation}</p>
        {consultation.scheduledAt && (
          <p className="text-xs text-primary-600 mt-0.5">
            {new Date(consultation.scheduledAt).toLocaleString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>
      <span className={`
        badge text-xs flex-shrink-0
        ${consultation.status === 'ACCEPTED' ? 'bg-accent-100 text-accent-800' : 'bg-yellow-100 text-yellow-800'}
      `}>
        {consultation.status}
      </span>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export function PatientDashboard() {
  const { user }            = useAuthStore();
  const [showForm, setShowForm] = useState(false);

  const { data: stats, isLoading: statsLoading }       = usePatientStats();
  const { data: upcoming = [], isLoading: upcomingLoading } = useUpcomingConsultations();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.fullName ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">How are you feeling today?</p>
      </div>

      {/* 2. SOS Button */}
      <ErrorBoundary>
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Emergency Alert</p>
          <SOSButton />
        </div>
      </ErrorBoundary>

      {/* 3. Quick stats */}
      <ErrorBoundary>
        {statsLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total"
              value={stats?.total ?? 0}
              icon={<Activity size={18} className="text-primary-600" />}
              colour="bg-primary-100"
            />
            <StatCard
              label="Pending"
              value={stats?.pending ?? 0}
              icon={<Clock size={18} className="text-yellow-600" />}
              colour="bg-yellow-100"
            />
            <StatCard
              label="Completed"
              value={stats?.completed ?? 0}
              icon={<CheckCircle size={18} className="text-accent-600" />}
              colour="bg-accent-100"
            />
          </div>
        )}
      </ErrorBoundary>

      {/* 4. New Consultation button */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary w-full py-3 text-base"
      >
        <Plus size={18} />
        New Consultation
      </button>

      {/* 5. Upcoming appointments */}
      <ErrorBoundary>
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upcoming Appointments</h2>
          {upcomingLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => <UpcomingCard key={c.id} consultation={c} />)}
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* 6. Health record list (virtualised) */}
      <ErrorBoundary>
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Consultation History</h2>
          <HealthRecordList />
        </div>
      </ErrorBoundary>

      {/* Symptom form modal */}
      {showForm && <SymptomForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
