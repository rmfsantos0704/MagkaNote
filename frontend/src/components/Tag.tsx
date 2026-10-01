import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radiusPill } from '../theme';

interface Props {
  label: string;
  color?: string;
  background?: string;
}

export function Tag({ label, color = colors.muted, background = colors.faint }: Props) {
  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: radiusPill, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 10, fontFamily: fonts.bodyMedium, letterSpacing: 0.3, textTransform: 'uppercase' },
});