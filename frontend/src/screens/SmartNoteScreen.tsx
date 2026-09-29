import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError, estimateRecipe, isCancel } from '../api';
import { IngredientRow } from '../components/IngredientRow';
import { IngredientSearch } from '../components/IngredientSearch';
import { LocationPicker } from '../components/LocationPicker';
import { TotalBar } from '../components/TotalBar';
import { defaultQtyFor, stepFor, type MeasurementUnit } from '../constants';
import { colors, fonts, radius } from '../theme';
import type { Item, Location, NoteEntry, RecipeEstimate, SourceType } from '../types';

export default function SmartNoteScreen() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [source, setSource] = useState<SourceType>('palengke');
  const [entries, setEntries] = useState<NoteEntry[]>([]);

  const [estimate, setEstimate] = useState<RecipeEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // First launch: nothing is selected, so open the picker right away instead
  // of showing a blank "no location" state.
  useEffect(() => {
    if (!location) setPickerOpen(true);
  }, [location]);

  // --- Live cost: re-estimate whenever ingredients, location or source change ---
  useEffect(() => {
    if (entries.length === 0 || !location) {
      setEstimate(null);
      setEstimateError(null);
      setEstimating(false);
      return;
    }

    const controller = new AbortController();
    setEstimating(true);

    // Small delay so tapping + several times sends one request, not five
    const timer = setTimeout(async () => {
      try {
        const result = await estimateRecipe(
          {
            location_code: location.code,
            source,
            items: entries.map((e) => ({
              item_id: e.item._id,
              quantity: e.quantity,
              measurement_unit: e.unit,
            })),
          },
          controller.signal
        );
        setEstimate(result);
        setEstimateError(null);
      } catch (err) {
        if (isCancel(err)) return;
        setEstimateError(describeError(err));
      } finally {
        if (!controller.signal.aborted) setEstimating(false);
      }
    }, 350);

    // A newer change supersedes this request
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [entries, location, source]);

  // --- Ingredient list actions ---
  const addItem = useCallback((item: Item) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.item._id === item._id);
      if (existing) {
        // Already in the note: add one more step instead of a duplicate row
        return prev.map((e) =>
          e === existing ? { ...e, quantity: e.quantity + stepFor(e.unit) } : e
        );
      }
      const unit = item.baseline_unit ?? 'kilo';
      return [...prev, { item, quantity: defaultQtyFor(unit), unit }];
    });
  }, []);

  const changeQuantity = useCallback((id: string, direction: 1 | -1) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.item._id !== id) return e;
        const step = stepFor(e.unit);
        const next = Math.round((e.quantity + direction * step) * 100) / 100;
        return { ...e, quantity: Math.max(step, next) };
      })
    );
  }, []);

  const changeUnit = useCallback((id: string, unit: MeasurementUnit) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.item._id === id && e.unit !== unit
          ? { ...e, unit, quantity: defaultQtyFor(unit) } // 0.5 "tali" makes no sense
          : e
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.item._id !== id));
  }, []);

  // Match an estimate line to a row. Requires the same quantity and unit so that
  // a row never shows the cost of an older quantity while the new one loads.
  const lineFor = (e: NoteEntry) =>
    estimate?.lines.find(
      (l) =>
        l.item_id === e.item._id && l.measurement_unit === e.unit && l.quantity === e.quantity
    );

  // Passed as an element (not a component function) so typing in the inputs
  // doesn't remount the header and drop keyboard focus.
  const header = (
    <View style={styles.header}>
      <Text style={styles.heading}>Smart Note</Text>

      <TextInput
        style={styles.titleInput}
        placeholder="Recipe name (e.g. Sinigang na Baboy)"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.sectionLabel}>Where are you shopping?</Text>
      <Pressable onPress={() => setPickerOpen(true)} style={styles.locationButton}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {location ? location.name : 'Choose your city or municipality'}
        </Text>
        <Text style={styles.locationChange}>Change</Text>
      </Pressable>

      <View style={styles.toggle}>
        {(['palengke', 'supermarket'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSource(s)}
            style={[styles.toggleButton, s === source && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, s === source && styles.toggleTextActive]}>
              {s === 'palengke' ? '🧺 Palengke' : '🏬 Supermarket'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Ingredients</Text>
      <IngredientSearch onSelect={addItem} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={entries}
          keyExtractor={(e) => e.item._id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Search for an ingredient above to start your note. The total updates as you add items.
            </Text>
          }
          renderItem={({ item: entry }) => (
            <IngredientRow
              entry={entry}
              line={lineFor(entry)}
              onQuantity={(d) => changeQuantity(entry.item._id, d)}
              onUnit={(u) => changeUnit(entry.item._id, u)}
              onRemove={() => removeItem(entry.item._id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        <TotalBar
          estimate={estimate}
          loading={estimating}
          error={estimateError}
          locationLabel={
            location ? `${location.name} · ${source === 'palengke' ? 'Palengke' : 'Supermarket'}` : 'No location selected'
          }
        />
      </KeyboardAvoidingView>

      <LocationPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  header: { gap: 10, marginBottom: 12 },
  heading: { fontFamily: fonts.displaySemibold, fontSize: 30, color: colors.cream },
  titleInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemibold,
    color: colors.muted,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationIcon: { fontSize: 16 },
  locationText: { flex: 1, fontSize: 15, color: colors.cream, fontFamily: fonts.bodyMedium },
  locationChange: { fontSize: 13, color: colors.accent, fontFamily: fonts.bodySemibold },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.faint,
    borderRadius: radius,
    padding: 3,
  },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: radius - 3, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.card },
  toggleText: { fontSize: 14, color: colors.muted, fontFamily: fonts.bodyMedium },
  toggleTextActive: { color: colors.accent },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.body, marginTop: 24, paddingHorizontal: 20 },
});
