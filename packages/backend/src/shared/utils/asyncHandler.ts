/**
 * @file src/shared/utils/asyncHandler.ts
 * @description Wraps async Express route handlers so that any thrown error
 * or rejected promise is automatically forwarded to Express's next(err),
 * reaching the global errorHandler without needing try/catch in every controller.
 *
 * @example
 *   router.get('/profile', asyncHandler(async (req, res) => {
 *     const data = await someAsyncCall();
 *     res.json(data);
 *   }));
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wraps an async Express handler and catches any rejected promise,
 * forwarding it to the next error-handling middleware.
 *
 * @param fn  Async request handler function
 * @returns   Standard Express RequestHandler
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
