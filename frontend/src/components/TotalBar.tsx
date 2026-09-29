import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { peso } from '../format';
import { colors } from '../theme';
import type { RecipeEstimate } from '../types';

interface Props {
  estimate: RecipeEstimate | null;
  loading: boolean;
  error: string | null;
  locationLabel: string;
}

export function TotalBar({ estimate, loading, error, locationLabel }: Props) {
  const total = estimate?.total;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Estimated total</Text>
          <Text style={styles.zone}>{locationLabel}</Text>
        </View>

        <View style={styles.amountBlock}>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          <Text style={[styles.amount, loading && styles.dim]}>
            {total ? `≈ ${peso(total.estimated)}` : '₱0.00'}
          </Text>
        </View>
      </View>

      {total && total.low !== total.high && (
        <Text style={styles.range}>
          Likely between {peso(total.low)} and {peso(total.high)}
        </Text>
      )}

      {estimate && estimate.unpriced_count > 0 && (
        <Text style={styles.warning}>
          {estimate.unpriced_count} item{estimate.unpriced_count > 1 ? 's' : ''} without a price
          yet, not included in the total.
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  zone: { fontSize: 12, color: colors.muted },
  amountBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 26, fontWeight: '800', color: colors.primary },
  dim: { opacity: 0.5 },
  range: { fontSize: 12, color: colors.muted },
  warning: { fontSize: 12, color: colors.accent },
  error: { fontSize: 12, color: colors.danger },
});
