import { z } from 'zod';

/**
 * Pagination query parameters
 * Used in list endpoints
 */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * UUID path parameter
 * Used in :id routes
 */
export const idParam = z.object({
  id: z.string().uuid(),
});

/**
 * Standard error response format
 * Matches src/plugins/errorHandler.plugin.ts formatErrorResponse
 */
export const errorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
});

/**
 * Success message response
 */
export const messageResponse = z.object({
  message: z.string(),
});

// Type exports for use in handlers
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type IdParam = z.infer<typeof idParam>;
