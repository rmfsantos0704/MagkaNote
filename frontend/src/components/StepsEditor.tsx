import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface Props {
  steps: string[];
  onChange: (steps: string[]) => void;
}

const MAX_STEPS = 30;

export function StepsEditor({ steps, onChange }: Props) {
  const moveStep = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    onChange(reordered);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headingBlock}>
          <Text style={styles.heading}>Method</Text>
          <Text style={styles.count}>{steps.length}/{MAX_STEPS}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a step"
          disabled={steps.length >= MAX_STEPS}
          onPress={() => onChange([...steps, ''])}
          style={[styles.addButton, steps.length >= MAX_STEPS && styles.disabled]}
        >
          <Text style={styles.addText}>+ Step</Text>
        </Pressable>
      </View>

      {steps.length === 0 ? (
        <Text style={styles.empty}>No steps yet</Text>
      ) : (
        <View style={styles.list}>
          {steps.map((step, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
              <TextInput
                accessibilityLabel={`Step ${index + 1}`}
                style={styles.input}
                placeholder="Describe this step..."
                placeholderTextColor={colors.muted}
                value={step}
                onChangeText={(value) => onChange(steps.map((current, i) => (i === index ? value : current)))}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move step ${index + 1} up`}
                  disabled={index === 0}
                  onPress={() => moveStep(index, -1)}
                  style={[styles.action, index === 0 && styles.disabled]}
                >
                  <Text style={styles.actionText}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move step ${index + 1} down`}
                  disabled={index === steps.length - 1}
                  onPress={() => moveStep(index, 1)}
                  style={[styles.action, index === steps.length - 1 && styles.disabled]}
                >
                  <Text style={styles.actionText}>↓</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${index + 1}`}
                  onPress={() => onChange(steps.filter((_, i) => i !== index))}
                  style={styles.action}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10, marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingBlock: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heading: { fontSize: 15, fontFamily: fonts.bodySemibold, color: colors.cream },
  count: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  addButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius,
    backgroundColor: colors.accentMuted,
  },
  addText: { fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.accent },
  empty: { fontSize: 13, fontFamily: fonts.body, color: colors.muted, paddingVertical: 6 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  number: { width: 24, paddingTop: 10, fontSize: 12, fontFamily: fonts.bodySemibold, color: colors.accent },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 132,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.cream,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  actions: { gap: 4 },
  action: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 17, color: colors.cream },
  removeText: { fontSize: 22, color: colors.red },
  disabled: { opacity: 0.35 },
});