import axios from 'axios';
import Constants from 'expo-constants';
import type { MeasurementUnit } from './constants';
import type {
  BarcodeLookupResult,
  BarcodeNotFound,
  DeviceUser,
  Item,
  PriceEstimateResponse,
  RecipeDetail,
  RecipeEstimate,
  RecipeSummary,
  SaveRecipePayload,
  SourceType,
} from './types';

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
  if (err instanceof Error && err.message) return err.message;
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
  /** Exact store or market name; omitted to use city-wide averages. */
  outlet_name?: string;
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

export async function ensureDeviceUser(deviceId: string): Promise<DeviceUser> {
  const { data } = await client.post<DeviceUser>('/users/device', { device_id: deviceId });
  return data;
}

export async function listRecipes(userId: string): Promise<RecipeSummary[]> {
  const { data } = await client.get<{ count: number; recipes: RecipeSummary[] }>('/recipes', {
    params: { user_id: userId },
  });
  return data.recipes;
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  const { data } = await client.get<RecipeDetail>(`/recipes/${id}`);
  return data;
}

export async function saveRecipe(
  payload: SaveRecipePayload
): Promise<{ recipe: RecipeDetail; estimate: RecipeEstimate }> {
  const { data } = await client.post('/recipes', payload);
  return data;
}

export async function updateRecipe(
  id: string,
  payload: SaveRecipePayload
): Promise<{ recipe: RecipeDetail; estimate: RecipeEstimate }> {
  const { data } = await client.put(`/recipes/${id}`, payload);
  return data;
}

export async function deleteRecipe(id: string, userId: string): Promise<void> {
  await client.delete(`/recipes/${id}`, { params: { user_id: userId } });
}

export interface PriceEstimateParams {
  itemId: string;
  locationCode: string;
  outletName?: string;
  unit?: string;
  source?: SourceType;
}

/** Per-item price lookup (not the whole-recipe one) — used by the ingredient
 * detail panel to show a Palengke vs Supermarket comparison. */
export async function getItemPriceEstimate(
  { itemId, locationCode, outletName, unit, source }: PriceEstimateParams,
  signal?: AbortSignal
): Promise<PriceEstimateResponse> {
  const { data } = await client.get<PriceEstimateResponse>('/prices/estimate', {
    params: { item_id: itemId, location_code: locationCode, outlet_name: outletName, unit, source },
    signal,
  });
  return data;
}

/** Browsable ingredient list (no search text needed) — used to populate the
 * Ingredients tab before the person types anything. */
export async function listItems(
  params: { category?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<Item[]> {
  const { data } = await client.get<{ count: number; items: Item[] }>('/items', {
    params,
    signal,
  });
  return data.items;
}

/**
 * Looks up a scanned EAN-13 barcode. Resolves with the found item, or with
 * `{ source: 'not_found', ... }` rather than throwing — a missing barcode is
 * an expected, normal outcome, not an error.
 */
export async function lookupBarcode(ean: string): Promise<BarcodeLookupResult | BarcodeNotFound> {
  try {
    const { data } = await client.get<BarcodeLookupResult>(`/items/barcode/${ean}`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return err.response.data as BarcodeNotFound;
    }
    throw err;
  }
}

export async function toggleFavorite(id: string, userId: string, isFavorite: boolean): Promise<void> {
  await client.patch(`/recipes/${id}/favorite`, { user_id: userId, is_favorite: isFavorite });
}