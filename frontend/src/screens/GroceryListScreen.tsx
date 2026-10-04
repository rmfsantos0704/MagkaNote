import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addRecipesToGroceryList, clearGroceryList, deleteGroceryItem, describeError, getGroceryList, listRecipes, setGroceryItemChecked } from '../api';
import { getDeviceUser } from '../deviceUser';
import { peso } from '../format';
import { colors, fonts, radius } from '../theme';
import type { GroceryList, RecipeSummary } from '../types';

interface Props { onBack: () => void; }

export default function GroceryListScreen({ onBack }: Props) {
  const [list, setList] = useState<GroceryList | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDeviceUser()
      .then(async (user) => {
        const [current, ownRecipes] = await Promise.all([getGroceryList(user._id), listRecipes(user._id)]);
        if (cancelled) return;
        setUserId(user._id);
        setList(current);
        setRecipes(ownRecipes);
      })
      .catch((err) => { if (!cancelled) setError(describeError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const generate = async () => {
    if (!userId || recipes.length === 0) return;
    setBusy(true);
    setError(null);
    try { setList(await addRecipesToGroceryList(userId, recipes.map((recipe) => recipe._id))); }
    catch (err) { setError(describeError(err)); }
    finally { setBusy(false); }
  };

  const toggle = async (entryId: string, checked: boolean) => {
    if (!userId) return;
    try { setList(await setGroceryItemChecked(entryId, userId, checked)); }
    catch (err) { setError(describeError(err)); }
  };

  const remove = async (entryId: string) => {
    if (!userId) return;
    try { setList(await deleteGroceryItem(entryId, userId)); }
    catch (err) { setError(describeError(err)); }
  };

  const clear = () => Alert.alert('Clear grocery list?', 'This removes every item from your saved list.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: async () => {
      if (!userId) return;
      try { setList(await clearGroceryList(userId)); }
      catch (err) { setError(describeError(err)); }
    } },
  ]);

  const entries = list?.items ?? [];
  const total = entries.reduce((sum, entry) => sum + (entry.item_id?.baseline_price ?? 0) * entry.quantity, 0);
  const picked = entries.filter((entry) => entry.checked).length;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={onBack}><Text style={styles.back}>‹  My Recipes</Text></Pressable>
        <View style={styles.titleRow}><View><Text style={styles.eyebrow}>Smart basket</Text><Text style={styles.title}>Grocery List</Text></View>
          {!!entries.length && <Pressable onPress={clear} style={styles.clearButton}><Text style={styles.clearText}>Clear</Text></Pressable>}
        </View>
      </SafeAreaView>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <View><Text style={styles.label}>Baseline estimate</Text><Text style={styles.total}>{peso(total)}</Text></View>
            <Text style={styles.picked}>{picked}/{entries.length} picked</Text>
          </View>
          <Text style={styles.note}>Estimate uses catalog baseline prices for ingredients.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          {!entries.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your list is empty</Text><Text style={styles.emptyBody}>Add ingredients from your saved recipes to build a shopping list.</Text></View> : (
            <View style={styles.list}>
              {entries.map((entry) => {
                const name = entry.item_id?.default_name ?? 'Unavailable ingredient';
                const checked = entry.checked;
                return <View key={entry._id} style={styles.row}>
                  <Pressable onPress={() => toggle(entry._id, !checked)} style={[styles.checkbox, checked && styles.checkboxChecked]} accessibilityRole="checkbox" accessibilityState={{ checked }}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                  <Pressable style={styles.rowText} onPress={() => toggle(entry._id, !checked)}>
                    <Text style={[styles.name, checked && styles.done]}>{name}</Text>
                    <Text style={styles.meta}>{entry.quantity} {entry.measurement_unit}</Text>
                  </Pressable>
                  <Text style={styles.price}>{entry.item_id?.baseline_price != null ? peso(entry.item_id.baseline_price * entry.quantity) : '—'}</Text>
                  <Pressable onPress={() => remove(entry._id)} hitSlop={8} accessibilityLabel={`Remove ${name}`}><Text style={styles.remove}>×</Text></Pressable>
                </View>;
              })}
            </View>
          )}
          <Pressable onPress={generate} disabled={busy || recipes.length === 0} style={[styles.primary, (busy || recipes.length === 0) && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>＋  Add ingredients from my recipes</Text>}
          </Pressable>
          {recipes.length === 0 && <Text style={styles.note}>Save a recipe with ingredients to populate your list.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, paddingVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  eyebrow: { color: colors.accent, fontFamily: fonts.bodySemibold, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 },
  title: { color: colors.cream, fontFamily: fonts.display, fontSize: 24, marginTop: 2 },
  clearButton: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  clearText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 40 },
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.greenBorder, borderRadius: 16, padding: 15 },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  total: { color: colors.green, fontFamily: fonts.display, fontSize: 28, marginTop: 3 },
  picked: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 12, paddingBottom: 3 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 8, marginBottom: 14 },
  error: { color: colors.red, fontFamily: fonts.body, fontSize: 12, marginBottom: 12 },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 20 },
  emptyBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  list: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: colors.borderMed, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.bg, fontSize: 14, fontFamily: fonts.bodySemibold },
  rowText: { flex: 1 },
  name: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 12 },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
  price: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 12, minWidth: 48, textAlign: 'right' },
  remove: { color: colors.muted, fontSize: 22, paddingHorizontal: 4 },
  primary: { minHeight: 46, backgroundColor: colors.accent, borderRadius: radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  disabled: { opacity: 0.5 },
  primaryText: { color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 12 },
});
