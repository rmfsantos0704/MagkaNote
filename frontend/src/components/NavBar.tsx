import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons'; // Or 'lucide-react-native' / 'react-native-vector-icons'
import { colors, fonts } from '../theme';

export type NavTab = 'dashboard' | 'community' | 'markets' | 'smartnote';

interface Props {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
}

// Replaced emoji strings with Feather icon names
const TABS: { id: NavTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'dashboard', label: 'Recipes', icon: 'grid' },
  { id: 'community', label: 'Community', icon: 'users' },
  { id: 'markets', label: 'Markets', icon: 'map-pin' },
  { id: 'smartnote', label: 'SmartNote', icon: 'edit-2' },
];

export function NavBar({ active, onNavigate }: Props) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable key={tab.id} onPress={() => onNavigate(tab.id)} style={styles.tab}>
            <Feather 
              name={tab.icon} 
              size={20} 
              // Uses your theme colors directly instead of relying on opacity
              color={isActive ? colors.accent : colors.muted} 
            />
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
  // Removed icon/iconActive opacity styles since the icon component handles colors natively
  label: { fontSize: 10, fontFamily: fonts.body, color: colors.muted, letterSpacing: 0.3 },
  labelActive: { fontFamily: fonts.bodySemibold, color: colors.accent },
});