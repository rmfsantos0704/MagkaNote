import axios from 'axios';
import Constants from 'expo-constants';
import type { MeasurementUnit } from './constants';
import type { Item, RecipeEstimate, SourceType } from './types';

/**
 * Where is the backend?
 *
 * On a physical phone, "localhost" is the phone itself, not your PC. When you
 * run `npx expo start`, Expo already knows your PC's LAN address (hostUri, like
 * "192.168.1.5:8081"), so we reuse that host and swap the port for the backend's.
 *
 * To override (tunnel mode, deployed backend...), create frontend/.env with:
 *   EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
 */
function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.5:8081"
  if (hostUri) return `http://${hostUri.split(':')[0]}:5000`;

  return 'http://localhost:5000';
}

export const API_URL = resolveBaseUrl();

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

export const isCancel = axios.isCancel;

/** Turns any thrown error into a message safe to show the user. */
export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const msg = (err.response.data as { error?: string } | undefined)?.error;
      return msg ?? `Server error (${err.response.status})`;
    }
    return `Can't reach the server at ${API_URL}. Is the backend running, and is your phone on the same Wi-Fi as your PC?`;
  }
  return 'Something went wrong. Please try again.';
}

export async function searchItems(q: string, signal?: AbortSignal): Promise<Item[]> {
  const { data } = await client.get<{ count: number; items: Item[] }>('/items/search', {
    params: { q, limit: 10 },
    signal,
  });
  return data.items;
}

export interface EstimatePayload {
  /** 9-digit PSGC city/municipality code, from the LocationPicker. */
  location_code: string;
  source: SourceType;
  items: { item_id: string; quantity: number; measurement_unit: MeasurementUnit }[];
}

export async function estimateRecipe(
  payload: EstimatePayload,
  signal?: AbortSignal
): Promise<RecipeEstimate> {
  const { data } = await client.post<RecipeEstimate>('/recipes/estimate', payload, { signal });
  return data;
}
