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
