/**
 * @file src/features/patient/components/HealthRecordList.tsx
 * @description Virtualised, paginated list of past consultations.
 * Spec 5.6: useVirtualizer, estimateSize 80px, overscan 5, "Load more" button.
 */

import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, ChevronDown, Calendar, Stethoscope } from 'lucide-react';
import { useConsultationHistory } from '../hooks/usePatientConsultations';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import type { ConsultationSummary } from '../../../shared/types';

// ── Status badge colours ───────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-800',
  ACCEPTED:    'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED:   'bg-accent-100 text-accent-800',
  CANCELLED:   'bg-gray-100 text-gray-600',
};

// ── Row component ──────────────────────────────────────────────────────────

function ConsultationRow({ item }: { item: ConsultationSummary }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Stethoscope size={16} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">
            Dr. {item.doctor.fullName}
          </p>
          <span className={`badge text-xs ${statusStyles[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {item.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.symptoms}</p>
        <div className="flex items-center gap-1 mt-1">
          <Calendar size={11} className="text-gray-400" />
          <span className="text-xs text-gray-400">
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function HealthRecordList() {
  const [page, setPage] = useState(1);
  const parentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError } = useConsultationHistory(page);

  const rows: ConsultationSummary[] = data?.data ?? [];

  // Virtualiser — spec: estimateSize 80px, overscan 5
  const virtualizer = useVirtualizer({
    count:       rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize:() => 80,
    overscan:    5,
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner label="Loading records…" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <FileText size={32} className="text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Could not load records. Check your connection.</p>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (rows.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <FileText size={32} className="text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No consultation history yet.</p>
        <p className="text-xs text-gray-400 mt-1">Book your first consultation above.</p>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Scrollable virtualised container */}
      <div
        ref={parentRef}
        className="h-80 overflow-y-auto rounded-xl border border-gray-100 bg-white"
        style={{ contain: 'strict' }}
      >
        {/* Total height = sum of all row heights */}
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = rows[virtualItem.index];
            if (!item) return null;
            return (
              <div
                key={virtualItem.key}
                style={{
                  position:  'absolute',
                  top:       0,
                  left:      0,
                  width:     '100%',
                  height:    `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ConsultationRow item={item} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination — "Load more" button instead of infinite scroll (2G friendly) */}
      {data?.meta.hasNextPage && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
          >
            {isFetching ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <ChevronDown size={16} />
            )}
            Load more
          </button>
        </div>
      )}

      {/* Summary row */}
      {data?.meta.total !== undefined && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Showing {rows.length} of {data.meta.total} consultations
        </p>
      )}
    </div>
  );
}
