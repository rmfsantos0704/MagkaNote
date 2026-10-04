import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError, getSavingsSummary } from '../api';
import { getDeviceUser } from '../deviceUser';
import { peso, relativeDate } from '../format';
import { colors, fonts, radius } from '../theme';
import type { SavingsSummary } from '../types';

interface Props { onBack: () => void; }

export default function SavingsScreen({ onBack }: Props) {
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDeviceUser()
      .then((user) => getSavingsSummary(user._id))
      .then((result) => { if (!cancelled) setSummary(result); })
      .catch((err) => { if (!cancelled) setError(describeError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <View style={styles.root}>
    <SafeAreaView edges={['top']} style={styles.header}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹  My Recipes</Text></Pressable>
      <Text style={styles.eyebrow}>Your impact</Text><Text style={styles.title}>Savings Dashboard</Text>
    </SafeAreaView>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : <ScrollView contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}
      {summary && <>
        <View style={styles.hero}><Text style={styles.label}>Estimated savings across recipes</Text><Text style={styles.total}>{peso(summary.total_estimated_savings)}</Text><Text style={styles.caption}>Based on your saved palengke and supermarket recipe estimates.</Text></View>
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{peso(summary.recent_estimated_savings)}</Text><Text style={styles.statLabel}>Saved in last 30 days</Text></View><View style={styles.stat}><Text style={styles.statValue}>{summary.recipe_count}</Text><Text style={styles.statLabel}>Recipes compared</Text></View></View>
        <Text style={styles.section}>Recipe comparisons</Text>
        {!summary.recipes.length ? <Text style={styles.empty}>Save a recipe after both price estimates load to see comparisons here.</Text> : summary.recipes.map((recipe) => <View key={recipe.recipe_id} style={styles.recipe}>
          <View style={styles.recipeTop}><Text style={styles.recipeName}>{recipe.title}</Text><Text style={styles.saved}>{peso(recipe.estimated_savings)}</Text></View>
          <Text style={styles.compare}>Palengke {peso(recipe.palengke_estimate)}  ·  Supermarket {peso(recipe.supermarket_estimate)}</Text>
          <Text style={styles.date}>{relativeDate(recipe.created_at)}</Text>
        </View>)}
      </>}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, paddingVertical: 6, marginBottom: 7 },
  eyebrow: { color: colors.accent, fontFamily: fonts.bodySemibold, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 },
  title: { color: colors.cream, fontFamily: fonts.display, fontSize: 24, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 40 },
  error: { color: colors.red, fontFamily: fonts.body, fontSize: 12, marginBottom: 12 },
  hero: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 17, padding: 16 },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  total: { color: colors.accent, fontFamily: fonts.display, fontSize: 38, marginTop: 2 },
  caption: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 5 },
  stats: { flexDirection: 'row', gap: 9, marginTop: 10, marginBottom: 21 },
  stat: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 12 },
  statValue: { color: colors.cream, fontFamily: fonts.display, fontSize: 17 },
  statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 4 },
  section: { color: colors.cream, fontFamily: fonts.bodySemibold, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6, marginBottom: 9 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, paddingVertical: 12 },
  recipe: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: 12, marginBottom: 8 },
  recipeTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  recipeName: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 12, flex: 1 },
  saved: { color: colors.green, fontFamily: fonts.bodySemibold, fontSize: 13 },
  compare: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 7 },
  date: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 4 },
});
