import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SenseiDatabase } from './database.js';

export const SESSION_COOKIE = 'sensei_parent';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function validatePin(pin: unknown): string {
  if (typeof pin !== 'string' || !/^\d{4,12}$/.test(pin)) {
    throw new Error('PIN must contain 4 to 12 digits');
  }
  return pin;
}

export function credentialConfigured(db: SenseiDatabase): boolean {
  return Boolean(db.prepare('SELECT 1 FROM parent_credentials LIMIT 1').get());
}

export async function setupCredential(db: SenseiDatabase, pin: string, now: Date, label = 'Parent'): Promise<{ id: string; label: string }> {
  if (credentialConfigured(db)) throw new Error('Parent PIN is already configured');
  return setCredential(db, label, pin, now);
}

export async function setCredential(db: SenseiDatabase, label: string, pin: string, now: Date): Promise<{ id: string; label: string }> {
  const normalizedLabel = label.trim();
  if (normalizedLabel.length < 1 || normalizedLabel.length > 40) throw new Error('Parent label must be 1 to 40 characters');
  const hash = await argon2.hash(validatePin(pin), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
  const timestamp = now.toISOString();
  const existing = db.prepare('SELECT id FROM parent_credentials WHERE label = ? COLLATE NOCASE')
    .get(normalizedLabel) as { id: string } | undefined;
  const id = existing?.id ?? randomUUID();
  db.prepare(`INSERT INTO parent_credentials(id, label, pin_hash, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET label = excluded.label, pin_hash = excluded.pin_hash, updated_at = excluded.updated_at`)
    .run(id, normalizedLabel, hash, timestamp, timestamp);
  return { id, label: normalizedLabel };
}

export async function verifyPin(db: SenseiDatabase, pin: string): Promise<{ id: string; label: string } | null> {
  let validPin: string;
  try { validPin = validatePin(pin); } catch { return null; }
  const rows = db.prepare('SELECT id, label, pin_hash FROM parent_credentials ORDER BY created_at')
    .all() as Array<{ id: string; label: string; pin_hash: string }>;
  for (const row of rows) {
    if (await argon2.verify(row.pin_hash, validPin)) return { id: row.id, label: row.label };
  }
  return null;
}

export function createSession(db: SenseiDatabase, now: Date, credential?: { id: string; label: string }): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.valueOf() + SESSION_SECONDS * 1000).toISOString();
  db.prepare(`INSERT INTO parent_sessions(id, token_hash, credential_id, created_at, expires_at)
    VALUES(?, ?, ?, ?, ?)` ).run(randomUUID(), tokenHash(token), credential?.id ?? null, now.toISOString(), expiresAt);
  return { token, expiresAt };
}

export function sessionForRequest(db: SenseiDatabase, request: FastifyRequest, now: Date): {
  expiresAt: string; parentLabel: string | null; credentialId: string | null;
} | null {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  const row = db.prepare(`SELECT s.expires_at AS expiresAt, c.label AS parentLabel, s.credential_id AS credentialId FROM parent_sessions s
    LEFT JOIN parent_credentials c ON c.id = s.credential_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`)
    .get(tokenHash(token), now.toISOString()) as {
      expiresAt: string; parentLabel: string | null; credentialId: string | null;
    } | undefined;
  return row ?? null;
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
    maxAge: SESSION_SECONDS
  });
}

export function revokeSession(db: SenseiDatabase, request: FastifyRequest, reply: FastifyReply, now: Date): void {
  const token = request.cookies[SESSION_COOKIE];
  if (token) {
    db.prepare('UPDATE parent_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
      .run(now.toISOString(), tokenHash(token));
  }
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}
