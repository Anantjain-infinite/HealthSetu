/**
 * @file src/shared/middleware/validateRequest.ts
 * @description Express middleware factory that validates req.body against a
 * provided Zod schema. On failure, passes a ZodError to the global errorHandler
 * which converts it to HTTP 422 with field-level error details.
 *
 * @example
 *   router.post('/register', validateRequest(registerSchema), authController.register);
 */

import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Returns an Express middleware that parses req.body with the given Zod schema.
 * If valid, replaces req.body with the parsed (typed, stripped of extra fields) data.
 * If invalid, calls next(zodError) → handled by errorHandler → HTTP 422.
 *
 * @param schema  Zod schema to validate against
 * @returns       Express middleware function
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    // Replace body with the parsed & type-safe version
    req.body = result.data;
    next();
  };
}

/**
 * Like validateRequest but validates req.query instead of req.body.
 * Useful for GET endpoints with validated query parameters.
 *
 * @param schema  Zod schema for query params
 * @returns       Express middleware function
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(result.error);
      return;
    }

    // @ts-expect-error — replacing query with parsed version
    req.query = result.data;
    next();
  };
}
