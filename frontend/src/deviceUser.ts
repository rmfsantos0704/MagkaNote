import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureDeviceUser } from './api';
import type { DeviceUser } from './types';

const DEVICE_ID_KEY = 'magkanote:deviceId';

/**
 * Stand-in for real accounts (see routes/users.js on the backend). Generates
 * a random id the first time the app runs, persists it, and asks the
 * backend to find-or-create the User document tied to it. Every screen that
 * needs `user_id` calls this and gets the same id back after the first call.
 */

// Not a spec-compliant UUID v4 — good enough for a local device identifier,
// which has no security requirement. Swap for expo-crypto's randomUUID()
// if you'd rather not hand-roll this.
function generateDeviceId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const block = (n: number) => Array.from({ length: n }, hex).join('');
  return `${block(8)}-${block(4)}-${block(4)}-${block(4)}-${block(12)}`;
}

let cached: DeviceUser | null = null;
let inFlight: Promise<DeviceUser> | null = null;

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const fresh = generateDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

/** Resolves to the current device's backend user. Cached after the first call. */
export function getDeviceUser(): Promise<DeviceUser> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const deviceId = await getOrCreateDeviceId();
    const user = await ensureDeviceUser(deviceId);
    cached = user;
    inFlight = null;
    return user;
  })();

  return inFlight;
}