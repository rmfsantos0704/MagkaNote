import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_EMOJI } from '../constants';
import { colors } from '../theme';

interface Props {
  uri: string | null;
  category: string;
  size?: number;
}

/** Ingredient photo, or a category emoji when there is no image (or it fails to load). */
export function Thumbnail({ uri, category, size = 44 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.image, box]} onError={() => setFailed(true)} />;
  }

  return (
    <View style={[styles.fallback, box]}>
      <Text style={{ fontSize: size * 0.5 }}>{CATEGORY_EMOJI[category] ?? '🛒'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
