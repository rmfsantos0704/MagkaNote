import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { peso } from '../format';
import { colors, fonts, radius } from '../theme';
import type { Item } from '../types';
import { Thumbnail } from './Thumbnail';

interface Props {
  visible: boolean;
  item: Item | null;
  onConfirm: () => void;
  onCancel: () => void;
  onReportPrice?: () => void;
  priceEstimates?: { loading: boolean; palengke: number | null; supermarket: number | null };
}

/** Small centered confirmation sheet: "Add this to your recipe?" */
export function ConfirmAddModal({ visible, item, onConfirm, onCancel, onReportPrice, priceEstimates }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{onReportPrice ? 'Barcode found' : 'Add to your recipe?'}</Text>

          {item && (
            <View style={styles.itemRow}>
              <Thumbnail uri={item.image_url} category={item.category} size={48} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.default_name}
                </Text>
                <Text style={styles.itemMeta}>per {item.baseline_unit}</Text>
              </View>
            </View>
          )}

          {priceEstimates && (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateTitle}>Local price estimate · per {item?.baseline_unit}</Text>
              {priceEstimates.loading ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Palengke</Text>
                    <Text style={styles.estimateValue}>
                      {priceEstimates.palengke == null ? 'No reports yet' : peso(priceEstimates.palengke)}
                    </Text>
                  </View>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Supermarket</Text>
                    <Text style={styles.estimateValue}>
                      {priceEstimates.supermarket == null ? 'No reports yet' : peso(priceEstimates.supermarket)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {onReportPrice ? (
            <>
              <View style={styles.buttonRow}>
                <Pressable onPress={onReportPrice} style={[styles.button, styles.reportButton]}>
                  <Text style={styles.reportText}>Report price</Text>
                </Pressable>
                <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
                  <Text style={styles.confirmText}>Add</Text>
                </Pressable>
              </View>
              <Pressable onPress={onCancel} style={styles.cancelLink}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable onPress={onCancel} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
                <Text style={styles.confirmText}>Add</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.cream, marginBottom: 14 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 18,
  },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.cream },
  itemMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  estimateBox: { backgroundColor: colors.surface, borderRadius: 10, padding: 10, gap: 7, marginBottom: 16 },
  estimateTitle: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.muted, textTransform: 'uppercase' },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  estimateValue: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.cream },
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.faint, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  cancelLink: { alignItems: 'center', paddingTop: 12 },
  reportButton: { backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accentBorder },
  reportText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.accent },
  confirmButton: { backgroundColor: colors.accent },
  confirmText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },
});