/**
 * @file src/shared/errors/AppError.ts
 * @description Custom application error class.
 *
 * Throw an AppError anywhere in the codebase; the global errorHandler
 * middleware will catch it and return the correct HTTP status + JSON body.
 *
 * @example
 *   throw new AppError('Doctor not found', 404);
 *   throw new AppError('Forbidden — you do not own this resource', 403);
 */

export class AppError extends Error {
  /**
   * @param message   Human-readable error message returned to the client.
   * @param statusCode HTTP status code (4xx client errors, 5xx server errors).
   * @param code      Optional machine-readable error code (e.g. 'ACCOUNT_LOCKED').
   * @param details   Optional structured details for field-level validation errors.
   */
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    // Ensure instanceof checks work correctly when targeting ES5
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = 'AppError';

    // Capture the stack trace excluding the constructor itself
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /** Returns true if this is a client error (4xx) */
  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /** Returns true if this is a server error (5xx) */
  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}
