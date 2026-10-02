import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { describeError, submitPriceReport } from '../api';
import { getDeviceUser } from '../deviceUser';
import { colors, fonts, radius } from '../theme';
import type { Item, Location, SourceType } from '../types';
import { Thumbnail } from './Thumbnail';

interface Props {
  visible: boolean;
  item: Item | null;
  location: Location;
  outletName: string;
  onClose: () => void;
  onSubmitted: (item: Item) => void;
}

export function ScannedPriceModal({ visible, item, location, outletName, onClose, onSubmitted }: Props) {
  const [price, setPrice] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('palengke');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPrice('');
    setSourceType('palengke');
    setError(null);
  }, [visible, item?._id]);

  const handleSubmit = async () => {
    const numericPrice = Number(price);
    if (!item) return;
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Enter a valid price greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const user = await getDeviceUser();
      await submitPriceReport({
        item_id: item._id,
        user_id: user._id,
        price: numericPrice,
        measurement_unit: item.baseline_unit,
        location_psgc_code: location.code,
        location_name: location.name,
        outlet_name: outletName.trim() || null,
        source_type: sourceType,
      });
      Alert.alert('Price reported', `${item.default_name} · ₱${numericPrice} per ${item.baseline_unit}`);
      onSubmitted(item);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Report this price</Text>
          {item && (
            <View style={styles.itemRow}>
              <Thumbnail uri={item.image_url} category={item.category} size={42} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.default_name}</Text>
                <Text style={styles.itemMeta}>Price per {item.baseline_unit}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>Price paid</Text>
          <View style={styles.priceField}>
            <Text style={styles.currency}>₱</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={(value) => setPrice(value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          <Text style={styles.label}>Market type</Text>
          <View style={styles.sourceRow}>
            {(['palengke', 'supermarket'] as const).map((source) => (
              <Pressable
                key={source}
                onPress={() => setSourceType(source)}
                style={[styles.sourceButton, sourceType === source && styles.sourceButtonActive]}
              >
                <Text style={[styles.sourceText, sourceType === source && styles.sourceTextActive]}>
                  {source === 'palengke' ? 'Palengke' : 'Supermarket'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.locationText} numberOfLines={2}>
            {outletName.trim() ? `${outletName.trim()} · ${location.name}` : location.name}
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={submitting} style={[styles.actionButton, styles.cancelButton]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={submitting || !item} style={[styles.actionButton, styles.submitButton]}>
              {submitting ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.submitText}>Submit price</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20 },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.cream, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 10, padding: 9, marginBottom: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cream },
  itemMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted, textTransform: 'uppercase', marginBottom: 6 },
  priceField: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 12, marginBottom: 14 },
  currency: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.accent },
  priceInput: { flex: 1, color: colors.cream, fontFamily: fonts.body, fontSize: 16, paddingVertical: 11, paddingHorizontal: 8 },
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sourceButton: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 10 },
  sourceButtonActive: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  sourceText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  sourceTextActive: { fontFamily: fonts.bodySemibold, color: colors.green },
  locationText: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginBottom: 12 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.red, backgroundColor: colors.redMuted, borderRadius: 8, padding: 8, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 42, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.faint, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  submitButton: { backgroundColor: colors.accent },
  submitText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },
});