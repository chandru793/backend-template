/**
 * Worker Entry Point
 *
 * Run with: pnpm queue:worker
 *
 * This file starts all queue workers and handles graceful shutdown.
 * Workers run in a separate process from the Fastify server to prevent
 * CPU-heavy jobs from blocking HTTP responses.
 */

import closeWithGrace from 'close-with-grace';
import { emailWorker } from './email.worker.js';
import { welcomeEmailWorker } from './welcomeEmail.worker.js';
import { dataProcessingWorker } from './dataProcessing.worker.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

console.error('🚀 Starting queue workers...');

const workers = [emailWorker, welcomeEmailWorker, dataProcessingWorker];

// Log worker startup
workers.forEach((worker) => {
  console.error(`✅ Worker started: ${worker.name}`);
});

/**
 * Graceful shutdown handler
 *
 * Waits for current jobs to finish before shutting down.
 * Delay of 30s gives jobs time to complete.
 */
closeWithGrace({ delay: 30_000 }, async ({ signal, err }) => {
  if (err) {
    console.error('Shutting down workers due to error:', err);
  } else {
    console.error(`\n${String(signal)} received, shutting down workers gracefully...`);
  }

  // Close all workers (waits for current jobs to finish)
  await Promise.all(
    workers.map(async (worker) => {
      console.error(`Closing worker: ${worker.name}`);
      await worker.close();
      console.error(`✓ Worker closed: ${worker.name}`);
    }),
  );

  console.error('All workers closed successfully');
});

/**
 * Handle uncaught errors
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.error('Workers are running. Press Ctrl+C to stop.');
