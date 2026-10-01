import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Difficulty, RecipeSummary } from './types';

const COMMUNITY_COPIES_KEY = 'magkanote:communityCopies';
const COMMUNITY_COPY_DEFAULTS: Record<number, { category: string; prepTime: string; difficulty: Difficulty }> = {
  1: { category: 'Ulam', prepTime: '3 hr', difficulty: 'Hard' },
  2: { category: 'Sabaw', prepTime: '3 hr', difficulty: 'Medium' },
  3: { category: 'Ulam', prepTime: '50 min', difficulty: 'Easy' },
  4: { category: 'Meryenda', prepTime: '1 hr', difficulty: 'Medium' },
  5: { category: 'Sabaw', prepTime: '2 hr 30 min', difficulty: 'Easy' },
  6: { category: 'Gulay', prepTime: '45 min', difficulty: 'Easy' },
};

export interface CommunityRecipeCopy {
  id: number;
  title: string;
  author: string;
  area: string;
  image: string;
  cost: number;
  tags: string[];
  servings: number;
  copiedAt: string;
  category?: string;
  prepTime?: string;
  difficulty?: Difficulty;
  ingredients?: { name: string; amount: string }[];
  steps?: string[];
}

export async function getCommunityRecipeCopies(): Promise<CommunityRecipeCopy[]> {
  const stored = await AsyncStorage.getItem(COMMUNITY_COPIES_KEY);
  if (!stored) return [];

  try {
    return (JSON.parse(stored) as CommunityRecipeCopy[]).map((copy) => ({
      ...COMMUNITY_COPY_DEFAULTS[copy.id],
      ...copy,
    }));
  } catch {
    return [];
  }
}

export async function addCommunityRecipeCopy(recipe: Omit<CommunityRecipeCopy, 'copiedAt'>): Promise<void> {
  const copies = await getCommunityRecipeCopies();
  if (copies.some((copy) => copy.id === recipe.id)) return;

  copies.unshift({ ...COMMUNITY_COPY_DEFAULTS[recipe.id], ...recipe, copiedAt: new Date().toISOString() });
  await AsyncStorage.setItem(COMMUNITY_COPIES_KEY, JSON.stringify(copies));
}

export function toRecipeSummary(copy: CommunityRecipeCopy): RecipeSummary {
  return {
    _id: `community-copy:${copy.id}`,
    title: copy.title,
    category: copy.category ?? copy.tags[0] ?? null,
    servings: copy.servings,
    prep_time: copy.prepTime ?? null,
    difficulty: copy.difficulty ?? null,
    image_url: copy.image,
    is_favorite: false,
    item_count: 0,
    total_estimated_cost: copy.cost,
    total_supermarket_cost: null,
    created_at: copy.copiedAt,
  };
}