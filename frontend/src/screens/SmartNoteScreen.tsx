import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteRecipe,
  describeError,
  estimateRecipe,
  getItemPriceEstimate,
  getRecipe,
  isCancel,
  listItems,
  lookupBarcode,
  saveRecipe,
  searchItems,
  updateRecipe,
} from '../api';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmAddModal } from '../components/ConfirmAddModal';
import { LocationPicker } from '../components/LocationPicker';
import { ScannedPriceModal } from '../components/ScannedPriceModal';
import { StepsEditor } from '../components/StepsEditor';
import { Tag } from '../components/Tag';
import { Thumbnail } from '../components/Thumbnail';
import { CATEGORY_EMOJI, defaultQtyFor } from '../constants';
import { isCloudinaryConfigured, uploadRecipePhoto } from '../cloudinary';
import type { CommunityRecipeCopy } from '../communityCopies';
import { useDebounce } from '../hooks/useDebounce';
import { getDeviceUser } from '../deviceUser';
import { peso } from '../format';
import { colors, fonts, radius, radiusPill } from '../theme';
import type { Difficulty, Item, Location, PriceEstimateRow, RecipeEstimate } from '../types';
import { getUserSettings } from '../features/settings/settingsApi';

const ITEM_CATEGORIES = Object.keys(CATEGORY_EMOJI);
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const COMMUNITY_ITEM_ALIASES: Record<string, string[]> = {
  'beef shanks with marrow': ['beef cubes'],
  'beef brisket or shank': ['beef cubes'],
  'beef tripe': ['beef cubes'],
  oxtail: ['beef cubes'],
  'ground pork': ['ground pork'],
  'pork belly': ['pork belly'],
  'whole peppercorns': ['black pepper'],
  'rice noodles': ['rice noodles'],
  'napa cabbage': ['cabbage'],
  cabbage: ['cabbage'],
  eggplant: ['eggplant'],
  'string beans': ['string beans'],
  'bird’s eye chilies': ['chili pepper'],
  'fish sauce': ['fish sauce'],
  cornstarch: ['cornstarch'],
  shrimp: ['shrimp'],
  'dried shrimp': ['shrimp'],
  calamansi: ['kalamansi'],
  tomatoes: ['tomato'],
  squash: ['squash'],
  okra: ['okra'],
  pechay: ['pechay'],
  'taro leaves': ['taro'],
};

function normalizeIngredientName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCommunityIngredient(name: string, catalog: Item[]): Item | undefined {
  const queries = COMMUNITY_ITEM_ALIASES[name.toLowerCase()] ?? [name];
  for (const query of queries) {
    const normalizedQuery = normalizeIngredientName(query);
    const match = catalog.find((item) => normalizeIngredientName(item.default_name).includes(normalizedQuery));
    if (match) return match;
  }
  return undefined;
}

function importedQuantity(amount: string, unit: Item['baseline_unit']): number {
  const firstNumber = amount.match(/^\s*(\d+(?:\.\d+)?|\d+\s*\/\s*\d+)/)?.[1];
  if (!firstNumber) return defaultQtyFor(unit);
  const quantity = firstNumber.includes('/')
    ? firstNumber.split('/').map(Number).reduce((numerator, denominator) => numerator / denominator)
    : Number(firstNumber);
  const measure = amount.toLowerCase();

  if (unit === 'kilo') {
    if (/\bkg\b|kilo/.test(measure)) return quantity;
    if (/\bgrams?\b|\bg\b/.test(measure)) return quantity / 1000;
  }
  if (unit === 'gramo') {
    if (/\bkg\b|kilo/.test(measure)) return quantity * 1000;
    if (/\bgrams?\b|\bg\b/.test(measure)) return quantity;
  }
  if (unit === 'tali' && /bunch|bundle|tali/.test(measure)) return quantity;
  if ((unit === 'piece' || unit === 'piraso') && /piece|pcs|ear|egg|head/.test(measure)) return quantity;
  return defaultQtyFor(unit);
}

interface AddedIngredient {
  item: Item;
  quantity: number;
}

type Tab = 'compose' | 'search' | 'basket';

interface Props {
  /** Present when editing a saved recipe; absent when creating a new one. */
  recipeId?: string;
  initialTitle?: string;
  initialNotes?: string;
  communityCopy?: CommunityRecipeCopy;
  onSaved: () => void;
  onBack: () => void;
}

export default function SmartNoteScreen({ recipeId, initialTitle, initialNotes, communityCopy, onSaved, onBack }: Props) {
  const isEditing = !!recipeId;

  // --- Compose fields ---
  const [title, setTitle] = useState(initialTitle ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [category, setCategory] = useState(communityCopy?.category ?? '');
  const [servings, setServings] = useState(communityCopy?.servings ? String(communityCopy.servings) : '');
  const [prepTime, setPrepTime] = useState(communityCopy?.prepTime ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(communityCopy?.difficulty ?? null);
  const [location, setLocation] = useState<Location | null>(null);
  const [outletName, setOutletName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(communityCopy?.image ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // --- Basket ---
  const [added, setAdded] = useState<AddedIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  // --- UI state ---
  const [tab, setTab] = useState<Tab>('compose');
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyImportNotice, setCopyImportNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Load an existing recipe when editing ---
  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getRecipe(recipeId);
        if (cancelled) return;
        setTitle(r.title);
        setNotes(r.notes ?? '');
        setCategory(r.category ?? '');
        setServings(r.servings != null ? String(r.servings) : '');
        setPrepTime(r.prep_time ?? '');
        setDifficulty(r.difficulty ?? null);
        setPhotoUrl(r.image_url ?? null);
        setOutletName(r.outlet_name ?? '');
        setSteps(r.steps ?? []);
        if (r.location_psgc_code && r.location_name) {
          setLocation({ code: r.location_psgc_code, name: r.location_name });
        } else {
          setLocation(null);
        }
        setAdded(
          (r.items ?? [])
            .filter((line) => line.item_id) // a deleted Item would populate as null
            .map((line) => ({ item: line.item_id, quantity: line.quantity }))
        );
      } catch (err) {
        if (!cancelled) setLoadError(describeError(err));
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  useEffect(() => {
    if (recipeId || !communityCopy?.ingredients?.length) return;
    let cancelled = false;
    listItems({ limit: 60 })
      .then((catalog) => {
        if (cancelled) return;
        const imported = communityCopy.ingredients!.flatMap((ingredient) => {
          const item = findCommunityIngredient(ingredient.name, catalog);
          return item ? [{ item, quantity: importedQuantity(ingredient.amount, item.baseline_unit) }] : [];
        });
        const matchedNames = new Set(imported.map((entry) => normalizeIngredientName(entry.item.default_name)));
        const unmatched = communityCopy.ingredients!.filter((ingredient) => {
          const item = findCommunityIngredient(ingredient.name, catalog);
          return !item || !matchedNames.has(normalizeIngredientName(item.default_name));
        });
        setAdded(imported);
        setCopyImportNotice(unmatched.length
          ? `${unmatched.length} ingredient${unmatched.length === 1 ? '' : 's'} could not be priced yet; the full list remains in your notes.`
          : null);
      })
      .catch(() => {
        if (!cancelled) setCopyImportNotice('Could not load the ingredient catalog. The full ingredient list remains in your notes.');
      });
    return () => { cancelled = true; };
  }, [recipeId, communityCopy?.id]);

  useEffect(() => {
    if (recipeId || communityCopy) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await getDeviceUser();
        const settings = await getUserSettings(user._id);
        if (cancelled) return;
        setLocation(settings.preferences.location);
        const preferredMarket = settings.preferences.market.trim();
        setOutletName(preferredMarket.toLowerCase() === 'any nearby market' ? '' : preferredMarket);
      } catch {
        // New recipes remain usable when settings are unavailable.
      }
    })();
    return () => { cancelled = true; };
  }, [recipeId, communityCopy]);

  // If a new note has no location yet, prompt for one as soon as it's needed
  useEffect(() => {
    if (!loadingInitial && !location && (tab === 'search' || tab === 'basket')) {
      setPickerOpen(true);
    }
  }, [tab, location, loadingInitial]);

  // --- Live whole-recipe estimate (palengke = the recipe's real total; supermarket = comparison) ---
  const [palengkeEstimate, setPalengkeEstimate] = useState<RecipeEstimate | null>(null);
  const [supermarketEstimate, setSupermarketEstimate] = useState<RecipeEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!location || added.length === 0) {
      setPalengkeEstimate(null);
      setSupermarketEstimate(null);
      return;
    }
    const controller = new AbortController();
    setEstimating(true);
    const timer = setTimeout(async () => {
      const items = added.map((a) => ({
        item_id: a.item._id,
        quantity: a.quantity,
        measurement_unit: a.item.baseline_unit,
      }));
      try {
        const [pal, sm] = await Promise.all([
          estimateRecipe({ location_code: location.code, outlet_name: outletName.trim() || undefined, source: 'palengke', items }, controller.signal),
          estimateRecipe({ location_code: location.code, outlet_name: outletName.trim() || undefined, source: 'supermarket', items }, controller.signal),
        ]);
        setPalengkeEstimate(pal);
        setSupermarketEstimate(sm);
      } catch (err) {
        if (!isCancel(err)) {
          // Non-fatal for the Compose/Search tabs; the Basket tab surfaces this itself
        }
      } finally {
        if (!controller.signal.aborted) setEstimating(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [added, location, outletName]);

  const palengkeTotal = palengkeEstimate?.total.estimated ?? 0;
  const supermarketTotal = supermarketEstimate?.total.estimated ?? 0;
  const savings = Math.max(0, supermarketTotal - palengkeTotal);

  // --- Basket actions ---
  const addIngredient = (item: Item) => {
    setAdded((prev) => {
      const existing = prev.find((a) => a.item._id === item._id);
      if (existing) {
        return prev.map((a) => (a.item._id === item._id ? { ...a, quantity: a.quantity + 1 } : a));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };
  const removeIngredient = (id: string) => setAdded((prev) => prev.filter((a) => a.item._id !== id));
  const changeQty = (id: string, delta: number) =>
    setAdded((prev) =>
      prev.map((a) => (a.item._id === id ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a))
    );

  // --- Recipe photo ---
  const pickAndUploadPhoto = async (source: 'camera' | 'library') => {
    setPhotoError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(
          source === 'camera' ? 'Camera permission was declined.' : 'Photo library permission was declined.'
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, aspect: [4, 3], allowsEditing: true })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, aspect: [4, 3], allowsEditing: true });

      if (result.canceled || !result.assets?.[0]) return;

      setPhotoUploading(true);
      const url = await uploadRecipePhoto(result.assets[0].uri);
      setPhotoUrl(url);
    } catch (err) {
      setPhotoError(describeError(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePickPhoto = () => {
    if (!isCloudinaryConfigured()) {
      setPhotoError(
        "Photo upload isn't set up yet — add your Cloudinary keys to frontend/.env (see src/cloudinary.ts)."
      );
      return;
    }
    Alert.alert('Add a photo', 'Show off your finished dish', [
      { text: 'Take Photo', onPress: () => pickAndUploadPhoto('camera') },
      { text: 'Choose from Library', onPress: () => pickAndUploadPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // --- Save / update ---
  const handleSave = async () => {
    if (!title.trim()) {
      setTab('compose');
      setSaveError('Give your recipe a name first.');
      return;
    }
    if (!location) {
      setPickerOpen(true);
      return;
    }
    if (added.length === 0) {
      setTab('search');
      setSaveError('Add at least one ingredient.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const user = await getDeviceUser();
      const payload = {
        user_id: user._id,
        title: title.trim(),
        location_code: location.code,
        location_name: location.name,
        outlet_name: outletName.trim() || null,
        source: 'palengke' as const,
        items: added.map((a) => ({
          item_id: a.item._id,
          quantity: a.quantity,
          measurement_unit: a.item.baseline_unit,
        })),
        category: category.trim() || null,
        servings: servings ? Number(servings) : null,
        prep_time: prepTime.trim() || null,
        difficulty,
        notes: notes.trim() || null,
        steps: steps.map((step) => step.trim()).filter(Boolean),
        image_url: photoUrl,
        supermarket_total: palengkeEstimate ? supermarketTotal : null,
      };
      if (recipeId) {
        await updateRecipe(recipeId, payload);
      } else {
        await saveRecipe(payload);
      }
      setSaved(true);
      setTimeout(onSaved, 900);
    } catch (err) {
      setSaveError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipeId) return;
    setDeleting(true);
    try {
      const user = await getDeviceUser();
      await deleteRecipe(recipeId, user._id);
      onSaved();
    } catch (err) {
      setSaveError(describeError(err));
      setDeleting(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>SmartNote</Text>
              <Text style={styles.heading}>{isEditing ? 'Edit Recipe' : 'New Recipe'}</Text>
            </View>
            <Pressable onPress={handleSave} disabled={saving} style={[styles.saveButton, saved && styles.saveButtonDone]}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={[styles.saveButtonText, saved && styles.saveButtonTextDone]}>
                  {saved ? '✓ Saved!' : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>

          {loadError && <Text style={styles.errorBanner}>{loadError}</Text>}
          {saveError && <Text style={styles.errorBanner}>{saveError}</Text>}

          <View style={styles.tabBar}>
            {(
              [
                { id: 'compose' as Tab, label: 'Compose' },
                { id: 'search' as Tab, label: 'Ingredients' },
                { id: 'basket' as Tab, label: `Basket${added.length ? ` (${added.length})` : ''}` },
              ] as const
            ).map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[styles.tabButton, tab === t.id && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>

        {tab === 'compose' && (
          <ComposeTab
            title={title}
            onTitle={setTitle}
            notes={notes}
            onNotes={setNotes}
            category={category}
            onCategory={setCategory}
            servings={servings}
            onServings={setServings}
            prepTime={prepTime}
            onPrepTime={setPrepTime}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            location={location}
            outletName={outletName}
            onOutletName={setOutletName}
            onOpenPicker={() => setPickerOpen(true)}
            palengkeTotal={palengkeTotal}
            savings={savings}
            estimating={estimating}
            addedCount={added.length}
            copyImportNotice={copyImportNotice}
            isEditing={isEditing}
            deleting={deleting}
            onDelete={handleDelete}
            photoUrl={photoUrl}
            photoUploading={photoUploading}
            photoError={photoError}
            onPickPhoto={handlePickPhoto}
            steps={steps}
            onStepsChange={setSteps}
          />
        )}

        {tab === 'search' && (
          <SearchTab
            location={location}
            outletName={outletName}
            addedIds={new Set(added.map((a) => a.item._id))}
            onAdd={addIngredient}
          />
        )}

        {tab === 'basket' && (
          <BasketTab
            added={added}
            estimate={palengkeEstimate}
            outletName={outletName}
            copyImportNotice={copyImportNotice}
            palengkeTotal={palengkeTotal}
            supermarketTotal={supermarketTotal}
            savings={savings}
            onChangeQty={changeQty}
            onRemove={removeIngredient}
            onGoToSearch={() => setTab('search')}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </KeyboardAvoidingView>

      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setLocation} />
    </View>
  );
}

// --- Compose tab -----------------------------------------------------------

interface ComposeProps {
  title: string;
  onTitle: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  servings: string;
  onServings: (v: string) => void;
  prepTime: string;
  onPrepTime: (v: string) => void;
  difficulty: Difficulty | null;
  onDifficulty: (v: Difficulty | null) => void;
  location: Location | null;
  outletName: string;
  onOutletName: (v: string) => void;
  onOpenPicker: () => void;
  palengkeTotal: number;
  savings: number;
  estimating: boolean;
  addedCount: number;
  copyImportNotice: string | null;
  isEditing: boolean;
  deleting: boolean;
  onDelete: () => void;
  photoUrl: string | null;
  photoUploading: boolean;
  photoError: string | null;
  onPickPhoto: () => void;
  steps: string[];
  onStepsChange: (steps: string[]) => void;
}

function ComposeTab(p: ComposeProps) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      <TextInput
        style={styles.titleInput}
        placeholder="Recipe name (e.g. Sinigang na Baboy)…"
        placeholderTextColor={colors.muted}
        value={p.title}
        onChangeText={p.onTitle}
      />

      <Pressable onPress={p.onPickPhoto} style={styles.photoTile}>
        {p.photoUrl ? (
          <Image source={{ uri: p.photoUrl }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            {p.photoUploading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text style={{ fontSize: 22 }}>📷</Text>
                <Text style={styles.photoPlaceholderText}>Add a photo of the finished dish</Text>
              </>
            )}
          </View>
        )}
        {p.photoUrl && p.photoUploading && (
          <View style={styles.photoUploadingOverlay}>
            <ActivityIndicator color={colors.cream} />
          </View>
        )}
        {p.photoUrl && !p.photoUploading && (
          <View style={styles.photoChangeBadge}>
            <Text style={styles.photoChangeBadgeText}>Change</Text>
          </View>
        )}
      </Pressable>
      {p.photoError && <Text style={styles.errorBanner}>{p.photoError}</Text>}

      <Pressable onPress={p.onOpenPicker} style={styles.locationRow}>
        <Text style={{ fontSize: 14 }}>📍</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {p.location ? `City: ${p.location.name}` : 'Choose city or municipality'}
        </Text>
        <Text style={styles.locationChange}>{p.location ? 'Change' : 'Choose'}</Text>
      </Pressable>

      <View style={styles.outletField}>
        <Text style={styles.metaLabel}>Specific store or market</Text>
        <TextInput
          style={styles.outletInput}
          placeholder="e.g. Puregold Cebu, SM City, Robinsons Galleria"
          placeholderTextColor={colors.muted}
          value={p.outletName}
          onChangeText={p.onOutletName}
          maxLength={120}
          autoCapitalize="words"
        />
        <Text style={styles.outletHint}>Prices are matched to this outlet in the selected city. Leave blank for city-wide averages.</Text>
      </View>
      {!!p.copyImportNotice && <Text style={styles.importNotice}>{p.copyImportNotice}</Text>}

      {p.addedCount > 0 && (
        <View style={styles.totalPreview}>
          <View>
            <Text style={styles.totalPreviewLabel}>{p.outletName.trim() ? `${p.outletName.trim()} · Estimated total` : 'Estimated total'}</Text>
            <Text style={styles.totalPreviewValue}>
              {p.estimating ? '…' : peso(p.palengkeTotal)}
            </Text>
          </View>
          {p.savings > 0 && !p.estimating && (
            <Text style={styles.totalPreviewSave}>save {peso(p.savings)} vs supermarket</Text>
          )}
        </View>
      )}

      <TextInput
        style={styles.notesInput}
        placeholder={'Write your recipe notes here…\n\nHow you cook it, tips, or anything worth remembering next time.'}
        placeholderTextColor={colors.muted}
        value={p.notes}
        onChangeText={p.onNotes}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />

      <StepsEditor steps={p.steps} onChange={p.onStepsChange} />

      <View style={styles.metaGrid}>
        <View style={styles.metaField}>
          <Text style={styles.metaLabel}>Category</Text>
          <TextInput
            style={styles.metaInput}
            placeholder="e.g. Ulam"
            placeholderTextColor={colors.muted}
            value={p.category}
            onChangeText={p.onCategory}
          />
        </View>
        <View style={styles.metaField}>
          <Text style={styles.metaLabel}>Servings</Text>
          <TextInput
            style={styles.metaInput}
            placeholder="e.g. 4"
            placeholderTextColor={colors.muted}
            value={p.servings}
            onChangeText={(v) => p.onServings(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.metaField}>
          <Text style={styles.metaLabel}>Prep time</Text>
          <TextInput
            style={styles.metaInput}
            placeholder="e.g. 45 min"
            placeholderTextColor={colors.muted}
            value={p.prepTime}
            onChangeText={p.onPrepTime}
          />
        </View>
        <View style={styles.metaField}>
          <Text style={styles.metaLabel}>Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((d) => (
              <Pressable
                key={d}
                onPress={() => p.onDifficulty(p.difficulty === d ? null : d)}
                style={[styles.difficultyChip, p.difficulty === d && styles.difficultyChipActive]}
              >
                <Text style={[styles.difficultyChipText, p.difficulty === d && styles.difficultyChipTextActive]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {p.isEditing && (
        <Pressable onPress={p.onDelete} disabled={p.deleting} style={styles.deleteRow}>
          <Text style={styles.deleteText}>{p.deleting ? 'Deleting…' : 'Delete this recipe'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// --- Search (Ingredients) tab ----------------------------------------------

interface SearchProps {
  location: Location | null;
  outletName: string;
  addedIds: Set<string>;
  onAdd: (item: Item) => void;
}

function SearchTab({ location, outletName, addedIds, onAdd }: SearchProps) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanConfirm, setScanConfirm] = useState<Item | null>(null);
  const [scanPriceEstimates, setScanPriceEstimates] = useState<{
    loading: boolean;
    palengke: number | null;
    supermarket: number | null;
  } | null>(null);
  const [priceReportItem, setPriceReportItem] = useState<Item | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const debounced = useDebounce(query.trim(), 300);
  const isSearching = debounced.length >= 2;

  // Browse by default (no query yet, or after clearing one); search once
  // the person has typed something. Category changes refetch either way,
  // so switching category always shows something instead of an empty list.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetcher = isSearching
      ? searchItems(debounced, controller.signal)
      : listItems({ category: cat === 'All' ? undefined : cat }, controller.signal);

    fetcher
      .then(setResults)
      .catch((err) => {
        if (!isCancel(err)) setError(describeError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced, isSearching, cat]);

  const filtered = useMemo(
    () => (isSearching && cat !== 'All' ? results.filter((r) => r.category === cat) : results),
    [results, cat, isSearching]
  );

  const handleScanned = async (code: string) => {
    if (!location) return;
    setScanBusy(true);
    setScanMessage(null);
    try {
      const result = await lookupBarcode(code);
      setScannerOpen(false);
      if (result.source === 'not_found') {
        setScanPriceEstimates(null);
        setScanMessage(`No product found for that barcode. Try searching "${code}" by name instead, or add it manually.`);
      } else {
        setScanConfirm(result.item);
        setScanPriceEstimates({ loading: true, palengke: null, supermarket: null });
        Promise.all([
          getItemPriceEstimate({
            itemId: result.item._id,
            locationCode: location.code,
            outletName: outletName.trim() || undefined,
            unit: result.item.baseline_unit,
            source: 'palengke',
          }),
          getItemPriceEstimate({
            itemId: result.item._id,
            locationCode: location.code,
            outletName: outletName.trim() || undefined,
            unit: result.item.baseline_unit,
            source: 'supermarket',
          }),
        ])
          .then(([palengke, supermarket]) => {
            const palengkeRow = palengke.estimates.find((row) => row.unit === result.item.baseline_unit);
            const supermarketRow = supermarket.estimates.find((row) => row.unit === result.item.baseline_unit);
            setScanPriceEstimates({
              loading: false,
              palengke: palengkeRow?.average_price ?? null,
              supermarket: supermarketRow?.average_price ?? null,
            });
          })
          .catch(() => setScanPriceEstimates({ loading: false, palengke: null, supermarket: null }));
      }
    } catch (err) {
      setScannerOpen(false);
      setScanMessage(describeError(err));
    } finally {
      setScanBusy(false);
    }
  };

  if (!location) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.muted}>Set a shopping location on the Compose tab first.</Text>
      </View>
    );
  }

  if (selected) {
    return (
      <IngredientDetail
        item={selected}
        location={location}
        outletName={outletName}
        onBack={() => setSelected(null)}
        onAdd={() => {
          onAdd(selected);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.searchHeader}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, styles.flex]}
            placeholder="Search Philippine ingredients…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setScannerOpen(true)} style={styles.scanButton}>
            <Text style={{ fontSize: 16 }}>▤</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', ...ITEM_CATEGORIES].map((c) => (
            <Pressable key={c} onPress={() => setCat(c)} style={[styles.catChip, c === cat && styles.catChipActive]}>
              <Text style={[styles.catChipText, c === cat && styles.catChipTextActive]}>
                {c.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
        {scanMessage && <Text style={styles.errorBanner}>{scanMessage}</Text>}
        {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />}
        {!loading && error && <Text style={styles.errorBanner}>{error}</Text>}
        {!loading && !error && filtered.length === 0 && (
          <Text style={styles.muted}>
            {isSearching ? `No ingredients found for "${debounced}".` : 'No ingredients in this category yet.'}
          </Text>
        )}
        {filtered.map((item) => (
          <Pressable key={item._id} onPress={() => setSelected(item)} style={styles.resultRow}>
            <Thumbnail uri={item.image_url} category={item.category} size={46} />
            <View style={styles.flex}>
              <View style={styles.resultNameRow}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {item.default_name}
                </Text>
              </View>
              <Text style={styles.resultMeta}>per {item.baseline_unit}</Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAdd(item);
              }}
              style={[styles.addCircle, addedIds.has(item._id) && styles.addCircleActive]}
            >
              <Text style={[styles.addCircleText, addedIds.has(item._id) && styles.addCircleTextActive]}>
                {addedIds.has(item._id) ? '✓' : '+'}
              </Text>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
      <ConfirmAddModal
        visible={!!scanConfirm}
        item={scanConfirm}
        priceEstimates={scanPriceEstimates ?? undefined}
        onCancel={() => setScanConfirm(null)}
        onReportPrice={() => {
          if (scanConfirm) setPriceReportItem(scanConfirm);
          setScanConfirm(null);
        }}
        onConfirm={() => {
          if (scanConfirm) onAdd(scanConfirm);
          setScanConfirm(null);
        }}
      />
      <ScannedPriceModal
        visible={!!priceReportItem}
        item={priceReportItem}
        location={location}
        outletName={outletName}
        onClose={() => setPriceReportItem(null)}
        onSubmitted={() => setPriceReportItem(null)}
      />
      {scanBusy && (
        <View style={styles.scanBusyOverlay}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </View>
  );
}

// --- Ingredient detail panel (inside Search tab) ---------------------------

function IngredientDetail({
  item,
  location,
  outletName,
  onBack,
  onAdd,
}: {
  item: Item;
  location: Location;
  outletName: string;
  onBack: () => void;
  onAdd: () => void;
}) {
  const [rows, setRows] = useState<{ label: string; row: PriceEstimateRow | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    (async () => {
      try {
        const [pal, sm] = await Promise.all([
          getItemPriceEstimate({ itemId: item._id, locationCode: location.code, outletName: outletName.trim() || undefined, unit: item.baseline_unit, source: 'palengke' }),
          getItemPriceEstimate({ itemId: item._id, locationCode: location.code, outletName: outletName.trim() || undefined, unit: item.baseline_unit, source: 'supermarket' }),
        ]);
        if (cancelled) return;
        const palRow = pal.estimates.find((e) => e.unit === item.baseline_unit) ?? null;
        const smRow = sm.estimates.find((e) => e.unit === item.baseline_unit) ?? null;
        setRows([
          { label: outletName.trim() ? `${outletName.trim()} · Palengke` : 'Palengke', row: palRow },
          { label: outletName.trim() ? `${outletName.trim()} · Supermarket` : 'Supermarket', row: smRow },
        ]);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item._id, location.code, outletName]);

  const cheapestLabel = useMemo(() => {
    if (!rows) return null;
    const priced = rows.filter((r) => r.row);
    if (priced.length < 2) return null;
    return priced.reduce((a, b) => (a.row!.average_price <= b.row!.average_price ? a : b)).label;
  }, [rows]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.backToResults}>
        <Text style={styles.backToResultsText}>‹ Back to results</Text>
      </Pressable>

      <View style={styles.detailCard}>
        <View style={styles.detailImage}>
          <Thumbnail uri={item.image_url} category={item.category} size={64} />
        </View>
        <View style={styles.detailBody}>
          <View style={styles.detailHeaderRow}>
            <View style={styles.flex}>
              <Text style={styles.detailName}>{item.default_name}</Text>
              <Text style={styles.detailUnit}>per {item.baseline_unit}</Text>
            </View>
            <Tag label={item.category.replace(/_/g, ' ')} color={colors.accent} background={colors.accentMuted} />
          </View>

          {!rows && !error && <ActivityIndicator color={colors.accent} style={{ marginVertical: 14 }} />}
          {error && <Text style={styles.errorBanner}>{error}</Text>}

          {rows && (
            <View style={{ gap: 8, marginBottom: 14, marginTop: 10 }}>
              {rows.map(({ label, row }) => {
                const best = label === cheapestLabel;
                return (
                  <View key={label} style={[styles.priceRow, best && styles.priceRowBest]}>
                    <View style={styles.priceRowLeft}>
                      {best && <View style={styles.priceDot} />}
                      <Text style={[styles.priceRowLabel, best && { color: colors.cream }]}>{label}</Text>
                      {best && <Tag label="Cheapest" color={colors.green} background="transparent" />}
                    </View>
                    <Text style={[styles.priceRowValue, { color: best ? colors.green : colors.muted }]}>
                      {row ? peso(row.average_price) : 'No data'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Palengke Tip</Text>
            <Text style={styles.tipText}>
              {outletName.trim()
                ? `Showing reports for ${outletName.trim()} in ${location.name}.`
                : 'Prices are crowdsourced across nearby stores and markets. Name an outlet on Compose to narrow the comparison.'}
            </Text>
          </View>

          <Pressable onPress={onAdd} style={styles.addToRecipeButton}>
            <Text style={styles.addToRecipeText}>+ Add to Recipe</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// --- Basket tab --------------------------------------------------------------

interface BasketProps {
  added: AddedIngredient[];
  estimate: RecipeEstimate | null;
  outletName: string;
  copyImportNotice: string | null;
  palengkeTotal: number;
  supermarketTotal: number;
  savings: number;
  onChangeQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onGoToSearch: () => void;
  onSave: () => void;
  saving: boolean;
}

function BasketTab(p: BasketProps) {
  if (p.added.length === 0) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ fontSize: 32, marginBottom: 10 }}>🧺</Text>
        <Text style={styles.muted}>No ingredients yet.</Text>
        {!!p.copyImportNotice && <Text style={styles.importNotice}>{p.copyImportNotice}</Text>}
        <Pressable onPress={p.onGoToSearch} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Search Ingredients →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
      {!!p.copyImportNotice && <Text style={styles.importNotice}>{p.copyImportNotice}</Text>}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>{p.outletName.trim() ? `${p.outletName.trim()} · Palengke` : 'Palengke Total'}</Text>
            <Text style={styles.summaryValueGreen}>{peso(p.palengkeTotal)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>{p.outletName.trim() ? `${p.outletName.trim()} · Supermarket` : 'Supermarket Total'}</Text>
            <Text style={styles.summaryValueMuted}>{peso(p.supermarketTotal)}</Text>
          </View>
        </View>
        <View style={styles.savingsBar}>
          <Text style={styles.savingsLabel}>You save</Text>
          <Text style={styles.savingsValue}>{peso(p.savings)}</Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {p.added.map(({ item, quantity }) => {
          const line = p.estimate?.lines.find((l) => l.item_id === item._id);
          return (
            <View key={item._id} style={styles.basketRow}>
              <Thumbnail uri={item.image_url} category={item.category} size={40} />
              <View style={styles.flex}>
                <Text style={styles.basketName} numberOfLines={1}>
                  {item.default_name}
                </Text>
                <Text style={styles.basketUnit}>{item.baseline_unit}</Text>
              </View>

              <View style={styles.stepper}>
                <Pressable onPress={() => p.onChangeQty(item._id, -1)} style={styles.stepButton}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.stepQty}>{quantity}</Text>
                <Pressable onPress={() => p.onChangeQty(item._id, 1)} style={[styles.stepButton, styles.stepButtonAccent]}>
                  <Text style={[styles.stepText, { color: colors.accent }]}>+</Text>
                </Pressable>
              </View>

              <Text style={styles.basketCost}>
                {line?.priced && line.cost !== undefined ? peso(line.cost) : '—'}
              </Text>

              <Pressable onPress={() => p.onRemove(item._id)} style={styles.removeCircle}>
                <Text style={styles.removeCircleText}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable onPress={p.onSave} disabled={p.saving} style={styles.saveRecipeButton}>
        <Text style={styles.saveRecipeText}>{p.saving ? 'Saving…' : 'Save Recipe →'}</Text>
      </Pressable>
    </ScrollView>
  );
}

// --- Styles ------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  loadingRoot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },

  header: { paddingHorizontal: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, color: colors.cream, marginTop: -2 },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.bodySemibold,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: { fontFamily: fonts.display, fontSize: 19, color: colors.cream, marginTop: 2 },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDone: { backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder },
  saveButtonText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.onAccent },
  saveButtonTextDone: { color: colors.green },
  errorBanner: {
    color: colors.red,
    fontFamily: fonts.body,
    fontSize: 12,
    backgroundColor: colors.redMuted,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },

  tabBar: { flexDirection: 'row', gap: 4, backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabButtonActive: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  tabText: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  tabTextActive: { fontFamily: fonts.bodySemibold, color: colors.cream },

  tabContent: { padding: 18, paddingTop: 4, paddingBottom: 40, gap: 12 },

  titleInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.display,
    color: colors.cream,
  },
  photoTile: {
    height: 140,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPlaceholderText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,26,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoChangeBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(12,26,16,0.75)',
    borderRadius: radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoChangeBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.cream },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationText: { flex: 1, fontSize: 13, fontFamily: fonts.body, color: colors.cream },
  locationChange: { fontSize: 12, fontFamily: fonts.bodySemibold, color: colors.accent },
  outletField: { gap: 5 },
  outletInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  outletHint: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  importNotice: { color: colors.blue, backgroundColor: colors.blueMuted, borderWidth: 1, borderColor: colors.blueBorder, borderRadius: 10, padding: 10, fontSize: 11, lineHeight: 16 },

  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius,
    padding: 12,
  },
  totalPreviewLabel: { fontSize: 10, fontFamily: fonts.body, color: colors.muted, textTransform: 'uppercase' },
  totalPreviewValue: { fontFamily: fonts.display, fontSize: 20, color: colors.accent, marginTop: 2 },
  totalPreviewSave: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },

  notesInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 14,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.cream,
    lineHeight: 20,
    minHeight: 140,
  },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaField: { width: '47%' },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  metaInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  difficultyRow: { flexDirection: 'row', gap: 6 },
  difficultyChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  difficultyChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  difficultyChipText: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },
  difficultyChipTextActive: { color: colors.onAccent, fontFamily: fonts.bodySemibold },

  deleteRow: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  deleteText: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },

  // Search tab
  searchHeader: { paddingHorizontal: 18, paddingBottom: 8, gap: 10 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanButton: {
    width: 42,
    height: 42,
    borderRadius: radius,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,26,16,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.cream,
  },
  catChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusPill,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginRight: 7,
  },
  catChipActive: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  catChipText: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },
  catChipTextActive: { color: colors.green, fontFamily: fonts.bodySemibold },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
  },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultName: { fontSize: 13, fontFamily: fonts.body, color: colors.cream },
  resultMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleActive: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  addCircleText: { color: colors.accent, fontSize: 15, fontFamily: fonts.bodySemibold },
  addCircleTextActive: { color: colors.green },

  // Ingredient detail
  backToResults: { paddingVertical: 4, marginBottom: 4 },
  backToResultsText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailImage: { backgroundColor: colors.cardAlt, alignItems: 'center', paddingVertical: 18 },
  detailBody: { padding: 16 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailName: { fontFamily: fonts.display, fontSize: 17, color: colors.cream },
  detailUnit: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  priceRowBest: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  priceRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  priceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  priceRowLabel: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  priceRowValue: { fontSize: 14, fontFamily: fonts.bodySemibold },
  tipBox: {
    backgroundColor: colors.blueMuted,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 10,
    padding: 11,
    marginBottom: 14,
  },
  tipTitle: { fontSize: 11, fontFamily: fonts.bodySemibold, color: colors.blue, marginBottom: 3 },
  tipText: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, lineHeight: 17 },
  addToRecipeButton: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  addToRecipeText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.onAccent },

  // Basket
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    padding: 14,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 10, fontFamily: fonts.body, color: colors.muted, textTransform: 'uppercase' },
  summaryValueGreen: { fontFamily: fonts.display, fontSize: 22, color: colors.green, marginTop: 3 },
  summaryValueMuted: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginTop: 3,
  },
  savingsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.greenMuted,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savingsLabel: { fontSize: 12, fontFamily: fonts.body, color: colors.green },
  savingsValue: { fontSize: 15, fontFamily: fonts.display, color: colors.green },

  basketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
  },
  basketName: { fontSize: 12, fontFamily: fonts.body, color: colors.cream },
  basketUnit: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, fontStyle: 'italic' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.faint,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonAccent: { backgroundColor: colors.accentMuted, borderColor: colors.accentBorder },
  stepText: { fontSize: 15, color: colors.muted, lineHeight: 16 },
  stepQty: { fontSize: 13, fontFamily: fonts.body, color: colors.cream, minWidth: 14, textAlign: 'center' },
  basketCost: { fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.green, minWidth: 48, textAlign: 'right' },
  removeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.redMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeCircleText: { fontSize: 10, color: colors.red },

  emptyButton: {
    marginTop: 14,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 12 },

  saveRecipeButton: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveRecipeText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.onAccent },
});