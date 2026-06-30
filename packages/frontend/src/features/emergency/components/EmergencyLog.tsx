/**
 * @file src/features/emergency/components/EmergencyLog.tsx
 * @description Emergency history page for the patient.
 * Shows a paginated list of past SOS triggers with SMS delivery status.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getEmergencyLogs } from '../api/emergencyApi';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { SOSButton } from '../../patient/components/SOSButton';
import type { EmergencyLog as EmergencyLogType } from '../../../shared/types';

const smsStatusIcon: Record<string, React.ReactNode> = {
  SENT:    <CheckCircle size={14} className="text-accent-600" />,
  FAILED:  <XCircle    size={14} className="text-red-500" />,
  PENDING: <Clock      size={14} className="text-yellow-500" />,
};

const smsStatusLabel: Record<string, string> = {
  SENT:    'SMS delivered',
  FAILED:  'SMS failed',
  PENDING: 'SMS pending',
};

function LogRow({ log }: { log: EmergencyLogType }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <AlertTriangle size={14} className="text-emergency-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {new Date(log.triggeredAt).toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short',
            year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {smsStatusIcon[log.smsStatus]}
          <span className="text-xs text-gray-500">{smsStatusLabel[log.smsStatus]}</span>
        </div>
      </div>
    </div>
  );
}

export function EmergencyLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['emergency', 'logs', page],
    queryFn:  () => getEmergencyLogs(page),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const logs: EmergencyLogType[] = data?.data ?? [];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emergency</h1>
        <p className="text-sm text-gray-500 mt-1">
          Press the button below to alert your emergency contact immediately.
        </p>
      </div>

      {/* SOS Button */}
      <div className="card">
        <SOSButton />
      </div>

      {/* History */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Alert History</h2>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
        )}
        {isError && (
          <div className="text-center py-8 text-sm text-gray-500">Could not load history.</div>
        )}
        {!isLoading && !isError && logs.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">No alerts sent yet.</div>
        )}
        {logs.map((log) => <LogRow key={log.id} log={log} />)}

        {/* Pagination */}
        {(data?.meta.hasNextPage || page > 1) && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-primary-600 font-medium disabled:text-gray-300 focus:outline-none focus:underline"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.meta.hasNextPage}
              className="text-xs text-primary-600 font-medium disabled:text-gray-300 focus:outline-none focus:underline"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
