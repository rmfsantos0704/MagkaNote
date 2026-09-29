import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { describeError, isCancel, searchItems } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { colors, radius } from '../theme';
import type { Item } from '../types';
import { Thumbnail } from './Thumbnail';

interface Props {
  onSelect: (item: Item) => void;
}

export function IngredientSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait until the user pauses typing so we don't call the API on every keystroke
  const debounced = useDebounce(query.trim(), 300);
  const active = debounced.length >= 2;
  const showPanel = active && query.trim().length >= 2;

  useEffect(() => {
    if (!active) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchItems(debounced, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (isCancel(err)) return;
        setResults([]);
        setError(describeError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // If the query changes mid-request, cancel the old request
    return () => controller.abort();
  }, [debounced, active]);

  const handleSelect = (item: Item) => {
    onSelect(item);
    setQuery('');
  };

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Search ingredient (e.g. kamatis, sibuyas)"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {showPanel && (
        <View style={styles.panel}>
          {loading && <ActivityIndicator style={styles.pad} color={colors.primary} />}

          {!loading && error && <Text style={[styles.pad, styles.error]}>{error}</Text>}

          {!loading && !error && results.length === 0 && (
            <Text style={[styles.pad, styles.muted]}>
              No ingredients found for "{debounced}".
            </Text>
          )}

          {!loading &&
            !error &&
            results.map((item) => (
              <Pressable
                key={item._id}
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.result, pressed && styles.pressed]}
              >
                <Thumbnail uri={item.image_url} category={item.category} size={36} />
                <View style={styles.resultText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.default_name}
                  </Text>
                  <Text style={styles.muted}>{item.category.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.add}>+ Add</Text>
              </Pressable>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  panel: {
    marginTop: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: 'hidden',
  },
  pad: { padding: 14 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.primaryLight },
  resultText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  add: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger },
});
