import React, { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, radiusPill } from '../theme';

interface Props {
  /** Called when the user finishes (or skips) the intro. */
  onDone: () => void;
}

const SLIDE_LABELS = ['Welcome', 'Recipes', 'Prices', 'Savings', 'Start'];

export default function OnboardingScreen({ onDone }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const total = SLIDE_LABELS.length;

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(total - 1, i));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        <View style={{ width }}>
          <SlideWelcome />
        </View>
        <View style={{ width }}>
          <SlideRecipes />
        </View>
        <View style={{ width }}>
          <SlidePrices />
        </View>
        <View style={{ width }}>
          <SlideSavings />
        </View>
        <View style={{ width }}>
          <SlideStart onDone={onDone} />
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.skipWrap} pointerEvents="box-none">
        {index < total - 1 && (
          <Pressable onPress={onDone} hitSlop={10} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          style={[styles.navCircle, index === 0 && styles.navCircleHidden]}
        >
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>

        <View style={styles.dots}>
          {SLIDE_LABELS.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        {index < total - 1 ? (
          <Pressable onPress={() => goTo(index + 1)} style={[styles.navCircle, styles.navCircleAccent]}>
            <Text style={[styles.navArrow, styles.navArrowDark]}>›</Text>
          </Pressable>
        ) : (
          <View style={styles.navCircle} />
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Slide 1: Welcome ────────────────────────────────────────────────────

function SlideWelcome() {
  return (
    <View style={styles.slide}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1489450278009-822e9be04dff?w=800&h=1200&fit=crop&auto=format' }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />

      <SafeAreaView edges={['top']} style={styles.slideContent}>
        <View style={styles.fill} />

        <View style={styles.logoPill}>
          <View style={styles.logoDot}>
            <Text style={{ fontSize: 14 }}>🥘</Text>
          </View>
          <Text style={styles.logoText}>MagkaNote</Text>
        </View>

        <Text style={styles.h1}>
          Cook smart.{'\n'}
          <Text style={styles.h1Italic}>Shop smarter.</Text>
        </Text>
        <Text style={styles.body}>
          The Waze for groceries. Build your recipes, compare live palengke and supermarket
          prices, and find the best deal near you.
        </Text>

        <View style={styles.badgeRow}>
          {['Palengke prices', 'Crowdsourced', 'Geofenced'].map((t) => (
            <View key={t} style={styles.badge}>
              <Text style={styles.badgeCheck}>✓</Text>
              <Text style={styles.badgeText}>{t}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Slide 2: Recipes ────────────────────────────────────────────────────

function SlideRecipes() {
  const ingredients = [
    { name: 'Pork belly (500g)', emoji: '🥓', palengke: '₱120', sm: '₱155' },
    { name: 'Garlic (1 head)', emoji: '🧄', palengke: '₱18', sm: '₱25' },
    { name: 'Bay leaves (6 pcs)', emoji: '🌿', palengke: '₱8', sm: '₱15' },
    { name: 'Soy sauce (200ml)', emoji: '🍶', palengke: '₱22', sm: '₱28' },
  ];

  return (
    <View style={styles.slide}>
      <SafeAreaView edges={['top']} style={styles.slideContent}>
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 18 }}>📝</Text>
        </View>
        <Text style={styles.h2}>
          Build your{'\n'}
          <Text style={styles.h2Italic}>recipe notes</Text>
        </Text>
        <Text style={styles.body}>
          Type a dish name and MagkaNote auto-fills ingredient images, quantities, and live
          price estimates.
        </Text>

        <View style={styles.mockCard}>
          <View style={styles.mockCardHeader}>
            <View>
              <Text style={styles.mockCardTitle}>Pork Adobo</Text>
              <Text style={styles.mockCardMeta}>4 servings · 45 min</Text>
            </View>
            <Text style={styles.stars}>★★★★★</Text>
          </View>

          {ingredients.map((ing, i) => (
            <View key={ing.name} style={[styles.ingredientRow, i === 0 && styles.ingredientRowHighlight]}>
              <View style={styles.ingredientEmojiBox}>
                <Text style={{ fontSize: 16 }}>{ing.emoji}</Text>
              </View>
              <Text style={styles.ingredientName} numberOfLines={1}>
                {ing.name}
              </Text>
              <View style={styles.ingredientPrices}>
                <Text style={styles.pricePalengke}>{ing.palengke}</Text>
                <Text style={styles.priceStrike}>{ing.sm}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalValue}>₱168</Text>
              <Text style={styles.totalSave}>save ₱55 vs SM</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Slide 3: Prices ─────────────────────────────────────────────────────

function SlidePrices() {
  const markets = [
    {
      name: 'Local Palengke',
      dist: '0.4 km',
      score: 94,
      tag: 'Cheapest',
      tagColor: colors.green,
      items: [
        { label: 'Tomatoes/kg', price: '₱42' },
        { label: 'Garlic/head', price: '₱16' },
        { label: 'Pork/kg', price: '₱240' },
      ],
    },
    {
      name: 'Supermarket A',
      dist: '1.2 km',
      score: 71,
      tag: 'Nearby',
      tagColor: colors.accent,
      items: [
        { label: 'Tomatoes/kg', price: '₱68' },
        { label: 'Garlic/head', price: '₱25' },
        { label: 'Pork/kg', price: '₱310' },
      ],
    },
    {
      name: 'Supermarket B',
      dist: '2.1 km',
      score: 68,
      tag: null,
      tagColor: colors.muted,
      items: [
        { label: 'Tomatoes/kg', price: '₱72' },
        { label: 'Garlic/head', price: '₱28' },
        { label: 'Pork/kg', price: '₱325' },
      ],
    },
  ];

  return (
    <View style={styles.slide}>
      <SafeAreaView edges={['top']} style={styles.slideContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.greenMuted }]}>
          <Text style={{ fontSize: 18 }}>📍</Text>
        </View>
        <Text style={styles.h2}>
          Live{'\n'}
          <Text style={styles.h2Italic}>palengke prices</Text>
        </Text>
        <Text style={styles.body}>
          Crowdsourced prices from your neighbors, updated regularly. Always know where your
          money goes furthest.
        </Text>

        <View style={styles.geofencePill}>
          <View style={styles.geofenceDot} />
          <Text style={styles.geofenceText}>Geofence active · 3 km radius</Text>
        </View>

        {markets.map((m, i) => (
          <View key={m.name} style={[styles.marketCard, i === 0 && styles.marketCardHighlight]}>
            <View style={styles.marketHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.marketNameRow}>
                  <Text style={styles.marketName}>{m.name}</Text>
                  {m.tag && (
                    <View style={[styles.marketTag, { backgroundColor: `${m.tagColor}33` }]}>
                      <Text style={[styles.marketTagText, { color: m.tagColor }]}>{m.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.marketDist}>{m.dist} away</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.marketScore, i === 0 && { color: colors.green }]}>{m.score}</Text>
                <Text style={styles.marketScoreLabel}>SCORE</Text>
              </View>
            </View>
            <View style={styles.marketItems}>
              {m.items.map((item) => (
                <View key={item.label} style={styles.marketItem}>
                  <Text style={[styles.marketItemPrice, i === 0 && { color: colors.green }]}>
                    {item.price}
                  </Text>
                  <Text style={styles.marketItemLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </SafeAreaView>
    </View>
  );
}

// ─── Slide 4: Savings ────────────────────────────────────────────────────

function SlideSavings() {
  const weeks = ['W1', 'W2', 'W3', 'W4'];
  const palengkeVals = [310, 280, 265, 240];
  const smVals = [390, 395, 385, 400];
  const maxVal = 420;
  const chartHeight = 100;

  return (
    <View style={styles.slide}>
      <SafeAreaView edges={['top']} style={styles.slideContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.redMuted }]}>
          <Text style={{ fontSize: 18 }}>📊</Text>
        </View>
        <Text style={styles.h2}>
          Track your{'\n'}
          <Text style={styles.h2Italic}>savings over time</Text>
        </Text>
        <Text style={styles.body}>
          MagkaNote learns your shopping habits and shows where you're overpaying, week by
          week.
        </Text>

        <View style={styles.statRow}>
          {[
            { val: '₱1,240', label: 'Saved this month', color: colors.green },
            { val: '31%', label: 'Average savings', color: colors.accent },
            { val: '18', label: 'Recipes built', color: colors.red },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly spend comparison</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <LegendDot color={colors.green} label="Palengke" />
              <LegendDot color={colors.red} label="Store" />
            </View>
          </View>

          <View style={[styles.chartArea, { height: chartHeight }]}>
            {weeks.map((w, i) => (
              <View key={w} style={styles.chartColumn}>
                <View style={styles.chartBars}>
                  <View
                    style={[styles.chartBar, { height: (palengkeVals[i] / maxVal) * chartHeight, backgroundColor: colors.green }]}
                  />
                  <View
                    style={[styles.chartBar, { height: (smVals[i] / maxVal) * chartHeight, backgroundColor: colors.red }]}
                  />
                </View>
                <Text style={styles.chartWeekLabel}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={styles.insightPill}>
            <Text style={{ fontSize: 15 }}>💡</Text>
            <Text style={styles.insightText}>
              You saved <Text style={{ fontWeight: '700' }}>₱160</Text> more this week by
              switching to your local palengke.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ─── Slide 5: Start ──────────────────────────────────────────────────────

function SlideStart({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.slide}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=800&h=1200&fit=crop&auto=format' }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={[styles.bgOverlay, { opacity: 0.92 }]} />

      <SafeAreaView edges={['top']} style={styles.slideContent}>
        <View style={styles.fill} />

        <View style={styles.appMark}>
          <Text style={{ fontSize: 24 }}>🥘</Text>
        </View>

        <Text style={styles.h1}>
          Ready to shop{'\n'}
          <Text style={styles.h1Italic}>the smart way?</Text>
        </Text>
        <Text style={styles.body}>
          Set your location, search an ingredient, and watch your recipe cost itself as you
          build it.
        </Text>

        <Pressable onPress={onDone} style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Get Started →</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },

  slide: { flex: 1, backgroundColor: colors.bg },
  slideContent: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 100 },

  bgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.38 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, opacity: 0.55 },

  skipWrap: { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'flex-end' },
  skipButton: { paddingHorizontal: 20, paddingVertical: 14 },
  skipText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium },

  // Heading typography
  h1: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    color: colors.cream,
    marginBottom: 14,
  },
  h1Italic: { fontFamily: fonts.displayMedium, fontStyle: 'italic', color: colors.accent },
  h2: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    color: colors.cream,
    marginBottom: 8,
  },
  h2Italic: { fontFamily: fonts.displayMedium, fontStyle: 'italic', color: colors.accent },
  body: { fontFamily: fonts.bodyLight, fontSize: 14, lineHeight: 21, color: colors.muted },

  // Slide 1: Welcome
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentMuted,
    borderRadius: radiusPill,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  logoDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontFamily: fonts.displaySemibold, fontSize: 14, color: colors.accent },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.faint,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCheck: { color: colors.green, fontSize: 11, fontFamily: fonts.bodySemibold },
  badgeText: { color: colors.muted, fontSize: 11, fontFamily: fonts.body },

  // Icon box (slides 2-4)
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 8,
  },

  // Slide 2: mock recipe card
  mockCard: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  mockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mockCardTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.cream },
  mockCardMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  stars: { color: colors.accent, fontSize: 12, letterSpacing: 1 },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  ingredientRowHighlight: { backgroundColor: colors.accentMuted, borderColor: colors.accentBorder },
  ingredientEmojiBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.cream },
  ingredientPrices: { alignItems: 'flex-end' },
  pricePalengke: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.green },
  priceStrike: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    padding: 10,
    backgroundColor: colors.accentMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  totalValue: { fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.accent },
  totalSave: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },

  // Slide 3: prices
  geofencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenMuted,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radiusPill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  geofenceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  geofenceText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.green },
  marketCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  marketCardHighlight: { backgroundColor: colors.card, borderColor: colors.greenBorder },
  marketHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  marketNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marketName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cream },
  marketTag: { borderRadius: radiusPill, paddingHorizontal: 7, paddingVertical: 2 },
  marketTagText: { fontFamily: fonts.bodySemibold, fontSize: 9, letterSpacing: 0.5 },
  marketDist: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  marketScore: { fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.muted },
  marketScoreLabel: { fontFamily: fonts.body, fontSize: 9, color: colors.muted, letterSpacing: 0.5 },
  marketItems: { flexDirection: 'row', gap: 8 },
  marketItem: { flex: 1, backgroundColor: colors.bg, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  marketItemPrice: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.cream },
  marketItemLabel: { fontFamily: fonts.body, fontSize: 9, color: colors.muted, marginTop: 2, textAlign: 'center' },

  // Slide 4: savings
  statRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.displaySemibold, fontSize: 17 },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 4, textAlign: 'center' },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chartTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.cream },
  legendText: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  chartColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  chartBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  chartBar: { width: 20, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartWeekLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  insightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenMuted,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  insightText: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: colors.green, lineHeight: 16 },

  // Slide 5: start
  appMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 26,
  },
  ctaButtonText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.onAccent },

  // Bottom nav (shared)
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.faint,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCircleHidden: { opacity: 0 },
  navCircleAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  navArrow: { fontSize: 20, color: colors.muted, fontFamily: fonts.body, marginTop: -2 },
  navArrowDark: { color: colors.onAccent },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faint },
  dotActive: { width: 20, backgroundColor: colors.accent },
});
