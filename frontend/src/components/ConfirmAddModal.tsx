import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import type { Item } from '../types';
import { Thumbnail } from './Thumbnail';

interface Props {
  visible: boolean;
  item: Item | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small centered confirmation sheet: "Add this to your recipe?" */
export function ConfirmAddModal({ visible, item, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add to your recipe?</Text>

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

          <View style={styles.buttonRow}>
            <Pressable onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
              <Text style={styles.confirmText}>Add</Text>
            </Pressable>
          </View>
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
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.faint, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  confirmButton: { backgroundColor: colors.accent },
  confirmText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },
});