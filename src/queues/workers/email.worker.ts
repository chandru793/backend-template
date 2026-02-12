import { Worker, type Job } from 'bullmq';
import { createQueueConnection } from '../connections.js';
import type { EmailJobData, EmailJobResult } from '../jobs/types.js';
import { deadLetterQueue } from '../index.js';

/**
 * Email Worker
 *
 * Processes email jobs from the email queue.
 * In production, this would integrate with a real email service (SendGrid, SES, etc.)
 */
export const emailWorker = new Worker<EmailJobData, EmailJobResult>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to } = job.data;
    // In production, destructure: const { to, subject, body, from } = job.data;

    // Log job start
    await job.log(`Processing email to ${to}`);
    await job.updateProgress(25);

    // Simulate email sending (replace with actual email service)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(75);

    // In production, use actual email service:
    // const result = await emailService.send(job.data);

    await job.log(`Email sent successfully to ${to}`);
    await job.updateProgress(100);

    return {
      sent: true,
      messageId: `mock-${Date.now()}`,
      timestamp: Date.now(),
    };
  },
  {
    connection: createQueueConnection(),
    concurrency: 5, // Process up to 5 emails concurrently
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 1000, // Per second
    },
  },
);

/**
 * Handle job completion
 */
emailWorker.on('completed', (job: Job<EmailJobData, EmailJobResult>) => {
  console.error(`Email job ${job.id} completed:`, job.returnvalue);
});

/**
 * Handle job failure - send to dead letter queue after all retries exhausted
 */
emailWorker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
  if (!job) return;

  console.error(`Email job ${job.id} failed:`, err.message);

  // If job has exhausted all retry attempts, send to DLQ
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    deadLetterQueue
      .add('failed-email', {
        originalQueue: 'email',
        originalJobId: job.id,
        data: job.data,
        failedReason: err.message,
        attempts: job.attemptsMade,
      })
      .catch((dlqErr: unknown) => {
        console.error('Failed to add to DLQ:', dlqErr);
      });
    console.error(`Email job ${job.id} moved to dead letter queue`);
  }
});

/**
 * Handle worker errors
 */
emailWorker.on('error', (err: Error) => {
  console.error('Email worker error:', err);
});
