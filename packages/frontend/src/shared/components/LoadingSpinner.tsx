/**
 * @file src/shared/components/LoadingSpinner.tsx
 * @description Accessible loading spinner with three size variants.
 * Uses role="status" and aria-label for screen reader support.
 */

interface LoadingSpinnerProps {
  size?:  'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({
  size  = 'md',
  label = 'Loading…',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col items-center justify-center gap-3"
    >
      <div
        className={`
          ${sizeMap[size]}
          rounded-full
          border-primary-200
          border-t-primary-600
          animate-spin
        `}
        aria-hidden="true"
      />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
