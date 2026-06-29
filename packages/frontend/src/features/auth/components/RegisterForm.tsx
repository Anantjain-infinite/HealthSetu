/**
 * @file src/features/auth/components/RegisterForm.tsx
 * @description Registration form supporting both PATIENT and DOCTOR roles.
 *
 * When PATIENT is selected: shows fullName, dateOfBirth, emergencyContact, address
 * When DOCTOR is selected:  shows fullName, specialisation, licenceNo
 *
 * Uses React Hook Form + Zod with a discriminated union schema.
 * Shows real-time validation errors as the user types (on blur).
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useRegister } from '../hooks/useAuth';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

// ── Zod schema ─────────────────────────────────────────────────────────────

const baseSchema = z.object({
  email:    z.string().email('Enter a valid email').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(72, 'At most 72 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Must include uppercase, lowercase, and a number'
    ),
  role: z.enum(['PATIENT', 'DOCTOR'], {
    required_error: 'Please select your role',
  }),
});

const patientSchema = baseSchema.extend({
  role:             z.literal('PATIENT'),
  fullName:         z.string().min(2, 'Name must be at least 2 characters').trim(),
  dateOfBirth:      z.string().date('Enter a valid date (YYYY-MM-DD)'),
  emergencyContact: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number (e.g. +919876543210)'),
  address: z.string().min(10, 'Address must be at least 10 characters').trim(),
});

const doctorSchema = baseSchema.extend({
  role:           z.literal('DOCTOR'),
  fullName:       z.string().min(2, 'Name must be at least 2 characters').trim(),
  specialisation: z.string().min(2, 'Specialisation is required').trim(),
  licenceNo:      z.string().min(5, 'Licence number is required').trim().toUpperCase(),
});

const registerSchema = z.discriminatedUnion('role', [patientSchema, doctorSchema]);

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Reusable form field component ──────────────────────────────────────────

function Field({
  id,
  label,
  error,
  children,
}: {
  id:       string;
  label:    string;
  error?:   string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError: boolean) => `
  w-full px-4 py-2.5 rounded-lg border text-gray-900 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
  transition-colors placeholder:text-gray-400
  ${hasError
    ? 'border-red-400 bg-red-50'
    : 'border-gray-300 bg-white hover:border-gray-400'
  }
`;

// ── Component ──────────────────────────────────────────────────────────────

export function RegisterForm() {

  const user       = useAuthStore((s) => s.user);
const isHydrated = useAuthStore((s) => s.isHydrated);
const navigate   = useNavigate();

useEffect(() => {
  if (isHydrated && user) {
    if (user.role === 'PATIENT') {
      navigate('/patient/dashboard', { replace: true });
    } else if (user.role === 'DOCTOR') {
      navigate('/doctor/dashboard', { replace: true });
    }
  }
}, [isHydrated, user, navigate]);

  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver:      zodResolver(registerSchema),
    mode:          'onBlur',
    defaultValues: { role: 'PATIENT', email: '', password: '' } as RegisterFormValues,
  });

  const selectedRole = watch('role');

  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Join HealthSetu today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Role selection */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">I am a</p>
            <div className="grid grid-cols-2 gap-3">
              {(['PATIENT', 'DOCTOR'] as const).map((role) => (
                <label
                  key={role}
                  className={`
                    flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer
                    text-sm font-medium transition-colors
                    ${selectedRole === role
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={role}
                    className="sr-only"
                    {...register('role')}
                  />
                  {role === 'PATIENT' ? '🧑‍⚕️ Patient' : '👨‍⚕️ Doctor'}
                </label>
              ))}
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
            )}
          </div>

          {/* Email */}
          <Field id="email" label="Email address" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass(!!errors.email)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </Field>

          {/* Password */}
          <Field id="password" label="Password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min 8 chars, uppercase + number"
              className={inputClass(!!errors.password)}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          {/* Full Name (both roles) */}
          <Field
            id="fullName"
            label="Full name"
            error={(errors as { fullName?: { message?: string } }).fullName?.message}
          >
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Dr. Rajan Sharma"
              className={inputClass(
                !!(errors as { fullName?: { message?: string } }).fullName
              )}
              {...register('fullName' as keyof RegisterFormValues)}
            />
          </Field>

          {/* ── PATIENT-only fields ───────────────────────────────────────── */}
          {selectedRole === 'PATIENT' && (
            <>
              <Field
                id="dateOfBirth"
                label="Date of birth"
                error={
                  (errors as { dateOfBirth?: { message?: string } }).dateOfBirth?.message
                }
              >
                <input
                  id="dateOfBirth"
                  type="date"
                  className={inputClass(
                    !!(errors as { dateOfBirth?: { message?: string } }).dateOfBirth
                  )}
                  {...register('dateOfBirth' as keyof RegisterFormValues)}
                />
              </Field>

              <Field
                id="emergencyContact"
                label="Emergency contact number"
                error={
                  (errors as { emergencyContact?: { message?: string } })
                    .emergencyContact?.message
                }
              >
                <input
                  id="emergencyContact"
                  type="tel"
                  placeholder="+919876543210"
                  className={inputClass(
                    !!(errors as { emergencyContact?: { message?: string } })
                      .emergencyContact
                  )}
                  {...register('emergencyContact' as keyof RegisterFormValues)}
                />
              </Field>

              <Field
                id="address"
                label="Home address"
                error={(errors as { address?: { message?: string } }).address?.message}
              >
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Village, Block, District, State"
                  className={`${inputClass(
                    !!(errors as { address?: { message?: string } }).address
                  )} resize-none`}
                  {...register('address' as keyof RegisterFormValues)}
                />
              </Field>
            </>
          )}

          {/* ── DOCTOR-only fields ────────────────────────────────────────── */}
          {selectedRole === 'DOCTOR' && (
            <>
              <Field
                id="specialisation"
                label="Specialisation"
                error={
                  (errors as { specialisation?: { message?: string } }).specialisation
                    ?.message
                }
              >
                <input
                  id="specialisation"
                  type="text"
                  placeholder="General Physician, Cardiologist…"
                  className={inputClass(
                    !!(errors as { specialisation?: { message?: string } }).specialisation
                  )}
                  {...register('specialisation' as keyof RegisterFormValues)}
                />
              </Field>

              <Field
                id="licenceNo"
                label="Medical licence number"
                error={
                  (errors as { licenceNo?: { message?: string } }).licenceNo?.message
                }
              >
                <input
                  id="licenceNo"
                  type="text"
                  placeholder="MCI-12345"
                  className={inputClass(
                    !!(errors as { licenceNo?: { message?: string } }).licenceNo
                  )}
                  {...register('licenceNo' as keyof RegisterFormValues)}
                />
              </Field>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="
              w-full flex items-center justify-center gap-2 mt-2
              bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
              text-white font-semibold text-sm
              py-2.5 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              transition-colors
            "
            aria-busy={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account…
              </>
            ) : (
              <>
                <UserPlus size={16} aria-hidden="true" />
                Create account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
