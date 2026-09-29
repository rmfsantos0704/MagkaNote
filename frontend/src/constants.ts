// This list mirrors the enum in the backend models. If you add a unit there,
// add it here too. Location no longer has a fixed list — see src/psgc.ts.

export const MEASUREMENT_UNITS = [
  'kilo',
  'gramo',
  'tali',
  'guhit',
  'piraso',
  'kaing',
  'sako',
  'litro',
  'piece',
] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  Produce: '🥬',
  Meat_Poultry: '🍗',
  Seafood: '🐟',
  Dairy_Eggs: '🥚',
  Pantry_Dry_Goods: '🍚',
  Packaged_Snacks: '🍿',
  Beverages: '🥤',
  Condiments: '🧂',
  Frozen: '🧊',
  Other: '🛒',
};

/** How much the +/- buttons change the quantity for each unit. */
export function stepFor(unit: MeasurementUnit): number {
  if (unit === 'gramo') return 100;
  if (unit === 'kilo' || unit === 'litro') return 0.25;
  return 1;
}

/** Quantity a newly added ingredient (or a newly chosen unit) starts with. */
export function defaultQtyFor(unit: MeasurementUnit): number {
  if (unit === 'gramo') return 250;
  if (unit === 'kilo' || unit === 'litro') return 0.5;
  return 1;
}
