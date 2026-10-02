import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError, listNearbyMarkets, scanOSMMarkets, createMarket } from '../api';

import { colors, fonts, radius, radiusPill } from '../theme';
import type { Market } from '../types';

interface Props {
  onOpenMarket: (marketId: string) => void;
}

type TypeFilter = 'All' | 'palengke' | 'supermarket';

const RADIUS_KM = 5;

export default function MarketsScreen({ onOpenMarket }: Props) {
    const [isScanning, setIsScanning] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');

// Add this function inside your component
const handleScanRealWorld = async () => {
  if (!coords) return;
  setIsScanning(true);
  setError(null);

  try {
    // 1. Scan real-world map data
    const realMarkets = await scanOSMMarkets(coords.latitude, coords.longitude, RADIUS_KM);

    if (!realMarkets || realMarkets.length === 0) {
      setError(`No supermarkets or markets found within ${RADIUS_KM} km on OpenStreetMap.`);
      setIsScanning(false);
      return;
    }

    // 2. Save each market to your MongoDB (logging errors instead of silently swallowing)
    let addedCount = 0;
    for (const m of realMarkets) {
      try {
        await createMarket({
          name: m.name,
          type: m.type,
          latitude: m.latitude,
          longitude: m.longitude,
          location_code: '030809000', // Orani PSGC
          location_name: 'Orani, Bataan',
        });
        addedCount++;
      } catch (saveErr) {
        console.warn(`[DB Save Skip] ${m.name}:`, saveErr);
      }
    }

    // 3. Refresh list from your MongoDB
    const controller = new AbortController();
    const updatedMarkets = await listNearbyMarkets(
      { latitude: coords.latitude, longitude: coords.longitude, radiusKm: RADIUS_KM },
      controller.signal
    );

    setMarkets(updatedMarkets);

    if (updatedMarkets.length === 0) {
      setError('Found stores nearby, but failed to save them to the database. Check console logs.');
    }
  } catch (err) {
    setError(describeError(err));
  } finally {
    setIsScanning(false);
  }
};

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    setPermissionDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch (err) {
      setLocationError(describeError(err));
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!coords) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listNearbyMarkets(
      { latitude: coords.latitude, longitude: coords.longitude, radiusKm: RADIUS_KM, type: typeFilter === 'All' ? undefined : typeFilter },
      controller.signal
    )
      .then(setMarkets)
      .catch((err) => setError(describeError(err)))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [coords, typeFilter]);

  const openDirections = (market: Market) => {
    const query = encodeURIComponent(`${market.name} ${market.address ?? ''}`.trim());
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.eyebrow}>Price explorer</Text>
        <Text style={styles.heading}>Nearby Markets</Text>

        <View style={styles.filterRow}>
          {(['All', 'palengke', 'supermarket'] as TypeFilter[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTypeFilter(t)}
              style={[styles.filterChip, t === typeFilter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, t === typeFilter && styles.filterTextActive]}>
                {t === 'All' ? 'All' : t === 'palengke' ? 'Palengke' : 'Supermarket'}
              </Text>
            </Pressable>
          ))}
          <View style={styles.radiusPill}>
            <Text style={styles.radiusText}>{RADIUS_KM} km radius</Text>
          </View>
        </View>
      </SafeAreaView>

      {permissionDenied && (
        <View style={styles.center}>
          <Text style={{ fontSize: 28, marginBottom: 10 }}>📍</Text>
          <Text style={styles.messageTitle}>Location access needed</Text>
          <Text style={styles.messageBody}>
            MagkaNote needs your location to find markets near you.
          </Text>
          <Pressable onPress={requestLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Allow Location</Text>
          </Pressable>
        </View>
      )}

      {!permissionDenied && locationError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Pressable onPress={requestLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!permissionDenied && !locationError && !coords && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.messageBody, { marginTop: 10 }]}>Finding your location…</Text>
        </View>
      )}

      {coords && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {coords && !error && loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {coords && !error && !loading && markets && (
        <FlatList
          data={markets}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.listContent}
         ListEmptyComponent={
  <View style={styles.center}>
    <Text style={styles.messageBody}>
      No markets found in the MagkaNote database within {RADIUS_KM} km. 
    </Text>
    <Pressable 
      onPress={handleScanRealWorld} 
      style={styles.retryButton}
      disabled={isScanning}
    >
      {isScanning ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.retryButtonText}>Scan Area (Map)</Text>
      )}
    </Pressable>
  </View>
}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => onOpenMarket(item._id)} style={styles.cardTop}>
                <View style={[styles.typeBadge, item.type === 'palengke' ? styles.typeBadgeGreen : styles.typeBadgeBlue]}>
                  <Text style={styles.typeBadgeText}>{item.type === 'palengke' ? '🧺' : '🏬'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.type === 'palengke' ? 'Palengke' : 'Supermarket'}
                    {item.distance_km != null ? ` · ${item.distance_km} km away` : ''}
                  </Text>
                  {item.hours && <Text style={styles.cardHours}>{item.hours}</Text>}
                </View>
              </Pressable>

              <View style={styles.cardButtons}>
                <Pressable onPress={() => openDirections(item)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Navigate ↗</Text>
                </Pressable>
                <Pressable onPress={() => onOpenMarket(item._id)} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>View prices</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.bodySemibold,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: { fontFamily: fonts.display, fontSize: 22, color: colors.cream, marginTop: 2, marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  filterChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusPill,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },
  filterTextActive: { color: colors.onAccent, fontFamily: fonts.bodySemibold },
  radiusPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusPill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radiusText: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  messageTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.cream, textAlign: 'center' },
  messageBody: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.red, textAlign: 'center' },
  retryButton: { backgroundColor: colors.accent, borderRadius: radius, paddingHorizontal: 22, paddingVertical: 12 },
  retryButtonText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },

  listContent: { padding: 18, paddingTop: 4, paddingBottom: 100, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeBadge: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  typeBadgeGreen: { backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder },
  typeBadgeBlue: { backgroundColor: colors.blueMuted, borderWidth: 1, borderColor: colors.blueBorder },
  typeBadgeText: { fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.cream },
  cardMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  cardHours: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 2 },
  cardButtons: { flexDirection: 'row', gap: 7 },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.faint,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryButtonText: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  primaryButton: {
    flex: 1.4,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.accent },
});