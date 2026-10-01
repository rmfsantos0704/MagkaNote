const { getPriceEstimate } = require('./pricingService');

/**
 * Prices each ingredient line and totals the recipe.
 *
 * Each line is priced in the unit the user chose (e.g. 0.5 kilo). We only use
 * an estimate quoted in that same unit; converting between units (kilo <-> tali)
 * isn't reliable, so a line with no matching data is returned as unpriced
 * instead of guessed.
 */
async function estimateRecipe({ items, locationCode, source, outletName }) {
  const lines = await Promise.all(
    items.map(async ({ item_id, quantity, measurement_unit }) => {
      const result = await getPriceEstimate({
        itemId: item_id,
        locationCode,
        unit: measurement_unit,
        sourceType: source,
        outletName,
      });

      const base = { item_id, quantity, measurement_unit };

      if (!result) return { ...base, priced: false, reason: 'item_not_found' };

      // Crowdsourced results are already filtered to the requested unit.
      // Baseline results carry their own unit, so it has to match.
      const est = result.estimates.find((e) => e.unit === measurement_unit);
      if (!est) {
        return {
          ...base,
          priced: false,
          reason: result.origin === 'none' ? 'no_price_data' : 'no_price_in_this_unit',
        };
      }

      return {
        ...base,
        priced: true,
        origin: result.origin,
        confidence: est.confidence,
        unit_price: est.average_price,
        cost: round2(est.average_price * quantity),
        cost_low: round2(est.min_price * quantity),
        cost_high: round2(est.max_price * quantity),
      };
    })
  );

  const priced = lines.filter((l) => l.priced);

  return {
    location_psgc_code: locationCode,
    lines,
    total: {
      estimated: round2(sum(priced, 'cost')),
      low: round2(sum(priced, 'cost_low')),
      high: round2(sum(priced, 'cost_high')),
    },
    unpriced_count: lines.length - priced.length,
  };
}

const sum = (arr, key) => arr.reduce((acc, x) => acc + x[key], 0);
const round2 = (n) => Math.round(n * 100) / 100;

module.exports = { estimateRecipe };
