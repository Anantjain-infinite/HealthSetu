/**
 * @file src/features/patient/components/SymptomForm.tsx
 * @description Modal form to book a new consultation.
 * Spec 5.8: debounced doctor search (300ms), Zod validation, loading states, toasts.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { X, Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCreateConsultation } from '../hooks/usePatientConsultations';
import { searchDoctors } from '../api/patientApi';
import type { Doctor } from '../../../shared/types';

// ── Zod schema ─────────────────────────────────────────────────────────────

const symptomSchema = z.object({
  doctorId:    z.string().uuid('Please select a doctor'),
  symptoms:    z.string().min(20, 'Describe your symptoms in at least 20 characters').max(2000),
  scheduledAt: z.string().optional(),
});

type SymptomFormValues = z.infer<typeof symptomSchema>;

interface SymptomFormProps {
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SymptomForm({ onClose }: SymptomFormProps) {
  const [searchInput,    setSearchInput]    = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const createMutation = useCreateConsultation();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomSchema),
  });

  // 300ms debounce on doctor search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Doctor search query — only fires when debouncedSearch changes
  const { data: doctors = [], isFetching: searchLoading } = useQuery({
    queryKey: ['doctors', 'search', debouncedSearch],
    queryFn:  () => searchDoctors(debouncedSearch),
    enabled:  debouncedSearch.length >= 1,
    staleTime: 30_000,
  });

  function selectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setValue('doctorId', doctor.id, { shouldValidate: true });
    setSearchInput(doctor.fullName);
    setShowDropdown(false);
  }

  const onSubmit = (values: SymptomFormValues) => {
    createMutation.mutate(
      {
        doctorId:    values.doctorId,
        symptoms:    values.symptoms,
        scheduledAt: values.scheduledAt || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Book a Consultation</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Doctor search */}
          <div>
            <label htmlFor="doctor-search" className="block text-sm font-medium text-gray-700 mb-1">
              Select Doctor
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searchLoading
                  ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <Search size={16} />
                }
              </div>
              <input
                id="doctor-search"
                type="text"
                placeholder="Search by name or specialisation…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) setSelectedDoctor(null);
                }}
                onFocus={() => setShowDropdown(true)}
                className={`
                  w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  ${errors.doctorId ? 'border-red-400 bg-red-50' : 'border-gray-300'}
                `}
                autoComplete="off"
              />

              {/* Hidden input for form value */}
              <input type="hidden" {...register('doctorId')} />

              {/* Dropdown */}
              {showDropdown && debouncedSearch && doctors.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {doctors.map((doc) => (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => selectDoctor(doc)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-primary-50 focus:outline-none focus:bg-primary-50"
                      >
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.fullName}</p>
                          <p className="text-xs text-gray-500">{doc.specialisation}</p>
                        </div>
                        {doc.isAvailable && (
                          <span className="ml-auto text-xs text-accent-600 font-medium">Available</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedDoctor && (
              <p className="mt-1.5 text-xs text-accent-700 font-medium">
                ✓ {selectedDoctor.fullName} — {selectedDoctor.specialisation}
              </p>
            )}
            {errors.doctorId && (
              <p className="mt-1 text-xs text-red-600">{errors.doctorId.message}</p>
            )}
          </div>

          {/* Symptoms */}
          <div>
            <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-1">
              Describe your symptoms
            </label>
            <textarea
              id="symptoms"
              rows={4}
              placeholder="Please describe what you're experiencing in detail (at least 20 characters)…"
              className={`
                w-full px-4 py-2.5 rounded-lg border text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                placeholder:text-gray-400
                ${errors.symptoms ? 'border-red-400 bg-red-50' : 'border-gray-300'}
              `}
              {...register('symptoms')}
            />
            {errors.symptoms && (
              <p className="mt-1 text-xs text-red-600">{errors.symptoms.message}</p>
            )}
          </div>

          {/* Schedule (optional) */}
          <div>
            <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred date & time <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              {...register('scheduledAt')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              aria-busy={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              {createMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Booking…
                </>
              ) : 'Book Consultation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
