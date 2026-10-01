import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export type NavTab = 'dashboard' | 'smartnote';

interface Props {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Recipes', icon: '▦' },
  { id: 'smartnote', label: 'SmartNote', icon: '📝' },
];

export function NavBar({ active, onNavigate }: Props) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable key={tab.id} onPress={() => onNavigate(tab.id)} style={styles.tab}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6 },
  icon: { fontSize: 18, opacity: 0.45 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, fontFamily: fonts.body, color: colors.muted, letterSpacing: 0.3 },
  labelActive: { fontFamily: fonts.bodySemibold, color: colors.accent },
});