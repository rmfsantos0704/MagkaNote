import type { MeasurementUnit } from './constants';

export type SourceType = 'palengke' | 'supermarket';

/** A city/municipality picked from the PSGC cascade. */
export interface Location {
  /** 9-digit PSGC code, e.g. "072217000" for Cebu City. */
  code: string;
  /** Cached display name, e.g. "Cebu City, Cebu". */
  name: string;
}

export interface Item {
  _id: string;
  default_name: string;
  category: string;
  image_url: string | null;
  barcode_ean13?: string;
  baseline_price: number | null;
  baseline_unit: MeasurementUnit;
}

export interface EstimateLine {
  item_id: string;
  quantity: number;
  measurement_unit: MeasurementUnit;
  priced: boolean;
  reason?: 'item_not_found' | 'no_price_data' | 'no_price_in_this_unit';
  origin?: 'crowdsourced' | 'baseline';
  confidence?: 'low' | 'medium' | 'high';
  unit_price?: number;
  cost?: number;
  cost_low?: number;
  cost_high?: number;
}

export interface RecipeEstimate {
  location_psgc_code: string;
  lines: EstimateLine[];
  total: { estimated: number; low: number; high: number };
  unpriced_count: number;
}

/** One ingredient row in the Smart Note. */
export interface NoteEntry {
  item: Item;
  quantity: number;
  unit: MeasurementUnit;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** Row shown on the Dashboard's recipe grid (GET /api/recipes). */
export interface RecipeSummary {
  _id: string;
  title: string;
  category: string | null;
  servings: number | null;
  prep_time: string | null;
  difficulty: Difficulty | null;
  image_url: string | null;
  is_favorite: boolean;
  item_count: number;
  total_estimated_cost: number;
  total_supermarket_cost: number | null;
  created_at: string;
}

/** One saved ingredient line, populated with its Item (GET /api/recipes/:id). */
export interface RecipeItemDetail {
  item_id: Item;
  quantity: number;
  measurement_unit: MeasurementUnit;
}

/** Full recipe returned by GET /api/recipes/:id, used to load SmartNote for editing. */
export interface RecipeDetail {
  _id: string;
  user_id: string;
  title: string;
  category: string | null;
  servings: number | null;
  prep_time: string | null;
  difficulty: Difficulty | null;
  notes: string | null;
  image_url: string | null;
  is_favorite: boolean;
  location_psgc_code: string | null;
  location_name: string | null;
  items: RecipeItemDetail[];
  total_estimated_cost: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRecipePayload {
  user_id: string;
  title: string;
  location_code: string;
  location_name?: string;
  source?: SourceType;
  items: { item_id: string; quantity: number; measurement_unit: MeasurementUnit }[];
  category?: string | null;
  servings?: number | null;
  prep_time?: string | null;
  difficulty?: Difficulty | null;
  notes?: string | null;
  image_url?: string | null;
  supermarket_total?: number | null;
}

export interface DeviceUser {
  _id: string;
  username: string;
  trust_score: number;
}

/** One row of GET /api/prices/estimate — a price for one unit/source combination. */
export interface PriceEstimateRow {
  unit: MeasurementUnit;
  source_type: SourceType | 'sari_sari_store';
  sample_size: number;
  outliers_removed: number;
  average_price: number;
  min_price: number;
  max_price: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface PriceEstimateResponse {
  item_id: string;
  location_psgc_code: string;
  window_days: number;
  origin: 'crowdsourced' | 'baseline' | 'none';
  estimates: PriceEstimateRow[];
}

export interface BarcodeLookupResult {
  source: 'internal' | 'open_food_facts';
  item: Item;
}

export interface BarcodeNotFound {
  source: 'not_found';
  barcode_ean13: string;
  external_lookup_failed: boolean;
  message: string;
}