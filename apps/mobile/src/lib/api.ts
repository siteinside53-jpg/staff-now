import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { ApiClient, StaffNowApi } from '@staffnow/api-client';

const TOKEN_KEY = 'staffnow_token';

const baseUrl =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8787';

// ---------------------------------------------------------------------------
// Token helpers using Expo SecureStore
// ---------------------------------------------------------------------------

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const apiClient = new ApiClient({
  baseUrl,
  getToken,
  onUnauthorized: async () => {
    await removeToken();
    // Navigation will be handled by the auth context watching the user state
  },
});

export const api = new StaffNowApi(apiClient);
export { apiClient };
