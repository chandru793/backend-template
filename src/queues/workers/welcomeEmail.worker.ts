import { Worker, type Job } from 'bullmq';
import { createQueueConnection } from '../connections.js';
import type { WelcomeEmailJobData, EmailJobResult } from '../jobs/types.js';
import { deadLetterQueue } from '../index.js';

/**
 * Welcome Email Worker
 *
 * Sends welcome emails to new users.
 * This is a specialized worker for onboarding emails.
 */
export const welcomeEmailWorker = new Worker<WelcomeEmailJobData, EmailJobResult>(
  'welcome-email',
  async (job: Job<WelcomeEmailJobData>) => {
    const { userId, email, name } = job.data;

    await job.log(`Sending welcome email to ${name} (${email})`);
    await job.updateProgress(30);

    // In production, generate welcome email content with template
    // const emailContent = welcomeTemplate({ name, userId });

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 800));
    await job.updateProgress(80);

    // In production: await emailService.sendWelcome({ email, name, userId });

    await job.log('Welcome email sent successfully');
    await job.updateProgress(100);

    return {
      sent: true,
      messageId: `welcome-${userId}-${Date.now()}`,
      timestamp: Date.now(),
    };
  },
  {
    connection: createQueueConnection(),
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  },
);

/**
 * Handle completion
 */
welcomeEmailWorker.on('completed', (job: Job<WelcomeEmailJobData, EmailJobResult>) => {
  console.error(`Welcome email job ${job.id} completed for user ${job.data.userId}`);
});

/**
 * Handle failure - send to DLQ after retries exhausted
 */
welcomeEmailWorker.on('failed', (job: Job<WelcomeEmailJobData> | undefined, err: Error) => {
  if (!job) return;

  console.error(`Welcome email job ${job.id} failed:`, err.message);

  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    deadLetterQueue
      .add('failed-welcome-email', {
        originalQueue: 'welcome-email',
        originalJobId: job.id,
        data: job.data,
        failedReason: err.message,
        attempts: job.attemptsMade,
      })
      .catch((dlqErr: unknown) => {
        console.error('Failed to add to DLQ:', dlqErr);
      });
    console.error(`Welcome email job ${job.id} moved to dead letter queue`);
  }
});

/**
 * Handle errors
 */
welcomeEmailWorker.on('error', (err: Error) => {
  console.error('Welcome email worker error:', err);
});
