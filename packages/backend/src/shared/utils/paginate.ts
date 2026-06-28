/**
 * @file src/shared/utils/paginate.ts
 * @description Pagination helpers used across all list endpoints.
 *
 * Two strategies are supported:
 *   - Offset pagination  : classic page/limit (used for patient consultation history)
 *   - Cursor pagination  : lastId cursor (used for doctor's real-time queue — avoids
 *                          row-shift issues when new items are inserted between pages)
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface OffsetPaginationParams {
  page: number;
  limit: number;
}

export interface CursorPaginationParams {
  cursor?: string; // UUID of the last item seen
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;      // Available for offset pagination
    page?: number;       // Available for offset pagination
    limit: number;
    hasNextPage: boolean;
    nextCursor?: string; // Available for cursor pagination
  };
}

// ── Offset pagination ─────────────────────────────────────────────────────

/**
 * Parse and validate page/limit query parameters from a request.
 * Clamps values to safe ranges.
 *
 * @param query  Raw query params (req.query)
 * @returns      Sanitised { page, limit }
 */
export function parseOffsetParams(query: {
  page?: unknown;
  limit?: unknown;
}): OffsetPaginationParams {
  const page  = Math.max(1, parseInt(String(query.page  ?? '1'),  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

/**
 * Compute the Prisma `skip` value for offset pagination.
 *
 * @param params  { page, limit }
 * @returns       Number of records to skip
 */
export function getSkip({ page, limit }: OffsetPaginationParams): number {
  return (page - 1) * limit;
}

/**
 * Build a PaginatedResult from an offset query.
 *
 * @param data   Records returned for this page
 * @param total  Total count of matching records
 * @param params Pagination params used for the query
 * @returns      Standardised paginated response object
 */
export function buildOffsetResult<T>(
  data: T[],
  total: number,
  params: OffsetPaginationParams
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      hasNextPage: params.page * params.limit < total,
    },
  };
}

// ── Cursor pagination ─────────────────────────────────────────────────────

/**
 * Parse cursor/limit query parameters from a request.
 *
 * @param query  Raw query params (req.query)
 * @returns      Sanitised { cursor, limit }
 */
export function parseCursorParams(query: {
  cursor?: unknown;
  limit?: unknown;
}): CursorPaginationParams {
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const cursor = typeof query.cursor === 'string' && query.cursor ? query.cursor : undefined;
  return { cursor, limit };
}

/**
 * Build a PaginatedResult from a cursor query.
 * Fetches limit + 1 records; if the extra record exists, there is a next page.
 *
 * @param rawData  Records fetched (limit + 1)
 * @param limit    Requested page size
 * @returns        Standardised paginated response object
 */
export function buildCursorResult<T extends { id: string }>(
  rawData: T[],
  limit: number
): PaginatedResult<T> {
  const hasNextPage = rawData.length > limit;
  const data = hasNextPage ? rawData.slice(0, limit) : rawData;
  const nextCursor = hasNextPage ? data[data.length - 1]?.id : undefined;

  return {
    data,
    meta: {
      limit,
      hasNextPage,
      nextCursor,
    },
  };
}
