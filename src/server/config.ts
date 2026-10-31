import path from 'node:path';

export interface SenseiConfig {
  host: string;
  port: number;
  timezone: string;
  dataDir: string;
  logDir: string;
  databasePath: string;
}

export function loadConfig(env = process.env): SenseiConfig {
  const port = Number(env.SENSEI_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SENSEI_PORT is invalid');
  const dataDir = path.resolve(env.SENSEI_DATA_DIR ?? '.local-data');
  const logDir = path.resolve(env.SENSEI_LOG_DIR ?? path.join(dataDir, 'logs'));
  return {
    host: env.SENSEI_HOST ?? '127.0.0.1',
    port,
    timezone: env.SENSEI_TIMEZONE ?? 'America/Los_Angeles',
    dataDir,
    logDir,
    databasePath: path.join(dataDir, 'sensei.sqlite')
  };
}
