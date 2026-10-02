import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  describeError,
  getItemPriceEstimate,
  getMarket,
  listItems,
  searchItems,
  submitPriceReport,
} from '../api';
import { Thumbnail } from '../components/Thumbnail';
import { getDeviceUser } from '../deviceUser';
import { useDebounce } from '../hooks/useDebounce';
import { peso } from '../format';
import { colors, fonts, radius } from '../theme';
import type { Item, Market } from '../types';

interface Props {
  marketId: string;
  onBack: () => void;
}

interface SampleRow {
  item: Item;
  price: number | null;
}

/** A small, fixed sample of common items to price-check at a market, since
 * there's no "current basket" context passed in from elsewhere yet. */
const SAMPLE_LIMIT = 6;

export default function MarketDetailScreen({ marketId, onBack }: Props) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [samples, setSamples] = useState<SampleRow[] | null>(null);
  const [samplesError, setSamplesError] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await getMarket(marketId);
        if (cancelled) return;
        setMarket(m);
      } catch (err) {
        if (!cancelled) setLoadError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  useEffect(() => {
    if (!market) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await listItems({ limit: SAMPLE_LIMIT });
        if (cancelled) return;
        const rows = await Promise.all(
          items.map(async (item) => {
            try {
              const est = await getItemPriceEstimate({
                itemId: item._id,
                locationCode: market.location_psgc_code,
                outletName: market.name,
                unit: item.baseline_unit,
                source: market.type,
              });
              const row = est.estimates.find((e) => e.unit === item.baseline_unit);
              return { item, price: row?.average_price ?? null };
            } catch {
              return { item, price: null };
            }
          })
        );
        if (!cancelled) setSamples(rows);
      } catch (err) {
        if (!cancelled) setSamplesError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market]);

  const openDirections = () => {
    if (!market) return;
    const query = encodeURIComponent(`${market.name} ${market.address ?? ''}`.trim());
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable onPress={onBack} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!market) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ Nearby markets</Text>
        </Pressable>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={styles.typeLabel}>{market.type === 'palengke' ? 'Palengke' : 'Supermarket'}</Text>
            <Text style={styles.name}>{market.name}</Text>
            {market.address && <Text style={styles.address}>{market.address}</Text>}
            {market.hours && <Text style={styles.hours}>{market.hours}</Text>}
          </View>
          <Pressable onPress={openDirections} style={styles.directionsButton}>
            <Text style={styles.directionsText}>Directions ↗</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>Sample Prices</Text>
        {!samples && !samplesError && <ActivityIndicator color={colors.accent} style={{ marginVertical: 14 }} />}
        {samplesError && <Text style={styles.errorText}>{samplesError}</Text>}
        {samples && (
          <View style={styles.sampleCard}>
            {samples.map(({ item, price }, i) => (
              <View key={item._id} style={[styles.sampleRow, i > 0 && styles.sampleRowBorder]}>
                <Thumbnail uri={item.image_url} category={item.category} size={32} />
                <View style={styles.flex}>
                  <Text style={styles.sampleName}>{item.default_name}</Text>
                  <Text style={styles.sampleUnit}>per {item.baseline_unit}</Text>
                </View>
                <Text style={[styles.samplePrice, price == null && styles.samplePriceMuted]}>
                  {price != null ? peso(price) : 'No data'}
                </Text>
              </View>
            ))}
            <Text style={styles.sampleFootnote}>
              Prices are crowdsourced from reports naming "{market.name}" as the outlet.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Help keep this accurate</Text>
        {!reportOpen ? (
          <Pressable onPress={() => setReportOpen(true)} style={styles.reportToggle}>
            <Text style={styles.reportToggleText}>+ Report a new price</Text>
          </Pressable>
        ) : (
          <ReportPriceForm market={market} onDone={() => setReportOpen(false)} />
        )}
      </ScrollView>
    </View>
  );
}

// --- Report a price form ---

function ReportPriceForm({ market, onDone }: { market: Market; onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebounce(query.trim(), 300);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    searchItems(debounced, controller.signal)
      .then(setResults)
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  const submit = async () => {
    if (!selected) return;
    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setError('Enter a valid price.');
      return;
    }
    if (!market.location_name) {
      setError("This market is missing a city name, so a report can't be saved yet.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const user = await getDeviceUser();
      await submitPriceReport({
        item_id: selected._id,
        user_id: user._id,
        price: numericPrice,
        measurement_unit: selected.baseline_unit,
        location_psgc_code: market.location_psgc_code,
        location_name: market.location_name,
        outlet_name: market.name,
        source_type: market.type,
      });
      Alert.alert('Thank you!', `Your price for ${selected.default_name} at ${market.name} has been recorded.`);
      onDone();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formCard}>
      {!selected ? (
        <>
          <Text style={styles.formLabel}>Which item?</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Search ingredient…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {results.map((item) => (
            <Pressable key={item._id} onPress={() => setSelected(item)} style={styles.resultRow}>
              <Thumbnail uri={item.image_url} category={item.category} size={30} />
              <Text style={styles.resultName}>{item.default_name}</Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <View style={styles.selectedRow}>
            <Thumbnail uri={selected.image_url} category={selected.category} size={32} />
            <Text style={styles.selectedName}>{selected.default_name}</Text>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.formLabel}>Price per {selected.baseline_unit}</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. 85"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.formButtons}>
        <Pressable onPress={onDone} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!selected || !price || submitting}
          style={[styles.submitButton, (!selected || !price) && styles.submitButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={styles.submitButtonText}>Submit report</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: colors.red, textAlign: 'center' },
  retryButton: { backgroundColor: colors.accent, borderRadius: radius, paddingHorizontal: 20, paddingVertical: 11 },
  retryButtonText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },

  header: { paddingHorizontal: 18, paddingBottom: 6 },
  backRow: { paddingVertical: 6 },
  backText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  headerRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
  typeLabel: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.cream, marginTop: 3 },
  address: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
  hours: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  directionsButton: { backgroundColor: colors.accent, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
  directionsText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.onAccent },

  body: { padding: 18, paddingTop: 10, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemibold,
    color: colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  sampleCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  sampleRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sampleName: { fontFamily: fonts.body, fontSize: 13, color: colors.cream },
  sampleUnit: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },
  samplePrice: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.accent },
  samplePriceMuted: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  sampleFootnote: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    padding: 12,
    backgroundColor: colors.surface,
  },

  reportToggle: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius,
    paddingVertical: 13,
    alignItems: 'center',
  },
  reportToggleText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.accent },

  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  formLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 4 },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  resultName: { fontFamily: fonts.body, fontSize: 12, color: colors.cream },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.cream },
  changeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.accent },

  formButtons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  cancelButton: { flex: 1, backgroundColor: colors.faint, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelButtonText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  submitButton: { flex: 1.4, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.onAccent },
});