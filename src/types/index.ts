/**
 * Common type definitions
 */

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * API Error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  checks: {
    database: { status: HealthStatus; latency?: number };
    redis: { status: HealthStatus; latency?: number };
  };
}

/**
 * Job status for async operations
 */
export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  failedReason?: string;
}
