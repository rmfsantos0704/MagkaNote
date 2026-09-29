const mongoose = require('mongoose');
const PriceReport = require('../models/PriceReport');
const Item = require('../models/Item');

// ---- Tunable settings -------------------------------------------------------
const WINDOW_DAYS = 14; // rolling window
const MIN_SAMPLES_FOR_OUTLIER_FILTER = 4; // IQR is meaningless with fewer points
const IQR_MULTIPLIER = 1.5; // standard Tukey fence
const MAX_NET_DOWNVOTES = 3; // hide reports where (downvotes - upvotes) >= this
// -----------------------------------------------------------------------------

/**
 * Builds the aggregation pipeline for one item + location (a PSGC city/municipality code).
 *
 * Steps:
 *  1. $match   -> last N days, right item/location, not heavily downvoted
 *  2. $group   -> one bucket per (measurement_unit, source_type), because
 *                 "80 per kilo" and "80 per tali" must never be averaged together
 *  3. $percentile -> Q1/Q3 per bucket (needs MongoDB 7.0+, Atlas M0 qualifies)
 *  4. Tukey fences -> [Q1 - 1.5*IQR, Q3 + 1.5*IQR]; reports outside are dropped
 *  5. Vote-weighted average of the surviving reports + min/max as the range
 */
function buildPipeline({ itemId, locationCode, unit, sourceType, days }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const match = {
    item_id: new mongoose.Types.ObjectId(itemId),
    location_psgc_code: locationCode,
    timestamp: { $gte: since },
    $expr: { $lt: [{ $subtract: ['$downvotes', '$upvotes'] }, MAX_NET_DOWNVOTES] },
  };
  if (unit) match.measurement_unit = unit;
  if (sourceType) match.source_type = sourceType;

  return [
    { $match: match },

    {
      $group: {
        _id: { unit: '$measurement_unit', source: '$source_type' },
        total: { $sum: 1 },
        prices: { $push: '$price' },
        reports: {
          $push: {
            price: '$price',
            // Each net upvote adds weight; floor of 0.1 so a report is never fully ignored
            weight: {
              $max: [0.1, { $add: [1, { $subtract: ['$upvotes', '$downvotes'] }] }],
            },
          },
        },
      },
    },

    // Quartiles only when there are enough samples to make them meaningful
    {
      $addFields: {
        quartiles: {
          $cond: [
            { $gte: ['$total', MIN_SAMPLES_FOR_OUTLIER_FILTER] },
            { $percentile: { input: '$prices', p: [0.25, 0.75], method: 'approximate' } },
            null,
          ],
        },
      },
    },

    // Outlier fences (wide open when the sample is too small to filter)
    {
      $addFields: {
        bounds: {
          $let: {
            vars: {
              q1: { $arrayElemAt: ['$quartiles', 0] },
              q3: { $arrayElemAt: ['$quartiles', 1] },
            },
            in: {
              $cond: [
                { $eq: ['$quartiles', null] },
                { lower: 0, upper: 1e12 },
                {
                  lower: {
                    $subtract: [
                      '$$q1',
                      { $multiply: [IQR_MULTIPLIER, { $subtract: ['$$q3', '$$q1'] }] },
                    ],
                  },
                  upper: {
                    $add: [
                      '$$q3',
                      { $multiply: [IQR_MULTIPLIER, { $subtract: ['$$q3', '$$q1'] }] },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Keep only reports inside the fences
    {
      $addFields: {
        kept: {
          $filter: {
            input: '$reports',
            as: 'r',
            cond: {
              $and: [
                { $gte: ['$$r.price', '$bounds.lower'] },
                { $lte: ['$$r.price', '$bounds.upper'] },
              ],
            },
          },
        },
      },
    },

    {
      $addFields: {
        keptPrices: { $map: { input: '$kept', as: 'r', in: '$$r.price' } },
        weightSum: { $sum: '$kept.weight' },
        weightedTotal: {
          $sum: {
            $map: {
              input: '$kept',
              as: 'r',
              in: { $multiply: ['$$r.price', '$$r.weight'] },
            },
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        unit: '$_id.unit',
        source_type: '$_id.source',
        sample_size: { $size: '$kept' },
        outliers_removed: { $subtract: ['$total', { $size: '$kept' }] },
        average_price: { $round: [{ $divide: ['$weightedTotal', '$weightSum'] }, 2] },
        min_price: { $min: '$keptPrices' },
        max_price: { $max: '$keptPrices' },
      },
    },

    { $sort: { sample_size: -1 } },
  ];
}

function confidenceFor(sampleSize) {
  if (sampleSize >= 5) return 'high';
  if (sampleSize >= 3) return 'medium';
  return 'low';
}

/**
 * Returns price estimates for an item at a location (PSGC city/municipality code).
 * Falls back to the seeded baseline (supermarket) price when nobody has
 * reported anything in the last 14 days.
 */
async function getPriceEstimate({ itemId, locationCode, unit, sourceType, days = WINDOW_DAYS }) {
  const results = await PriceReport.aggregate(
    buildPipeline({ itemId, locationCode, unit, sourceType, days })
  );

  if (results.length > 0) {
    return {
      item_id: itemId,
      location_psgc_code: locationCode,
      window_days: days,
      origin: 'crowdsourced',
      estimates: results.map((r) => ({ ...r, confidence: confidenceFor(r.sample_size) })),
    };
  }

  const item = await Item.findById(itemId).select('default_name baseline_price baseline_unit');
  if (!item) return null;

  // Item exists but nobody has reported a price and there is no baseline yet
  if (item.baseline_price == null) {
    return { item_id: itemId, location_psgc_code: locationCode, window_days: days, origin: 'none', estimates: [] };
  }

  return {
    item_id: itemId,
    location_psgc_code: locationCode,
    window_days: days,
    origin: 'baseline',
    estimates: [
      {
        unit: item.baseline_unit,
        source_type: 'supermarket',
        sample_size: 0,
        outliers_removed: 0,
        average_price: item.baseline_price,
        min_price: item.baseline_price,
        max_price: item.baseline_price,
        confidence: 'low',
      },
    ],
  };
}

module.exports = { getPriceEstimate, buildPipeline, WINDOW_DAYS };
