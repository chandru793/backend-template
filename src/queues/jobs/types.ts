/**
 * Job type definitions for BullMQ queues
 */

/**
 * Email job data
 */
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

/**
 * Welcome email job data
 */
export interface WelcomeEmailJobData {
  userId: string;
  email: string;
  name: string;
}

/**
 * Data processing job data
 */
export interface DataProcessingJobData {
  userId: string;
  operation: 'export' | 'import' | 'analyze';
  params: Record<string, unknown>;
}

/**
 * Job result types
 */
export interface EmailJobResult {
  sent: boolean;
  messageId?: string;
  timestamp: number;
}

export interface DataProcessingJobResult {
  success: boolean;
  recordsProcessed: number;
  timestamp: number;
  outputUrl?: string;
}
