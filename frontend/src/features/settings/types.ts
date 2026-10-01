import type { Location } from '../../types';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  location: null,
  radius: 3,
  market: 'Any nearby market',
  householdSize: 4,
  weeklyBudget: '',
  dietary: [],
  priceDrops: true,
  nearbyReports: true,
  weeklySummary: true,
  publicProfile: false,
};

export interface UserPreferences {
  location: Location | null;
  radius: 1 | 3 | 5 | 10;
  market: string;
  householdSize: number;
  weeklyBudget: string;
  dietary: string[];
  priceDrops: boolean;
  nearbyReports: boolean;
  weeklySummary: boolean;
  publicProfile: boolean;
}

export interface UserSettingsResponse {
  profile: {
    username: string;
    email: string;
    profile_image_url: string | null;
  };
  preferences: {
    location: Location | null;
    radius: 1 | 3 | 5 | 10;
    market: string;
    household_size: number;
    weekly_budget: number | null;
    dietary: string[];
    price_drops: boolean;
    nearby_reports: boolean;
    weekly_summary: boolean;
    public_profile: boolean;
  };
}

export interface SaveUserSettingsPayload {
  preferences: UserPreferences;
  profileImageUrl: string | null;
}