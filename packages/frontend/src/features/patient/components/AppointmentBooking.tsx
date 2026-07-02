/**
 * @file src/features/patient/components/AppointmentBooking.tsx
 * @description Full-page appointment booking view.
 * Wraps SymptomForm in a page layout with a back button.
 * Used when the patient navigates to /patient/consultations/new
 * rather than opening the modal from the dashboard.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SymptomForm } from './SymptomForm';

export function AppointmentBooking() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Book a Consultation</h1>
          <p className="text-sm text-gray-500">Find a doctor and describe your symptoms</p>
        </div>
      </div>

      {/* Inline form (not modal) */}
      <div className="card">
        <SymptomFormInline onSuccess={() => navigate('/patient/dashboard')} />
      </div>
    </div>
  );
}

/**
 * Inline version of the symptom form — renders directly on the page
 * rather than inside a modal overlay. Shares all logic with SymptomForm
 * but without the backdrop / close button.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCreateConsultation } from '../hooks/usePatientConsultations';
import { searchDoctors } from '../api/patientApi';
import type { Doctor } from '../../../shared/types';

const schema = z.object({
  doctorId:    z.string().uuid('Please select a doctor'),
  symptoms:    z.string().min(20, 'Describe your symptoms in at least 20 characters').max(2000),
  scheduledAt: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function SymptomFormInline({ onSuccess }: { onSuccess: () => void }) {
  const [searchInput,     setSearchInput]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDoctor,  setSelectedDoctor]  = useState<Doctor | null>(null);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const createMutation = useCreateConsultation();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

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

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      { doctorId: values.doctorId, symptoms: values.symptoms, scheduledAt: values.scheduledAt || undefined },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Doctor search */}
      <div>
        <label htmlFor="doctor-search-page" className="block text-sm font-medium text-gray-700 mb-1">
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
            id="doctor-search-page"
            type="text"
            placeholder="Search by name or specialisation…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true); if (!e.target.value) setSelectedDoctor(null); }}
            onFocus={() => setShowDropdown(true)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.doctorId ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            autoComplete="off"
          />
          <input type="hidden" {...register('doctorId')} />
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
                    {doc.isAvailable && <span className="ml-auto text-xs text-accent-600 font-medium">Available</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedDoctor && <p className="mt-1.5 text-xs text-accent-700 font-medium">✓ {selectedDoctor.fullName} — {selectedDoctor.specialisation}</p>}
        {errors.doctorId && <p className="mt-1 text-xs text-red-600">{errors.doctorId.message}</p>}
      </div>

      {/* Symptoms */}
      <div>
        <label htmlFor="symptoms-page" className="block text-sm font-medium text-gray-700 mb-1">Describe your symptoms</label>
        <textarea
          id="symptoms-page"
          rows={5}
          placeholder="Please describe what you're experiencing in detail…"
          className={`w-full px-4 py-2.5 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 ${errors.symptoms ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          {...register('symptoms')}
        />
        {errors.symptoms && <p className="mt-1 text-xs text-red-600">{errors.symptoms.message}</p>}
      </div>

      {/* Schedule */}
      <div>
        <label htmlFor="scheduledAt-page" className="block text-sm font-medium text-gray-700 mb-1">
          Preferred date & time <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="scheduledAt-page"
          type="datetime-local"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          {...register('scheduledAt')}
        />
      </div>

      <button
        type="submit"
        disabled={createMutation.isPending}
        className="btn-primary w-full py-3"
      >
        {createMutation.isPending ? (
          <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Booking…</>
        ) : 'Book Consultation'}
      </button>
    </form>
  );
}
