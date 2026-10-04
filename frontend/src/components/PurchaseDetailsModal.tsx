import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts } from '../theme';
import type { Item } from '../types';

export interface PurchaseDetails {
  purchase_outlet: string;
  purchase_price: string;
  purchase_weight_grams: string;
  purchase_quantity: string;
}

interface Props {
  item: Item;
  initialDetails: PurchaseDetails;
  onClose: () => void;
  onSave: (details: PurchaseDetails) => void;
}

export function PurchaseDetailsModal({ item, initialDetails, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(initialDetails);

  const update = (field: keyof PurchaseDetails, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const numericInput = (field: keyof PurchaseDetails, placeholder: string, value: string) => (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={value}
      onChangeText={(nextValue) => update(field, nextValue.replace(/[^0-9.]/g, ''))}
      keyboardType="decimal-pad"
    />
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Purchase details</Text>
            <Text style={styles.title}>{item.default_name}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Store or market</Text>
              <TextInput
                style={styles.input}
                placeholder="Where you bought it"
                placeholderTextColor={colors.muted}
                value={draft.purchase_outlet}
                onChangeText={(value) => update('purchase_outlet', value)}
                maxLength={120}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.label}>Price paid (₱)</Text>
                {numericInput('purchase_price', '0.00', draft.purchase_price)}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Weight (grams)</Text>
                {numericInput('purchase_weight_grams', 'e.g. 500', draft.purchase_weight_grams)}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Amount bought ({item.baseline_unit})</Text>
              {numericInput('purchase_quantity', 'How much you purchased', draft.purchase_quantity)}
            </View>
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onSave(draft)} style={[styles.button, styles.saveButton]}>
                <Text style={styles.saveText}>Save details</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  scroll: { width: '100%', maxWidth: 420, maxHeight: '94%', flexGrow: 0 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, gap: 10 },
  eyebrow: { fontSize: 10, fontFamily: fonts.bodySemibold, color: colors.accent, textTransform: 'uppercase' },
  title: { fontSize: 18, fontFamily: fonts.display, color: colors.cream, marginBottom: 2 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 5 },
  label: { fontSize: 11, fontFamily: fonts.bodySemibold, color: colors.muted },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 11 },
  cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveButton: { backgroundColor: colors.accent },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.cream },
  saveText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.onAccent },
});