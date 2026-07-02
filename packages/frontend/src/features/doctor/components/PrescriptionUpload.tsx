/**
 * @file src/features/doctor/components/PrescriptionUpload.tsx
 * @description Prescription PDF upload component for doctors.
 * Spec 4.7: multipart/form-data, field name 'file', PDF only, max 5 MB.
 * Shows drag-and-drop zone, upload progress, and download link after success.
 * Only renders when the consultation status is COMPLETED.
 */

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../shared/lib/axiosInstance';

// ── API call ───────────────────────────────────────────────────────────────

async function uploadPrescription(
  consultationId: string,
  file: File,
  onUploadProgress: (pct: number) => void
): Promise<{ prescriptionId: string; downloadUrl: string }> {
  const form = new FormData();
  form.append('file', file); // field name must be 'file' — matches backend multer config

  const { data } = await api.post(`/prescriptions/${consultationId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onUploadProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

// ── Component ──────────────────────────────────────────────────────────────

interface PrescriptionUploadProps {
  consultationId: string;
}

export function PrescriptionUpload({ consultationId }: PrescriptionUploadProps) {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [progress,     setProgress]     = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadUrl,  setDownloadUrl]  = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadPrescription(consultationId, file, setProgress),
    onSuccess: (data) => {
      setDownloadUrl(data.downloadUrl);
      toast.success('Prescription uploaded successfully!');
    },
    onError: () => {
      setProgress(0);
    },
  });

  function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5 MB.');
      return;
    }
    setSelectedFile(file);
    setProgress(0);
    setDownloadUrl(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setProgress(0);
    setDownloadUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (downloadUrl) {
    return (
      <div className="rounded-xl border border-accent-200 bg-accent-50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-accent-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-accent-800">Prescription uploaded</p>
            <p className="text-xs text-accent-600 mt-0.5">
              Download link valid for 15 minutes
            </p>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
          >
            <ExternalLink size={12} />
            Open PDF
          </a>
        </div>
        <button
          onClick={clearFile}
          className="mt-3 text-xs text-accent-600 hover:text-accent-800 focus:outline-none focus:underline"
        >
          Upload another prescription
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Upload Prescription
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag and drop a PDF prescription file"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-2
          px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500
          transition-colors
          ${isDragging
            ? 'border-primary-400 bg-primary-50'
            : selectedFile
              ? 'border-accent-400 bg-accent-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
      >
        {selectedFile ? (
          <>
            <FileText size={28} className="text-accent-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — PDF
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              aria-label="Remove selected file"
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload size={28} className="text-gray-400" />
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium text-primary-600">Click to upload</span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-400">PDF only · max 5 MB</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Upload progress bar */}
      {uploadMutation.isPending && progress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !uploadMutation.isPending && (
        <button
          type="button"
          onClick={() => uploadMutation.mutate(selectedFile)}
          className="btn-primary w-full"
        >
          <Upload size={15} />
          Upload Prescription
        </button>
      )}

      {uploadMutation.isPending && (
        <button disabled className="btn-primary w-full opacity-70 cursor-not-allowed">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Uploading…
        </button>
      )}
    </div>
  );
}
