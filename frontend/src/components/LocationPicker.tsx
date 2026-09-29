import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchCities,
  fetchProvinces,
  fetchRegions,
  type PsgcCity,
  type PsgcProvince,
  type PsgcRegion,
} from '../psgc';
import { colors, fonts, radius } from '../theme';
import type { Location } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: Location) => void;
}

type Step =
  | { kind: 'region' }
  | { kind: 'province'; region: PsgcRegion }
  | { kind: 'city'; region: PsgcRegion; province: PsgcProvince | null };

export function LocationPicker({ visible, onClose, onSelect }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'region' });
  const [query, setQuery] = useState('');

  const [regions, setRegions] = useState<PsgcRegion[] | null>(null);
  const [provinces, setProvinces] = useState<PsgcProvince[] | null>(null);
  const [cities, setCities] = useState<PsgcCity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset to the top every time the picker is opened
  useEffect(() => {
    if (visible) {
      setStep({ kind: 'region' });
      setQuery('');
      setError(null);
    }
  }, [visible]);

  // Load regions once
  useEffect(() => {
    if (!visible || regions) return;
    fetchRegions()
      .then(setRegions)
      .catch(() => setError("Couldn't load regions. Check your internet connection and try again."));
  }, [visible, regions]);

  const selectRegion = async (region: PsgcRegion) => {
    setQuery('');
    setError(null);
    setProvinces(null);
    setCities(null);
    try {
      const list = await fetchProvinces(region.code);
      if (list.length === 0) {
        // NCR and similar: no province layer, cities sit directly under the region
        const cityList = await fetchCities({ regionCode: region.code });
        setCities(cityList);
        setStep({ kind: 'city', region, province: null });
      } else {
        setProvinces(list);
        setStep({ kind: 'province', region });
      }
    } catch {
      setError("Couldn't load that region. Try again.");
    }
  };

  const selectProvince = async (province: PsgcProvince, region: PsgcRegion) => {
    setQuery('');
    setError(null);
    setCities(null);
    try {
      const list = await fetchCities({ provinceCode: province.code });
      setCities(list);
      setStep({ kind: 'city', region, province });
    } catch {
      setError("Couldn't load that province. Try again.");
    }
  };

  const selectCity = (city: PsgcCity) => {
    if (step.kind !== 'city') return;
    const areaName = step.province?.name ?? step.region.name;
    onSelect({ code: city.code, name: `${city.name}, ${areaName}` });
    onClose();
  };

  const goBack = () => {
    setQuery('');
    setError(null);
    if (step.kind === 'city') {
      if (step.province) {
        setStep({ kind: 'province', region: step.region });
      } else {
        setStep({ kind: 'region' }); // came from a province-less region (NCR)
      }
    } else if (step.kind === 'province') {
      setStep({ kind: 'region' });
    }
  };

  const { title, data, loading, onPick } = useMemo((): {
    title: string;
    data: { code: string; name: string }[] | null;
    loading: boolean;
    onPick: (item: { code: string; name: string }) => void;
  } => {
    if (step.kind === 'region') {
      return { title: 'Select region', data: regions, loading: regions === null, onPick: selectRegion };
    }
    if (step.kind === 'province') {
      return {
        title: step.region.name,
        data: provinces,
        loading: provinces === null,
        onPick: (p) => selectProvince(p, step.region),
      };
    }
    return {
      title: step.province ? step.province.name : step.region.name,
      data: cities,
      loading: cities === null,
      onPick: selectCity,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, regions, provinces, cities]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => d.name.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {step.kind !== 'region' ? (
            <Pressable onPress={goBack} hitSlop={10} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>‹ Back</Text>
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Close</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder={step.kind === 'city' ? 'Search city or municipality' : 'Search'}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        {error && (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {!error && loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!error && !loading && (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowText}>{item.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query ? `No matches for "${query}".` : 'Nothing here yet.'}
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerButton: { minWidth: 60 },
  headerButtonText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 15 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.displaySemibold, fontSize: 17, color: colors.cream },
  search: {
    margin: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.primaryLight },
  rowText: { fontSize: 15, fontFamily: fonts.body, color: colors.cream, flex: 1 },
  chevron: { color: colors.muted, fontSize: 18 },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.body, marginTop: 24 },
});
