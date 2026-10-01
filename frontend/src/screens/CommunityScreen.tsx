import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
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
import { colors, fonts, radius } from '../theme';
import { peso } from '../format';
import { addCommunityRecipeCopy, getCommunityRecipeCopies } from '../communityCopies';

interface CommunityRecipe {
  id: number;
  title: string;
  author: string;
  area: string;
  image: string;
  cost: number;
  saves: number;
  likes: number;
  tags: string[];
  timeAgo: string;
  servings: number;
  verified: boolean;
  ingredients: { name: string; amount: string }[];
  steps: string[];
}

const RECIPES: CommunityRecipe[] = [
  { id: 1, title: 'Kare-Kare', author: 'Nena Reyes', area: 'Pampanga', image: 'https://images.unsplash.com/photo-1537495988501-f9cd94a78f3e?w=800&h=500&fit=crop&auto=format', cost: 320, saves: 148, likes: 312, tags: ['Classic', 'Festive'], timeAgo: '2h ago', servings: 6, verified: true, ingredients: [{ name: 'Oxtail', amount: '1 kg, cut into pieces' }, { name: 'Beef tripe', amount: '500 g, cleaned' }, { name: 'Peanut butter', amount: '3/4 cup' }, { name: 'Ground rice', amount: '1/3 cup, toasted' }, { name: 'Annatto seeds', amount: '2 tbsp' }, { name: 'Eggplant', amount: '2, sliced' }, { name: 'String beans', amount: '1 bunch, trimmed' }, { name: 'Pechay', amount: '1 bunch' }, { name: 'Onion and garlic', amount: '1 onion, 5 cloves' }, { name: 'Bagoong alamang', amount: 'To serve' }], steps: ['Simmer oxtail and tripe with onion until tender, about 2 to 3 hours, skimming the broth. Reserve 5 cups of broth.', 'Steep annatto seeds in hot water for 10 minutes, then strain. Stir the colored water and peanut butter into the reserved broth.', 'Whisk toasted ground rice with a little broth, then add it to the pot. Simmer until the sauce coats a spoon.', 'Saute garlic, then add the sauce and tender meat. Simmer gently for 10 minutes.', 'Blanch eggplant, string beans, and pechay until just tender. Serve with the kare-kare and bagoong on the side.'] },
  { id: 2, title: 'Beef Bulalo', author: 'Jun dela Cruz', area: 'Batangas', image: 'https://images.unsplash.com/photo-1512003867696-6d5ce6835040?w=800&h=500&fit=crop&auto=format', cost: 285, saves: 97, likes: 204, tags: ['Sabaw', 'Hearty'], timeAgo: '5h ago', servings: 4, verified: false, ingredients: [{ name: 'Beef shanks with marrow', amount: '1.5 kg' }, { name: 'Onion', amount: '1 large, quartered' }, { name: 'Whole peppercorns', amount: '1 tsp' }, { name: 'Corn', amount: '2 ears, cut into thirds' }, { name: 'Potatoes', amount: '2, quartered' }, { name: 'Napa cabbage', amount: '1/2 head' }, { name: 'Pechay', amount: '1 bunch' }, { name: 'Fish sauce', amount: '2 tbsp, or to taste' }, { name: 'Calamansi and chili', amount: 'To serve' }], steps: ['Cover beef shanks with cold water. Bring to a boil for 10 minutes, then discard the water and rinse the meat and pot.', 'Return the beef to the pot with fresh water, onion, and peppercorns. Simmer gently for 2 to 3 hours until the meat is tender.', 'Add corn and potatoes. Simmer for 15 minutes, until the potatoes are cooked through.', 'Season the broth with fish sauce. Add cabbage and pechay and cook just until wilted.', 'Serve hot with calamansi, fish sauce, and sliced chili on the side.'] },
  { id: 3, title: 'Laing', author: 'Ate Mariz', area: 'Bicol', image: 'https://images.unsplash.com/photo-1615444814488-f0b1952b2f27?w=800&h=500&fit=crop&auto=format', cost: 145, saves: 74, likes: 189, tags: ['Spicy', 'Vegan'], timeAgo: '1d ago', servings: 5, verified: true, ingredients: [{ name: 'Dried taro leaves', amount: '100 g' }, { name: 'Coconut milk', amount: '2 cups' }, { name: 'Coconut cream', amount: '1 cup' }, { name: 'Ginger', amount: '2 tbsp, julienned' }, { name: 'Garlic', amount: '5 cloves, minced' }, { name: 'Onion', amount: '1 small, sliced' }, { name: 'Dried shrimp', amount: '1/4 cup, optional' }, { name: 'Bird’s eye chilies', amount: '4 to 6, whole' }, { name: 'Fish sauce or salt', amount: 'To taste' }], steps: ['Combine coconut milk, ginger, garlic, onion, dried shrimp if using, and chilies in a pot. Bring to a gentle simmer.', 'Add the dried taro leaves. Do not stir for the first 10 minutes; let the leaves soften into the liquid.', 'Simmer uncovered on low heat for 30 to 40 minutes, stirring gently once the leaves have softened.', 'Pour in coconut cream and continue simmering until thick and the oil begins to separate.', 'Season to taste and serve with steamed rice.'] },
  { id: 4, title: 'Palabok', author: 'Lolo Berto', area: 'Bulacan', image: 'https://images.unsplash.com/photo-1767334573903-f280cb211993?w=800&h=500&fit=crop&auto=format', cost: 198, saves: 211, likes: 445, tags: ['Noodles', 'Party'], timeAgo: '2d ago', servings: 8, verified: true, ingredients: [{ name: 'Rice noodles', amount: '500 g' }, { name: 'Shrimp', amount: '250 g, peeled; reserve shells' }, { name: 'Ground pork', amount: '200 g' }, { name: 'Pork broth', amount: '4 cups' }, { name: 'Annatto powder', amount: '1 tbsp' }, { name: 'Fish sauce', amount: '2 tbsp' }, { name: 'Cornstarch', amount: '2 tbsp, mixed with water' }, { name: 'Calamansi', amount: '4 pieces' }, { name: 'Hard-boiled eggs', amount: '3, sliced' }, { name: 'Chicharon and spring onion', amount: 'Crushed and chopped, for topping' }], steps: ['Soak rice noodles in warm water until pliable, then boil until tender. Drain and arrange on a serving platter.', 'Simmer shrimp shells in the pork broth for 10 minutes, then strain. Stir annatto powder into the broth.', 'Brown ground pork in a pan. Add the colored broth and fish sauce, then simmer for 10 minutes.', 'Stir in the cornstarch slurry a little at a time until the sauce is thick and glossy. Add peeled shrimp and cook until pink.', 'Pour sauce over the noodles. Top with sliced eggs, crushed chicharon, spring onion, and calamansi.'] },
  { id: 5, title: 'Nilaga', author: 'Inay Tess', area: 'Quezon City', image: 'https://images.unsplash.com/photo-1707271914006-627b89038143?w=800&h=500&fit=crop&auto=format', cost: 175, saves: 63, likes: 141, tags: ['Comfort', 'Light'], timeAgo: '3d ago', servings: 5, verified: false, ingredients: [{ name: 'Beef brisket or shank', amount: '1 kg, cubed' }, { name: 'Onion', amount: '1 large, quartered' }, { name: 'Whole peppercorns', amount: '1 tsp' }, { name: 'Potatoes', amount: '3, quartered' }, { name: 'Corn', amount: '2 ears, cut into chunks' }, { name: 'Cabbage', amount: '1/2 head, wedged' }, { name: 'Pechay', amount: '1 bunch' }, { name: 'Fish sauce', amount: '2 tbsp, or to taste' }], steps: ['Place beef in a pot and cover with cold water. Bring to a boil, skim the foam, then lower to a steady simmer.', 'Add onion and peppercorns. Cover loosely and simmer for 2 to 2.5 hours, adding water if needed, until beef is tender.', 'Add potatoes and corn and simmer for 15 minutes, until fork-tender.', 'Season the broth with fish sauce. Add cabbage and pechay and cook for 3 to 4 minutes.', 'Serve hot with rice and a dipping sauce of fish sauce, calamansi, and chili.'] },
  { id: 6, title: 'Pinakbet', author: 'Nanay Glo', area: 'Ilocos', image: 'https://images.unsplash.com/photo-1545576300-c7744d48aead?w=800&h=500&fit=crop&auto=format', cost: 112, saves: 88, likes: 176, tags: ['Vegetables', 'Ilocano'], timeAgo: '4d ago', servings: 4, verified: true, ingredients: [{ name: 'Pork belly', amount: '250 g, sliced' }, { name: 'Bagoong isda', amount: '2 tbsp' }, { name: 'Tomatoes', amount: '2, quartered' }, { name: 'Squash', amount: '300 g, cubed' }, { name: 'Bitter melon', amount: '1, sliced' }, { name: 'Eggplant', amount: '2, cut into chunks' }, { name: 'Okra', amount: '8 pieces' }, { name: 'String beans', amount: '1 bunch, cut into lengths' }, { name: 'Onion and garlic', amount: '1 onion, 4 cloves' }, { name: 'Water', amount: '1 cup' }], steps: ['Brown pork belly in a hot pot until the edges are golden. Add garlic and onion and cook until fragrant.', 'Add tomatoes and bagoong isda. Cook, pressing the tomatoes, until softened.', 'Pour in water and add squash. Cover and simmer for 8 minutes.', 'Layer in string beans, okra, eggplant, and bitter melon. Cover and simmer until vegetables are tender but still hold their shape.', 'Gently toss to coat the vegetables in the sauce. Adjust seasoning and serve with rice.'] },
];

const SORT_OPTIONS = ['Trending', 'Newest', 'Cheapest', 'Most Saved'];
const CATEGORIES = ['All', 'Sabaw', 'Ulam', 'Noodles', 'Spicy', 'Vegan'];

export default function CommunityScreen() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [sort, setSort] = useState('Trending');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [copied, setCopied] = useState<number[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CommunityRecipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const cardRefs = React.useRef<Record<number, View | null>>({});
  const modalProgress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    getCommunityRecipeCopies().then((copies) => {
      if (!cancelled) setCopied(copies.map((copy) => copy.id));
    });
    return () => { cancelled = true; };
  }, []);

  const recipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = RECIPES.filter((recipe) =>
      (category === 'All' || recipe.tags.includes(category)) &&
      (!query || recipe.title.toLowerCase().includes(query) || recipe.author.toLowerCase().includes(query))
    );
    if (sort === 'Cheapest') return [...matches].sort((a, b) => a.cost - b.cost);
    if (sort === 'Most Saved') return [...matches].sort((a, b) => b.saves - a.saves);
    if (sort === 'Newest') return [...matches].reverse();
    return [...matches].sort((a, b) => b.likes - a.likes);
  }, [category, search, sort]);

  const toggle = (current: number[], id: number, update: (next: number[]) => void) => {
    update(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const copyRecipe = async (recipe: CommunityRecipe) => {
    await addCommunityRecipeCopy(recipe);
    setCopied((current) => current.includes(recipe.id) ? current : [...current, recipe.id]);
  };

  const openRecipe = (recipe: CommunityRecipe) => {
    const show = (frame: { x: number; y: number; width: number; height: number }) => {
      setOrigin(frame);
      setSelectedRecipe(recipe);
      modalProgress.setValue(0);
      setModalVisible(true);
      requestAnimationFrame(() => {
        Animated.spring(modalProgress, { toValue: 1, useNativeDriver: false, stiffness: 190, damping: 24, mass: 0.85 }).start();
      });
    };

    const card = cardRefs.current[recipe.id];
    if (card) card.measureInWindow((x, y, measuredWidth, measuredHeight) => show({ x, y, width: measuredWidth, height: measuredHeight }));
    else show({ x: (viewportWidth - 120) / 2, y: (viewportHeight - 100) / 2, width: 120, height: 100 });
  };

  const closeRecipe = () => {
    Animated.spring(modalProgress, { toValue: 0, useNativeDriver: false, stiffness: 190, damping: 24, mass: 0.85 }).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setSelectedRecipe(null);
      }
    });
  };

  const modalWidth = Math.min(viewportWidth - 32, 460);
  const modalHeight = Math.min(viewportHeight - 80, 720);
  const modalLeft = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.x, (viewportWidth - modalWidth) / 2] });
  const modalTop = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.y, (viewportHeight - modalHeight) / 2] });
  const modalCardWidth = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.width, modalWidth] });
  const modalCardHeight = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [origin.height, modalHeight] });
  const modalRadius = modalProgress.interpolate({ inputRange: [0, 1], outputRange: [12, radius] });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>Community</Text>
            <Text style={styles.heading}>MagkaNote <Text style={styles.headingAccent}>Feed</Text></Text>
          </View>
          <View style={styles.locationPill}><View style={styles.locationDot} /><Text style={styles.locationText}>Metro Manila</Text></View>
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search community recipes…"
            placeholderTextColor={colors.muted}
            style={styles.search}
            autoCorrect={false}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {SORT_OPTIONS.map((option) => (
            <FilterChip key={option} label={option} active={sort === option} tone="gold" onPress={() => setSort(option)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, styles.categoryRow]}>
          {CATEGORIES.map((option) => (
            <FilterChip key={option} label={option} active={category === option} tone="green" onPress={() => setCategory(option)} />
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={recipes}
        keyExtractor={(recipe) => String(recipe.id)}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No community recipes match your search.</Text>}
        renderItem={({ item }) => {
          const isLiked = liked.includes(item.id);
          const isSaved = saved.includes(item.id);
          const isCopied = copied.includes(item.id);
          return (
            <Pressable
              ref={(ref) => { cardRefs.current[item.id] = ref; }}
              collapsable={false}
              onPress={() => openRecipe(item)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.title} by ${item.author}`}
              style={styles.recipeCard}
            >
              <View style={styles.photoWrap}>
                <Image source={{ uri: item.image }} style={styles.photo} resizeMode="cover" />
                <View style={styles.photoScrim} />
                <View style={styles.costBadge}>
                  <Text style={styles.cost}>{peso(item.cost)}</Text>
                  <Text style={styles.servings}>{item.servings} servings</Text>
                </View>
                <View style={styles.tags}>
                  {item.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.authorRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.author.split(' ').map((word) => word[0]).join('').slice(0, 2)}</Text></View>
                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{item.author}</Text>
                      {item.verified && <Text style={styles.verified}>✓</Text>}
                    </View>
                    <Text style={styles.authorSub}>{item.area} · {item.timeAgo}</Text>
                  </View>
                  <Pressable onPress={(event) => { event.stopPropagation(); toggle(saved, item.id, setSaved); }} style={[styles.saveButton, isSaved && styles.saveButtonActive]}>
                    <Text style={[styles.saveIcon, isSaved && styles.saveTextActive]}>{isSaved ? '▣' : '▱'}</Text>
                    <Text style={[styles.saveCount, isSaved && styles.saveTextActive]}>{item.saves + (isSaved ? 1 : 0)}</Text>
                  </Pressable>
                </View>

                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.actionRow}>
                  <Pressable onPress={(event) => { event.stopPropagation(); toggle(liked, item.id, setLiked); }} style={[styles.likeButton, isLiked && styles.likeButtonActive]}>
                    <Text style={[styles.likeIcon, isLiked && styles.likeTextActive]}>{isLiked ? '♥' : '♡'}</Text>
                    <Text style={[styles.likeCount, isLiked && styles.likeTextActive]}>{item.likes + (isLiked ? 1 : 0)}</Text>
                  </Pressable>
                  <Pressable onPress={(event) => { event.stopPropagation(); copyRecipe(item); }} disabled={isCopied} style={[styles.copyButton, isCopied && styles.copyButtonDone]}>
                    <Text style={[styles.copyText, isCopied && styles.copyTextDone]}>{isCopied ? '✓  Added to my recipes' : '＋  Copy to my recipes'}</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeRecipe}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeRecipe} accessibilityLabel="Close recipe details">
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
              <ImageBackground source={{ uri: selectedRecipe.image }} style={styles.detailHero}>
                <View style={styles.detailHeroShade} />
                <Pressable onPress={closeRecipe} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close recipe details">
                  <Text style={styles.closeIcon}>×</Text>
                </Pressable>
                <View style={styles.detailHeroText}>
                  <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                  <Text style={styles.detailAuthor}>{selectedRecipe.author} · {selectedRecipe.area}</Text>
                </View>
              </ImageBackground>

              <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailMeta}>
                  <View><Text style={styles.detailMetaLabel}>Serves</Text><Text style={styles.detailMetaValue}>{selectedRecipe.servings}</Text></View>
                  <View><Text style={styles.detailMetaLabel}>Estimated cost</Text><Text style={styles.detailCost}>{peso(selectedRecipe.cost)}</Text></View>
                  <View><Text style={styles.detailMetaLabel}>Shared</Text><Text style={styles.detailMetaValue}>{selectedRecipe.timeAgo}</Text></View>
                </View>

                <Text style={styles.detailSectionTitle}>Ingredients</Text>
                <View style={styles.ingredientList}>
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <View key={ingredient.name} style={styles.ingredientLine}>
                      <View style={styles.ingredientBullet} />
                      <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.detailSectionTitle}>Method</Text>
                <View style={styles.stepsList}>
                  {selectedRecipe.steps.map((step, index) => (
                    <View key={step} style={styles.stepRow}>
                      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, tone, onPress }: { label: string; active: boolean; tone: 'gold' | 'green'; onPress: () => void }) {
  const activeBackground = tone === 'gold' ? colors.accentMuted : colors.greenMuted;
  const activeBorder = tone === 'gold' ? colors.accentBorder : colors.greenBorder;
  const activeText = tone === 'gold' ? colors.accent : colors.green;
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && { backgroundColor: activeBackground, borderColor: activeBorder }]}>
      <Text style={[styles.filterText, active && { color: activeText, fontFamily: fonts.bodySemibold }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.bg },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eyebrow: { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  heading: { color: colors.cream, fontFamily: fonts.display, fontSize: 23, marginTop: 2 },
  headingAccent: { color: colors.accent, fontFamily: fonts.displayItalic },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.greenMuted, borderColor: colors.greenBorder, borderWidth: 1 },
  locationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  locationText: { color: colors.green, fontSize: 10, fontFamily: fonts.bodyMedium },
  searchWrap: { height: 44, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12 },
  searchIcon: { color: colors.muted, fontSize: 22, marginRight: 8 },
  search: { flex: 1, color: colors.cream, fontSize: 13, paddingVertical: 0 },
  filterRow: { gap: 7, paddingBottom: 7 },
  categoryRow: { paddingBottom: 12 },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, backgroundColor: colors.card },
  filterText: { color: colors.muted, fontSize: 11 },
  feed: { paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  recipeCard: { overflow: 'hidden', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius + 2 },
  photoWrap: { height: 165, position: 'relative', backgroundColor: colors.cardAlt, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,26,16,0.16)' },
  costBadge: { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', backgroundColor: 'rgba(12,26,16,0.88)', borderWidth: 1, borderColor: colors.accentBorder },
  cost: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  servings: { color: colors.muted, fontSize: 9 },
  tags: { position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', gap: 5 },
  tag: { color: colors.cream, backgroundColor: 'rgba(12,26,16,0.76)', borderRadius: 14, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, textTransform: 'uppercase' },
  cardBody: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 13 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accentBorder },
  avatarText: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 10 },
  authorMeta: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 12 },
  verified: { width: 14, height: 14, textAlign: 'center', lineHeight: 14, borderRadius: 7, color: colors.onAccent, backgroundColor: colors.accent, fontSize: 10, overflow: 'hidden' },
  authorSub: { color: colors.muted, fontSize: 10, marginTop: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  saveButtonActive: { backgroundColor: colors.accentMuted, borderColor: colors.accentBorder },
  saveIcon: { color: colors.muted, fontSize: 13 },
  saveCount: { color: colors.muted, fontSize: 10 },
  saveTextActive: { color: colors.accent },
  recipeTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 19, marginBottom: 11 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.faint, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  likeButtonActive: { backgroundColor: colors.redMuted, borderColor: colors.redBorder },
  likeIcon: { color: colors.muted, fontSize: 13 },
  likeCount: { color: colors.muted, fontSize: 11 },
  likeTextActive: { color: colors.red },
  copyButton: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder, borderRadius: 20 },
  copyButtonDone: { backgroundColor: colors.faint, borderColor: colors.border },
  copyText: { color: colors.green, fontFamily: fonts.bodyMedium, fontSize: 11 },
  copyTextDone: { color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', paddingTop: 40, fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  modalCard: { position: 'absolute', overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMed },
  detailHero: { height: 210, justifyContent: 'flex-end', backgroundColor: colors.cardAlt },
  detailHeroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,26,16,0.34)' },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,26,16,0.8)', borderWidth: 1, borderColor: colors.borderMed },
  closeIcon: { color: colors.cream, fontSize: 25, lineHeight: 27 },
  detailHeroText: { paddingHorizontal: 18, paddingBottom: 16 },
  detailTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 28 },
  detailAuthor: { color: 'rgba(245,239,224,0.78)', fontSize: 12, marginTop: 3 },
  detailScroll: { flex: 1 },
  detailContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  detailMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailMetaLabel: { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  detailMetaValue: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 13 },
  detailCost: { color: colors.green, fontFamily: fonts.display, fontSize: 17 },
  detailSectionTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 21, marginBottom: 10, marginTop: 2 },
  ingredientList: { marginBottom: 20 },
  ingredientLine: { flexDirection: 'row', alignItems: 'center', minHeight: 34, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 9 },
  ingredientBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  ingredientName: { flex: 1, color: colors.cream, fontSize: 12 },
  ingredientAmount: { color: colors.muted, fontSize: 11, textAlign: 'right', maxWidth: '54%' },
  stepsList: { gap: 13 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accentBorder },
  stepNumberText: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 11 },
  stepText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18, paddingTop: 2 },
});