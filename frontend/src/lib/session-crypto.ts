/**
 * Encrypted Session Storage
 * 
 * Handles secure encryption/decryption of auth sessions for offline use.
 * Uses subtle crypto API for AES-GCM encryption at rest.
 */

import { logger } from './logger';

export interface CachedSession {
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  token: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp when token expires
  encryptedAt: number; // Unix timestamp when encrypted
  deviceId: string; // Unique device identifier
}

const STORAGE_KEY = 'cached_session_encrypted';
const DEVICE_ID_KEY = 'device_id';
const SESSION_VERSION = 1;

/**
 * Generate a unique device ID to tie sessions to devices
 */
function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a new device ID from random bytes
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    logger.info('Created new device ID', { context: 'SessionCrypto' });
  }
  
  return deviceId;
}

/**
 * Derive encryption key from device ID using PBKDF2
 */
async function deriveEncryptionKey(deviceId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(`time-tracker-salt-${deviceId}`);
  
  // Import the device ID as a base key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive a 256-bit key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for testing
    ['encrypt', 'decrypt']
  );
  
  return derivedKey;
}

/**
 * Encrypt a session for storage
 */
export async function encryptSession(session: CachedSession): Promise<string> {
  try {
    const deviceId = getOrCreateDeviceId();
    session.deviceId = deviceId;
    
    const key = await deriveEncryptionKey(deviceId);
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Serialize session to JSON
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ version: SESSION_VERSION, session }));
    
    // Encrypt using AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(combined)));
    
    logger.info('Session encrypted', { context: 'SessionCrypto' });
    return base64;
  } catch (error) {
    logger.error('Failed to encrypt session', error, { context: 'SessionCrypto' });
    throw error;
  }
}

/**
 * Decrypt a session from storage
 */
export async function decryptSession(encrypted: string): Promise<CachedSession | null> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // We need to know the device ID to decrypt
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      logger.warn('No device ID found, cannot decrypt session', { context: 'SessionCrypto' });
      return null;
    }
    
    const key = await deriveEncryptionKey(deviceId);
    
    // Decrypt using AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    // Parse JSON
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    const parsed = JSON.parse(json);
    
    if (parsed.version !== SESSION_VERSION) {
      logger.warn('Session version mismatch', { context: 'SessionCrypto', data: { version: parsed.version, expected: SESSION_VERSION } });
      return null;
    }
    
    const session = parsed.session as CachedSession;
    
    // Verify device ID matches
    if (session.deviceId !== deviceId) {
      logger.warn('Session device ID mismatch', { context: 'SessionCrypto' });
      return null;
    }
    
    logger.info('Session decrypted', { context: 'SessionCrypto' });
    return session;
  } catch (error) {
    logger.error('Failed to decrypt session', error, { context: 'SessionCrypto' });
    return null;
  }
}

/**
 * Store encrypted session in localStorage
 */
export async function cacheSession(session: CachedSession): Promise<void> {
  try {
    const encrypted = await encryptSession(session);
    localStorage.setItem(STORAGE_KEY, encrypted);
    logger.info('Cached session stored', { context: 'SessionCrypto', data: { email: session.user.email } });
  } catch (error) {
    logger.error('Failed to cache session', error, { context: 'SessionCrypto' });
  }
}

/**
 * Retrieve and decrypt session from localStorage
 */
export async function getCachedSession(): Promise<CachedSession | null> {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return null;
    }
    
    return await decryptSession(encrypted);
  } catch (error) {
    logger.error('Failed to retrieve cached session', error, { context: 'SessionCrypto' });
    return null;
  }
}

/**
 * Check if cached session is still valid
 */
export function isCachedSessionValid(session: CachedSession | null): boolean {
  if (!session) return false;
  
  const now = Date.now();
  const expiresAt = session.expiresAt;
  
  // Add 1 minute buffer before expiry
  const bufferMs = 60 * 1000;
  
  const isValid = now + bufferMs < expiresAt;
  
  if (!isValid) {
    logger.warn('Cached session expired', { 
      context: 'SessionCrypto',
      data: {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString()
      }
    });
  }
  
  return isValid;
}

/**
 * Clear cached session
 */
export function clearCachedSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  logger.info('Cached session cleared', { context: 'SessionCrypto' });
}

/**
 * Get device ID without modifying it
 */
export function getDeviceId(): string {
  return getOrCreateDeviceId();
}
