import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { applyDefaultFont, useAppFonts } from './fonts';
import OnboardingScreen from './screens/OnboardingScreen';
import SmartNoteScreen from './screens/SmartNoteScreen';
import { colors } from './theme';

const ONBOARDED_KEY = 'magkanote:onboarded';

/**
 * App entry point: loads fonts, checks whether onboarding has already been
 * shown (persisted in AsyncStorage so it only appears once per install),
 * then renders the onboarding flow or the main app.
 *
 * Requires: npx expo install @react-native-async-storage/async-storage
 */
export default function AppRoot() {
  const fontsLoaded = useAppFonts();
  const [onboarded, setOnboarded] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    if (!fontsLoaded) return;
    applyDefaultFont();
  }, [fontsLoaded]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((value) => setOnboarded(value === 'true'))
      .catch(() => setOnboarded(false)); // storage unavailable: fail open, just show onboarding
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, 'true').catch(() => {
      // Not fatal: onboarding will just show again next launch.
    });
  };

  if (!fontsLoaded || onboarded === null) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {onboarded ? <SmartNoteScreen /> : <OnboardingScreen onDone={finishOnboarding} />}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
