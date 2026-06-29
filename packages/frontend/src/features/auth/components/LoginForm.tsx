/**
 * @file src/features/auth/components/LoginForm.tsx
 * @description Login form with:
 *   - React Hook Form + Zod resolver validation
 *   - Loading state on submit button
 *   - Field-level error messages
 *   - Account locked (423) specific error display
 *   - Accessible labels and focus management
 *   - Link to registration page
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

// ── Zod schema (client-side, mirrors backend) ──────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Component ──────────────────────────────────────────────────────────────

export function LoginForm() {

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
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HealthSetu</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              className={`
                w-full px-4 py-2.5 rounded-lg border text-gray-900 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                transition-colors placeholder:text-gray-400
                ${errors.email
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`
                  w-full px-4 py-2.5 pr-10 rounded-lg border text-gray-900 text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  transition-colors placeholder:text-gray-400
                  ${errors.password
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                  }
                `}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="
              w-full flex items-center justify-center gap-2
              bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
              text-white font-semibold text-sm
              py-2.5 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              transition-colors
            "
            aria-busy={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} aria-hidden="true" />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
