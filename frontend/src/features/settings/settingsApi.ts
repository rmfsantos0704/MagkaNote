import { apiClient } from '../../api';
import type { SaveUserSettingsPayload, UserSettingsResponse } from './types';

export async function getUserSettings(userId: string): Promise<UserSettingsResponse> {
  const { data } = await apiClient.get<UserSettingsResponse>(`/users/${userId}/settings`);
  return data;
}

export async function saveUserSettings(userId: string, payload: SaveUserSettingsPayload): Promise<UserSettingsResponse> {
  const location = payload.preferences.location;
  const { data } = await apiClient.put<UserSettingsResponse>(`/users/${userId}/settings`, {
    location_code: location?.code ?? null,
    location_name: location?.name ?? null,
    radius: payload.preferences.radius,
    market: payload.preferences.market,
    household_size: payload.preferences.householdSize,
    weekly_budget: payload.preferences.weeklyBudget ? Number(payload.preferences.weeklyBudget) : null,
    dietary: payload.preferences.dietary,
    price_drops: payload.preferences.priceDrops,
    nearby_reports: payload.preferences.nearbyReports,
    weekly_summary: payload.preferences.weeklySummary,
    public_profile: payload.preferences.publicProfile,
    profile_image_url: payload.profileImageUrl,
  });
  return data;
}