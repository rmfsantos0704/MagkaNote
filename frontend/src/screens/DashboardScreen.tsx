import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { describeError, listRecipes, toggleFavorite } from '../api';
import { RecipeThumb } from '../components/RecipeThumb';
import { Tag } from '../components/Tag';
import { getDeviceUser } from '../deviceUser';
import { peso, relativeDate } from '../format';
import { colors, fonts, radius } from '../theme';
import type { RecipeSummary } from '../types';

interface Props {
  onNew: () => void;
  onOpenRecipe: (id: string) => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Magandang umaga 👋';
  if (h < 18) return 'Magandang hapon 👋';
  return 'Magandang gabi 👋';
}

/** Keeps favorites pinned to the top, newest first within each group. */
function sortRecipes(list: RecipeSummary[]): RecipeSummary[] {
  return [...list].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function DashboardScreen({ onNew, onOpenRecipe }: Props) {
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getDeviceUser();
        const list = await listRecipes(user._id);
        if (!cancelled) setRecipes(sortRecipes(list));
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleFavorite = async (recipe: RecipeSummary) => {
    const next = !recipe.is_favorite;
    // Optimistic update so the star (and re-sort) responds instantly
    setRecipes((prev) =>
      prev ? sortRecipes(prev.map((r) => (r._id === recipe._id ? { ...r, is_favorite: next } : r))) : prev
    );
    try {
      const user = await getDeviceUser();
      await toggleFavorite(recipe._id, user._id, next);
    } catch {
      // Revert on failure
      setRecipes((prev) =>
        prev ? sortRecipes(prev.map((r) => (r._id === recipe._id ? { ...r, is_favorite: !next } : r))) : prev
      );
    }
  };

  const categories = useMemo(() => {
    if (!recipes) return ['All'];
    const found = Array.from(new Set(recipes.map((r) => r.category).filter(Boolean))) as string[];
    return ['All', ...found.sort()];
  }, [recipes]);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const q = search.trim().toLowerCase();
    return recipes.filter(
      (r) =>
        (category === 'All' || r.category === category) &&
        (!q || r.title.toLowerCase().includes(q))
    );
  }, [recipes, search, category]);

  const stats = useMemo(() => {
    const list = recipes ?? [];
    const totalCost = list.reduce((sum, r) => sum + r.total_estimated_cost, 0);
    const totalItems = list.reduce((sum, r) => sum + r.item_count, 0);
    return { count: list.length, totalCost, totalItems };
  }, [recipes]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>{greeting()}</Text>
            <Text style={styles.heading}>My Recipes</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 16 }}>🥘</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard value={String(stats.count)} label="Recipes" color={colors.cream} />
          <StatCard value={peso(stats.totalCost)} label="Total Est." color={colors.green} />
          <StatCard value={String(stats.totalItems)} label="Ingredients" color={colors.accent} />
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.search}
            placeholder="Search recipes…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.categoryChip, c === category && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, c === category && styles.categoryTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {error && (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {!error && recipes === null && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!error && recipes !== null && (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r._id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🧺</Text>
              <Text style={styles.emptyText}>
                {recipes.length === 0 ? "You haven't made any notes yet." : 'No recipes match that search.'}
              </Text>
              {recipes.length === 0 && (
                <Pressable onPress={onNew} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Create your first recipe →</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <RecipeCard item={item} onOpen={() => onOpenRecipe(item._id)} onToggleFavorite={() => handleToggleFavorite(item)} />
          )}
        />
      )}

      <Pressable onPress={onNew} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function RecipeCard({
  item,
  onOpen,
  onToggleFavorite,
}: {
  item: RecipeSummary;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const savings =
    item.total_supermarket_cost != null ? Math.max(0, item.total_supermarket_cost - item.total_estimated_cost) : null;
  const tagLabel = item.category ?? item.difficulty;

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImage}>
            <RecipeThumb title={item.title} category={item.category} size={56} />
          </View>
        )}
        <View style={styles.cardScrim} />

        <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.starButton}>
          <Text style={[styles.starIcon, item.is_favorite && styles.starIconActive]}>
            {item.is_favorite ? '★' : '☆'}
          </Text>
        </Pressable>

        {tagLabel && (
          <View style={styles.cardTagWrap}>
            <Tag label={tagLabel} color={colors.cream} background="rgba(12,26,16,0.75)" />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.flexShrink}>
            <Text style={styles.cardCost}>{peso(item.total_estimated_cost)}</Text>
            {savings !== null && savings > 0 && (
              <Text style={styles.cardSave}>save {peso(savings)} vs SM</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardMeta}>
              {item.servings ? `${item.servings} servings` : `${item.item_count} items`}
              {item.servings && item.prep_time ? ` · ${item.prep_time}` : ''}
            </Text>
            <Text style={styles.cardDate}>{relativeDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const CARD_GAP = 12;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flexShrink: { flexShrink: 1 },
  header: { paddingHorizontal: 18, paddingTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heading: { fontFamily: fonts.display, fontSize: 24, color: colors.cream, marginTop: 3 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentMuted,
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.display, fontSize: 16 },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchWrap: { position: 'relative', justifyContent: 'center', marginBottom: 10 },
  searchIcon: {
    position: 'absolute',
    left: 13,
    fontSize: 16,
    color: colors.muted,
    zIndex: 1,
    fontWeight: '600',
  },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingLeft: 36,
    paddingRight: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  categoryScroll: { marginBottom: 6 },
  categoryChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 7,
  },
  categoryChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryText: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  categoryTextActive: { color: colors.onAccent, fontFamily: fonts.bodySemibold },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  error: { color: colors.danger, fontFamily: fonts.body, textAlign: 'center' },
  emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  emptyButton: {
    marginTop: 14,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 12 },

  gridContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 100 },
  gridRow: { gap: CARD_GAP },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
  },
  cardPressed: { borderColor: colors.borderMed },

  cardImageWrap: { height: 130, backgroundColor: colors.cardAlt },
  cardImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,26,16,0.28)',
  },
  starButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(12,26,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: { fontSize: 15, color: colors.cream, lineHeight: 16 },
  starIconActive: { color: colors.accent },
  cardTagWrap: { position: 'absolute', bottom: 8, left: 8 },

  cardBody: { padding: 10 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cream, lineHeight: 17, marginBottom: 8 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardCost: { fontFamily: fonts.display, fontSize: 16, color: colors.accent },
  cardSave: { fontSize: 9, fontFamily: fonts.body, color: colors.muted, marginTop: 1 },
  cardMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.muted, textAlign: 'right' },
  cardDate: { fontSize: 9, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { fontSize: 26, color: colors.onAccent, fontFamily: fonts.bodyMedium, marginTop: -2 },
});