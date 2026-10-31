import { setCredential } from '../src/server/auth.js';
import { loadConfig } from '../src/server/config.js';
import { openDatabase } from '../src/server/database.js';

const firstPin = process.env.SENSEI_PARENT_ONE_PIN;
const secondPin = process.env.SENSEI_PARENT_TWO_PIN;
const firstLabel = process.env.SENSEI_PARENT_ONE_LABEL ?? 'Parent one';
const secondLabel = process.env.SENSEI_PARENT_TWO_LABEL ?? 'Parent two';
if (!firstPin || !secondPin) throw new Error('Both parent PIN environment variables are required');

const config = loadConfig();
const db = openDatabase(config.databasePath, config.timezone);
try {
  const now = new Date();
  await setCredential(db, firstLabel, firstPin, now);
  await setCredential(db, secondLabel, secondPin, now);
  db.prepare('UPDATE parent_sessions SET revoked_at = ? WHERE revoked_at IS NULL').run(now.toISOString());
  console.log('Configured two parent PINs; existing sessions revoked.');
} finally {
  db.close();
}
