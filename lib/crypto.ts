import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function deriveKey(secret: string): Buffer {
  // SHA-256 the secret to always get exactly 32 bytes for AES-256
  return createHash('sha256').update(secret).digest();
}

export function hashIP(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export function encryptToken(token: string): string {
  const key = deriveKey(process.env.NEXTAUTH_SECRET!);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored: string): string {
  const key = deriveKey(process.env.NEXTAUTH_SECRET!);
  const [ivHex, encHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
