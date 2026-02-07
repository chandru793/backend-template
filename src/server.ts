import closeWithGrace from 'close-with-grace';
import { buildApp } from './app.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const app = await buildApp();

  // close-with-grace handles SIGTERM, SIGINT, uncaughtException, unhandledRejection
  // - Runs cleanup before exit (drains in-flight requests)
  // - A second signal during shutdown causes immediate termination
  // - Do NOT call process.exit() — it exits automatically
  closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
    if (err) {
      app.log.error({ err }, 'Server closing due to error');
    } else {
      app.log.info(`${String(signal)} received, shutting down gracefully`);
    }

    await app.close();
  });

  // Get port and host from config
  const port = app.config.PORT;
  const host = app.config.HOST;

  // Start listening
  await app.listen({ port, host });

  app.log.info(`Server is running at http://${host}:${port}`);
  app.log.info(`Environment: ${app.config.NODE_ENV}`);

  if (app.config.SWAGGER_ENABLED && app.config.NODE_ENV !== 'production') {
    app.log.info(`API Documentation: http://${host}:${port}/documentation`);
  }
}

void main();
