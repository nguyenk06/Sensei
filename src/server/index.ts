import path from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp({
  databasePath: config.databasePath,
  timezone: config.timezone,
  host: config.host,
  port: config.port,
  staticDir: path.resolve('dist/client'),
  logger: true
});

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'Stopping Sensei');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`Sensei is available at http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
