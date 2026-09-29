import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MEASUREMENT_UNITS, stepFor, type MeasurementUnit } from '../constants';
import { peso, qty } from '../format';
import { colors, radius } from '../theme';
import type { EstimateLine, NoteEntry } from '../types';
import { Thumbnail } from './Thumbnail';

interface Props {
  entry: NoteEntry;
  /** The estimate for this row, or undefined while it is still loading. */
  line?: EstimateLine;
  onQuantity: (direction: 1 | -1) => void;
  onUnit: (unit: MeasurementUnit) => void;
  onRemove: () => void;
}

const REASONS: Record<string, (unit: string) => string> = {
  no_price_data: () => 'No price yet for this item',
  no_price_in_this_unit: (unit) => `No price reported per ${unit} yet`,
  item_not_found: () => 'This item no longer exists',
};

export function IngredientRow({ entry, line, onQuantity, onUnit, onRemove }: Props) {
  const { item, quantity, unit } = entry;
  const atMinimum = quantity <= stepFor(unit);

  return (
    <View style={styles.card}>
      {/* Top: photo, name, cost, remove */}
      <View style={styles.top}>
        <Thumbnail uri={item.image_url} category={item.category} />
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {item.default_name}
          </Text>
          {line?.priced && (
            <Text style={styles.source}>
              {line.origin === 'crowdsourced' ? 'Community prices' : 'Supermarket baseline'}
              {line.unit_price !== undefined ? ` · ${peso(line.unit_price)}/${unit}` : ''}
            </Text>
          )}
        </View>

        <View style={styles.costBlock}>
          {!line && <Text style={styles.costMuted}>…</Text>}
          {line?.priced && line.cost !== undefined && (
            <>
              <Text style={styles.cost}>{peso(line.cost)}</Text>
              {line.cost_low !== line.cost_high && (
                <Text style={styles.range}>
                  {peso(line.cost_low ?? 0)}–{peso(line.cost_high ?? 0)}
                </Text>
              )}
            </>
          )}
          {line && !line.priced && <Text style={styles.costMuted}>—</Text>}
        </View>

        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Text style={styles.removeText}>✕</Text>
        </Pressable>
      </View>

      {line && !line.priced && (
        <Text style={styles.warning}>
          {(REASONS[line.reason ?? 'no_price_data'] ?? REASONS.no_price_data)(unit)}
        </Text>
      )}

      {/* Quantity stepper */}
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onQuantity(-1)}
          disabled={atMinimum}
          style={[styles.stepButton, atMinimum && styles.stepDisabled]}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.quantity}>
          {qty(quantity)} {unit}
        </Text>
        <Pressable onPress={() => onQuantity(1)} style={styles.stepButton}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      {/* Unit chips (kilo, tali, guhit, piraso...) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {MEASUREMENT_UNITS.map((u) => (
          <Pressable
            key={u}
            onPress={() => onUnit(u)}
            style={[styles.chip, u === unit && styles.chipActive]}
          >
            <Text style={[styles.chipText, u === unit && styles.chipTextActive]}>{u}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  source: { fontSize: 11, color: colors.muted, marginTop: 2 },
  costBlock: { alignItems: 'flex-end', minWidth: 70 },
  cost: { fontSize: 16, fontWeight: '700', color: colors.primary },
  costMuted: { fontSize: 16, color: colors.muted },
  range: { fontSize: 10, color: colors.muted },
  remove: { padding: 4 },
  removeText: { fontSize: 16, color: colors.muted },
  warning: {
    fontSize: 12,
    color: colors.accent,
    backgroundColor: colors.warnBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  quantity: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 90, textAlign: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.muted },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
