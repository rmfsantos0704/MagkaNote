import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { describeError, getRecipe, listRecipes, toggleFavorite } from '../api';
import { RecipeThumb } from '../components/RecipeThumb';
import { Tag } from '../components/Tag';
import { getDeviceUser } from '../deviceUser';
import { getCommunityRecipeCopies, toRecipeSummary, type CommunityRecipeCopy } from '../communityCopies';
import { peso, relativeDate } from '../format';
import { colors, fonts, radius } from '../theme';
import type { RecipeDetail, RecipeSummary } from '../types';

interface Props {
  onNew: () => void;
  onEditRecipe: (id: string, title: string, notes?: string, copy?: CommunityRecipeCopy) => void;
}

interface RecipeFrame {
  x: number;
  y: number;
  width: number;
  height: number;
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

export default function DashboardScreen({ onNew, onEditRecipe }: Props) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [communityCopies, setCommunityCopies] = useState<CommunityRecipeCopy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<CommunityRecipeCopy | null>(null);
  const [recipeDetail, setRecipeDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [origin, setOrigin] = useState<RecipeFrame>({ x: 0, y: 0, width: 1, height: 1 });
  const cardRefs = React.useRef<Record<string, View | null>>({});
  const modalProgress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let localCopies: CommunityRecipeCopy[] = [];
      try {
        localCopies = await getCommunityRecipeCopies();
        const communitySummaries = localCopies.map(toRecipeSummary);
        if (!cancelled) setCommunityCopies(localCopies);
        const user = await getDeviceUser();
        const list = await listRecipes(user._id);
        if (!cancelled) setRecipes(sortRecipes([...communitySummaries, ...list]));
      } catch (err) {
        if (!cancelled) {
          const communitySummaries = localCopies.map(toRecipeSummary);
          if (communitySummaries.length > 0) setRecipes(sortRecipes(communitySummaries));
          else setError(describeError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openRecipe = (recipe: RecipeSummary) => {
    const show = (frame: RecipeFrame) => {
      const copy = communityCopies.find((candidate) => `community-copy:${candidate.id}` === recipe._id) ?? null;
      setOrigin(frame);
      setSelectedRecipe(recipe);
      setSelectedCopy(copy);
      setRecipeDetail(null);
      setDetailError(null);
      setDetailLoading(!copy);
      modalProgress.setValue(0);
      setModalVisible(true);
      requestAnimationFrame(() => {
        Animated.spring(modalProgress, { toValue: 1, useNativeDriver: false, stiffness: 190, damping: 24, mass: 0.85 }).start();
      });

      if (copy) return;
      getRecipe(recipe._id)
        .then(setRecipeDetail)
        .catch((err: unknown) => setDetailError(describeError(err)))
        .finally(() => setDetailLoading(false));
    };

    const card = cardRefs.current[recipe._id];
    if (card) card.measureInWindow((x, y, width, height) => show({ x, y, width, height }));
    else show({ x: (viewportWidth - 120) / 2, y: (viewportHeight - 100) / 2, width: 120, height: 100 });
  };

  const closeRecipe = () => {
    Animated.spring(modalProgress, { toValue: 0, useNativeDriver: false, stiffness: 190, damping: 24, mass: 0.85 }).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setSelectedRecipe(null);
        setSelectedCopy(null);
      }
    });
  };

  const editSelectedRecipe = () => {
    if (!selectedRecipe) return;
    const recipe = selectedRecipe;
    const copiedNotes = selectedCopy ? [
      selectedCopy.ingredients?.length
        ? `Ingredients\n${selectedCopy.ingredients.map((ingredient) => `- ${ingredient.name}: ${ingredient.amount}`).join('\n')}`
        : '',
      selectedCopy.steps?.length
        ? `Method\n${selectedCopy.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n') : undefined;
    setModalVisible(false);
    setSelectedRecipe(null);
    onEditRecipe(recipe._id, recipe.title, copiedNotes, selectedCopy ?? undefined);
  };

  const modalWidth = Math.min(viewportWidth - 32, 460);
  const modalHeight = Math.min(viewportHeight - 80, 720);
  const modalLeft = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.x, (viewportWidth - modalWidth) / 2] });
  const modalTop = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.y, (viewportHeight - modalHeight) / 2] });
  const modalCardWidth = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.width, modalWidth] });
  const modalCardHeight = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.height, modalHeight] });
  const modalRadius = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [12, radius] });

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

  const detailIngredients = selectedCopy?.ingredients ?? recipeDetail?.items
    .filter((line) => line.item_id)
    .map((line) => ({
      name: line.item_id.default_name,
      amount: `${line.quantity} ${line.measurement_unit}`,
    })) ?? [];

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
            <RecipeCard
              item={item}
              onOpen={() => openRecipe(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
              setCardRef={(ref) => { cardRefs.current[item._id] = ref; }}
            />
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeRecipe}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRecipe} accessibilityLabel="Dismiss recipe details">
            <Animated.View style={[styles.modalBackdrop, { opacity: modalProgress }]} />
          </Pressable>
          {selectedRecipe && (
            <Animated.View
              style={[
                styles.modalCard,
                {
                  left: modalLeft,
                  top: modalTop,
                  width: modalCardWidth,
                  height: modalCardHeight,
                  borderRadius: modalRadius,
                },
              ]}
            >
              <View style={styles.detailHero}>
                {selectedRecipe.image_url ? (
                  <ImageBackground source={{ uri: selectedRecipe.image_url }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.detailPlaceholder}>
                    <RecipeThumb title={selectedRecipe.title} category={selectedRecipe.category} size={60} />
                  </View>
                )}
                <View style={styles.detailHeroShade} />
                <Pressable onPress={closeRecipe} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close recipe details">
                  <Text style={styles.closeIcon}>×</Text>
                </Pressable>
                <View style={styles.detailHeroText}>
                  <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                  <Text style={styles.detailSubtitle}>
                    {[selectedRecipe.category, selectedRecipe.difficulty].filter(Boolean).join(' · ') || 'My recipe'}
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailMeta}>
                  <View><Text style={styles.detailMetaLabel}>Serves</Text><Text style={styles.detailMetaValue}>{selectedRecipe.servings ?? '—'}</Text></View>
                  <View><Text style={styles.detailMetaLabel}>Estimated cost</Text><Text style={styles.detailCost}>{peso(selectedRecipe.total_estimated_cost)}</Text></View>
                  <View><Text style={styles.detailMetaLabel}>Prep time</Text><Text style={styles.detailMetaValue}>{selectedRecipe.prep_time ?? '—'}</Text></View>
                </View>
                {!!selectedRecipe.outlet_name && (
                  <View style={styles.detailOutlet}>
                    <Text style={styles.detailMetaLabel}>Buying at</Text>
                    <Text style={styles.detailMetaValue}>{selectedRecipe.outlet_name}</Text>
                  </View>
                )}

                {detailLoading ? (
                  <View style={styles.detailStatus}><ActivityIndicator color={colors.accent} /><Text style={styles.detailStatusText}>Loading recipe…</Text></View>
                ) : detailError ? (
                  <Text style={styles.detailError}>{detailError}</Text>
                ) : (
                  <>
                    <Text style={styles.detailSectionTitle}>Ingredients</Text>
                    {detailIngredients.length > 0 ? (
                      <View style={styles.ingredientList}>
                        {detailIngredients.map((ingredient, index) => (
                          <View key={`${ingredient.name}-${index}`} style={styles.ingredientLine}>
                            <View style={styles.ingredientBullet} />
                            <Text style={styles.ingredientName}>{ingredient.name}</Text>
                            <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.detailStatusText}>No ingredients have been added yet.</Text>
                    )}

                    {!!selectedCopy?.steps?.length && (
                      <>
                        <Text style={styles.detailSectionTitle}>Method</Text>
                        <View style={styles.stepsList}>
                          {selectedCopy.steps.map((step, index) => (
                            <View key={`${index}-${step}`} style={styles.stepRow}>
                              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                              <Text style={styles.stepText}>{step}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {!!recipeDetail?.notes && (
                      <>
                        <Text style={styles.detailSectionTitle}>Notes</Text>
                        <Text style={styles.detailNotes}>{recipeDetail.notes}</Text>
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.detailFooter}>
                <Pressable onPress={editSelectedRecipe} style={styles.editButton} accessibilityRole="button">
                  <Text style={styles.editButtonText}>Edit Recipe</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>

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
  setCardRef,
}: {
  item: RecipeSummary;
  onOpen: () => void;
  onToggleFavorite: () => void;
  setCardRef: (ref: View | null) => void;
}) {
  const savings =
    item.total_supermarket_cost != null ? Math.max(0, item.total_supermarket_cost - item.total_estimated_cost) : null;
  const tagLabel = item.category ?? item.difficulty;

  return (
    <Pressable ref={setCardRef} collapsable={false} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View ${item.title}`} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImage}>
            <RecipeThumb title={item.title} category={item.category} size={56} />
          </View>
        )}
        <View style={styles.cardScrim} />

        <Pressable onPress={(event) => { event.stopPropagation(); onToggleFavorite(); }} hitSlop={8} style={styles.starButton}>
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
            {!!item.outlet_name && <Text style={styles.cardOutlet} numberOfLines={1}>{item.outlet_name}</Text>}
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
    ...StyleSheet.absoluteFill,
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
  cardOutlet: { fontSize: 9, fontFamily: fonts.bodyMedium, color: colors.green, maxWidth: 100, textAlign: 'right', marginTop: 2 },

  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  modalCard: { position: 'absolute', overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMed },
  detailHero: { height: 210, justifyContent: 'flex-end', backgroundColor: colors.cardAlt },
  detailPlaceholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  detailHeroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,26,16,0.34)' },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,26,16,0.8)', borderWidth: 1, borderColor: colors.borderMed },
  closeIcon: { color: colors.cream, fontSize: 25, lineHeight: 27 },
  detailHeroText: { paddingHorizontal: 18, paddingBottom: 16 },
  detailTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 28 },
  detailSubtitle: { color: 'rgba(245,239,224,0.78)', fontSize: 12, marginTop: 3 },
  detailScroll: { flex: 1 },
  detailContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 },
  detailMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailMetaLabel: { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  detailMetaValue: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 13 },
  detailCost: { color: colors.green, fontFamily: fonts.display, fontSize: 17 },
  detailOutlet: { paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16, borderRadius: 10, backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder },
  detailSectionTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 21, marginBottom: 10, marginTop: 2 },
  ingredientList: { marginBottom: 20 },
  ingredientLine: { flexDirection: 'row', alignItems: 'center', minHeight: 34, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 9 },
  ingredientBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  ingredientName: { flex: 1, color: colors.cream, fontSize: 12 },
  ingredientAmount: { color: colors.muted, fontSize: 11, textAlign: 'right', maxWidth: '54%' },
  stepsList: { gap: 13, marginBottom: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accentBorder },
  stepNumberText: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 11 },
  stepText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18, paddingTop: 2 },
  detailNotes: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  detailStatus: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  detailStatusText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  detailError: { color: colors.red, fontSize: 12, lineHeight: 18, paddingVertical: 20 },
  detailFooter: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  editButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accent },
  editButtonText: { color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 13 },

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