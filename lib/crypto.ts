/**
 * refresh token の暗号化 (AES-GCM)。
 * ENCRYPTION_KEY が未設定の場合は平文のまま保存（ローカル開発用）。
 */

const ALG = 'AES-GCM';
const IV_LEN = 12;
const KEY_LEN = 32;
const TAG_LEN = 16;
const PLAIN_PREFIX = 'plain:';

function hasEncryptionKey(): boolean {
  const raw = process.env.ENCRYPTION_KEY;
  return !!(raw && raw.length === KEY_LEN * 2);
}

function getKey(): Promise<CryptoKey> {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length !== KEY_LEN * 2) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== KEY_LEN) throw new Error('ENCRYPTION_KEY invalid hex');
  return crypto.subtle.importKey('raw', buf, { name: ALG, length: KEY_LEN }, false, ['encrypt', 'decrypt']);
}

let keyPromise: Promise<CryptoKey> | null = null;
function key(): Promise<CryptoKey> {
  if (!keyPromise) keyPromise = getKey();
  return keyPromise;
}

export async function encryptRefreshToken(plain: string): Promise<string> {
  if (!hasEncryptionKey()) return PLAIN_PREFIX + plain;
  const k = await key();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = await crypto.subtle.encrypt(
    { name: ALG, iv, tagLength: TAG_LEN * 8 },
    k,
    new TextEncoder().encode(plain)
  );
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), iv.length);
  return Buffer.from(combined).toString('base64');
}

export async function decryptRefreshToken(cipher: string): Promise<string> {
  if (cipher.startsWith(PLAIN_PREFIX)) return cipher.slice(PLAIN_PREFIX.length);
  const k = await key();
  const combined = Buffer.from(cipher, 'base64');
  const iv = combined.subarray(0, IV_LEN);
  const data = combined.subarray(IV_LEN);
  const dec = await crypto.subtle.decrypt(
    { name: ALG, iv, tagLength: TAG_LEN * 8 },
    k,
    data
  );
  return new TextDecoder().decode(dec);
}
