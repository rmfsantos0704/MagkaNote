import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * We don't store recipe photos, so recipe cards use a category-hinted emoji
 * tile instead of a stock photo. Purely decorative — the keyword match is
 * loose on purpose, it only needs to feel roughly right.
 */
const CATEGORY_HINTS: [RegExp, string][] = [
  [/ulam|adobo|paksiw|inihaw|pork|beef|manok|chicken/i, '🍖'],
  [/sabaw|soup|sinigang|tinola|nilaga/i, '🍜'],
  [/gulay|veg|salad/i, '🥬'],
  [/silog|rice|sinangag/i, '🍳'],
  [/isda|fish|seafood|bangus|hipon/i, '🐟'],
  [/merienda|snack|dessert|panghimagas/i, '🍪'],
];

function pickEmoji(text: string): string {
  const hit = CATEGORY_HINTS.find(([re]) => re.test(text));
  return hit ? hit[1] : '🍲';
}

interface Props {
  title: string;
  category?: string | null;
  size?: number;
}

export function RecipeThumb({ title, category, size = 56 }: Props) {
  const emoji = pickEmoji(`${category ?? ''} ${title}`);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Text style={{ fontSize: size * 0.46 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});