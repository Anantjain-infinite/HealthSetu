/**
 * @file src/features/doctor/components/ConsultationQueue.tsx
 * @description Doctor consultation queue with virtualisation and 30s polling.
 * Spec 5.7: useVirtualizer, estimateSize 100px, overscan 5.
 * Accept button triggers mutation, expands notes panel on accepted item.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Clock, User, CheckCircle, ChevronDown, ChevronUp, Calendar, Play, Video } from 'lucide-react';
import { useDoctorQueue, useAcceptConsultation, useStartConsultation } from '../hooks/useDoctorQueue';
import { ConsultationNotes } from './ConsultationNotes';
import { PatientHistory } from './PatientHistory';
import { PrescriptionUpload } from './PrescriptionUpload';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import type { ConsultationSummary } from '../../../shared/types';

// ── Status badge ───────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-accent-100 text-accent-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

// ── Queue row ──────────────────────────────────────────────────────────────

function QueueRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: ConsultationSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const acceptMutation = useAcceptConsultation();
  const startMutation = useStartConsultation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-primary-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{item.patient.fullName}</p>
            <span className={`badge text-xs ${statusStyles[item.status] ?? ''}`}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.symptoms}</p>
          {item.scheduledAt && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar size={11} className="text-gray-400" />
              <span className="text-xs text-gray-400">
                {new Date(item.scheduledAt).toLocaleString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* PENDING → Accept */}
          {item.status === 'PENDING' && (
            <button
              onClick={() => acceptMutation.mutate(item.id)}
              disabled={acceptMutation.isPending}
              aria-busy={acceptMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent-600 hover:bg-accent-700 disabled:bg-accent-300 text-white focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
            >
              {acceptMutation.isPending
                ? <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <CheckCircle size={12} />
              }
              Accept
            </button>
          )}

          {/* ACCEPTED → Start (marks IN_PROGRESS + opens video) */}
          {item.status === 'ACCEPTED' && (
            <button
              onClick={() => {
                startMutation.mutate(item.id, {
                  onSuccess: () => navigate(`/consultation/${item.id}`),
                });
              }}
              disabled={startMutation.isPending}
              aria-busy={startMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              {startMutation.isPending
                ? <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <Play size={12} />
              }
              Start
            </button>
          )}

          {/* IN_PROGRESS → rejoin the video call */}
          {item.status === 'IN_PROGRESS' && (
            <button
              onClick={() => navigate(`/consultation/${item.id}`)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
            >
              <Video size={12} />
              Join Call
            </button>
          )}

          {/* Expand notes panel for ACCEPTED or IN_PROGRESS */}
          {(item.status === 'ACCEPTED' || item.status === 'IN_PROGRESS') && (
            <button
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse notes' : 'Open notes editor'}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Patient history toggle */}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-primary-600 font-medium hover:text-primary-700 focus:outline-none focus:underline"
          >
            {showHistory ? 'Hide patient history' : 'View patient history'}
          </button>

          {showHistory && (
            <ErrorBoundary>
              <PatientHistory
                patientId={item.patient.id}
                onClose={() => setShowHistory(false)}
              />
            </ErrorBoundary>
          )}

          {/* Notes editor */}
          <ErrorBoundary>
            <ConsultationNotes
              consultationId={item.id}
              onCompleted={onToggle}
            />
          </ErrorBoundary>

          {/* Prescription upload — only after consultation is completed */}
          {item.status === 'COMPLETED' && (
            <ErrorBoundary>
              <PrescriptionUpload consultationId={item.id} />
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ConsultationQueue() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading, isError, isFetching } = useDoctorQueue();

  const rows: ConsultationSummary[] = data?.data ?? [];

  // FIXED — measures actual DOM height of each row
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pending · Accepted · In Progress — refreshes every 30s</p>
        </div>
        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Updating…
          </div>
        )}
      </div>

      {/* Queue card */}
      <div className="card p-0 overflow-hidden">
        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner label="Loading queue…" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-12">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Could not load queue. Will retry automatically.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle size={32} className="text-accent-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No pending consultations.</p>
            <p className="text-xs text-gray-400 mt-1">New requests will appear here automatically.</p>
          </div>
        )}

        {/* Virtualised list */}
        {rows.length > 0 && (
          <div
            ref={parentRef}
            className="max-h-[600px] overflow-y-auto"
            style={{ contain: 'content' }}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = rows[virtualItem.index];
                if (!item) return null;
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <QueueRow
                      item={item}
                      isExpanded={expanded === item.id}
                      onToggle={() =>
                        setExpanded((prev) => (prev === item.id ? null : item.id))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {rows.length} consultation{rows.length !== 1 ? 's' : ''} in queue
          {data?.meta.hasNextPage && ' — scroll to load more'}
        </p>
      )}
    </div>
  );
}