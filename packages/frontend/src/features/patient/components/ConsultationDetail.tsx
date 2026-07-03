/**
 * @file src/features/patient/components/ConsultationDetail.tsx
 * @description Patient view of a single completed consultation.
 * Shows: doctor info, symptoms, notes (HTML rendered), prescription download.
 * Linked from HealthRecordList when a patient taps a row.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Stethoscope,
  FileText,
  Download,
  Calendar,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../shared/lib/axiosInstance';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConsultationDetailData {
  id:          string;
  status:      string;
  symptoms:    string;
  notes:       string | null;
  scheduledAt: string | null;
  startedAt:   string | null;
  endedAt:     string | null;
  createdAt:   string;
  doctor: {
    id:             string;
    fullName:       string;
    specialisation: string;
  };
  patient: {
    id:       string;
    fullName: string;
  };
  prescriptions: Array<{
    id:       string;
    fileKey:  string;
    issuedAt: string;
  }>;
}

// ── Status badge colours ───────────────────────────────────────────────────

const statusColours: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-800',
  ACCEPTED:    'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED:   'bg-accent-100 text-accent-800',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

// ── Prescription download button ───────────────────────────────────────────

function PrescriptionDownloadButton({ prescriptionId, issuedAt }: {
  prescriptionId: string;
  issuedAt:       string;
}) {
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ downloadUrl: string }>(
        `/prescriptions/${prescriptionId}/download`
      );
      return data.downloadUrl;
    },
    onSuccess: (url) => {
      // Open the pre-signed S3 URL in a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: () => {
      toast.error('Could not generate download link. Please try again.');
    },
  });

  return (
    <button
      onClick={() => downloadMutation.mutate()}
      disabled={downloadMutation.isPending}
      className="
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        transition-colors
      "
      aria-busy={downloadMutation.isPending}
    >
      {downloadMutation.isPending ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Generating link…
        </>
      ) : (
        <>
          <Download size={15} aria-hidden="true" />
          Download Prescription
          <span className="text-xs font-normal opacity-80">
            (issued {new Date(issuedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })})
          </span>
        </>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ConsultationDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consultation', 'detail', id],
    queryFn:  async (): Promise<ConsultationDetailData> => {
      const { data } = await api.get(`/consultations/${id}`);
      return data;
    },
    enabled:   !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner label="Loading consultation…" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <FileText size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Could not load this consultation.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Stethoscope size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-gray-900">
                Dr. {data.doctor.fullName}
              </h1>
              <span className={`badge text-xs ${statusColours[data.status] ?? 'bg-gray-100'}`}>
                {data.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500">{data.doctor.specialisation}</p>
          </div>
        </div>

        {/* Timing */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-gray-400" />
            <span>
              Booked {new Date(data.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
          {data.endedAt && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-400" />
              <span>
                Completed {new Date(data.endedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Symptoms */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Your Symptoms</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{data.symptoms}</p>
      </div>

      {/* Doctor's notes */}
      {data.notes ? (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Doctor's Notes</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: data.notes }}
          />
        </div>
      ) : (
        <div className="card bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-400 text-center py-2">
            {data.status === 'COMPLETED'
              ? 'No notes were added for this consultation.'
              : 'Doctor notes will appear here once the consultation is completed.'}
          </p>
        </div>
      )}

      {/* Prescriptions */}
      {data.prescriptions.length > 0 ? (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Prescription{data.prescriptions.length > 1 ? 's' : ''}
          </h2>
          <div className="space-y-2">
            {data.prescriptions.map((p) => (
              <PrescriptionDownloadButton
                key={p.id}
                prescriptionId={p.id}
                issuedAt={p.issuedAt}
              />
            ))}
          </div>
        </div>
      ) : data.status === 'COMPLETED' && (
        <div className="card bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-400 text-center py-2">
            No prescription was uploaded for this consultation.
          </p>
        </div>
      )}
    </div>
  );
}
