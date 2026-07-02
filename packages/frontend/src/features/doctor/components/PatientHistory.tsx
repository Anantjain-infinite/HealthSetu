/**
 * @file src/features/doctor/components/PatientHistory.tsx
 * @description Doctor's view of a specific patient's consultation history.
 * Only shows consultations between THIS doctor and THIS patient —
 * never exposes consultations with other doctors (privacy boundary).
 *
 * Rendered inside the ConsultationQueue when a doctor expands a queue item
 * and clicks "View patient history".
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, ChevronDown, X } from 'lucide-react';
import api from '../../../shared/lib/axiosInstance';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import type { PaginatedResponse } from '../../../shared/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface PatientConsultationRecord {
  id:          string;
  status:      string;
  symptoms:    string;
  notes:       string | null;
  scheduledAt: string | null;
  startedAt:   string | null;
  endedAt:     string | null;
  createdAt:   string;
  prescriptions: Array<{ id: string; fileKey: string; issuedAt: string }>;
}

interface PatientHistoryResponse extends PaginatedResponse<PatientConsultationRecord> {
  patient: { id: string; fullName: string };
}

// ── Status badge ───────────────────────────────────────────────────────────

const statusColours: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-800',
  ACCEPTED:    'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED:   'bg-accent-100 text-accent-800',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

// ── Row ────────────────────────────────────────────────────────────────────

function HistoryRow({ record }: { record: PatientConsultationRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <FileText size={14} className="text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge text-xs ${statusColours[record.status] ?? 'bg-gray-100'}`}>
              {record.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(record.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            {record.prescriptions.length > 0 && (
              <span className="text-xs text-accent-600 font-medium">
                {record.prescriptions.length} prescription{record.prescriptions.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{record.symptoms}</p>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Timing */}
          {(record.startedAt || record.endedAt) && (
            <div className="flex gap-4 text-xs text-gray-500">
              {record.startedAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  Started: {new Date(record.startedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </div>
              )}
              {record.endedAt && (
                <div className="flex items-center gap-1">
                  Ended: {new Date(record.endedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Consultation notes</p>
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: record.notes }}
              />
            </div>
          )}

          {/* Prescriptions */}
          {record.prescriptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Prescriptions</p>
              <div className="space-y-1">
                {record.prescriptions.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600 bg-accent-50 rounded-lg px-3 py-2">
                    <FileText size={12} className="text-accent-600" />
                    <span>Issued {new Date(p.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface PatientHistoryProps {
  patientId:   string;
  onClose?:    () => void;
}

export function PatientHistory({ patientId, onClose }: PatientHistoryProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-history-doctor', patientId, page],
    queryFn:  async (): Promise<PatientHistoryResponse> => {
      const { data } = await api.get(
        `/consultations/patient/${patientId}`,
        { params: { page, limit: 10 } }
      );
      return data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!patientId,
  });

  const records = data?.data ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Patient History
            {data?.patient.fullName && (
              <span className="text-primary-600 ml-1">— {data.patient.fullName}</span>
            )}
          </h3>
          <p className="text-xs text-gray-500">Only your consultations with this patient</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close patient history"
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
      )}

      {isError && (
        <div className="text-center py-8 text-sm text-gray-500">
          Could not load patient history.
        </div>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <div className="text-center py-8">
          <FileText size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No previous consultations with this patient.</p>
        </div>
      )}

      {records.map((record) => (
        <HistoryRow key={record.id} record={record} />
      ))}

      {/* Pagination */}
      {(data?.meta.hasNextPage || page > 1) && (
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-primary-600 font-medium disabled:text-gray-300 focus:outline-none focus:underline"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400">Page {page} of {Math.ceil((data?.meta.total ?? 1) / 10)}</span>
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
  );
}
