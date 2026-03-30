// lib/api.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    'http://localhost:3000/api';

const TOKEN_KEY = 'mgp_token';

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
    currentToken = token;
}

async function getStoredToken(): Promise<string | null> {
    try {
        if (currentToken) return currentToken;

        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return null;
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (token) {
                currentToken = token;
            }
            return token;
        }

        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
            currentToken = token;
        }
        return token;
    } catch (error) {
        console.log('Error leyendo token desde storage:', error);
        return null;
    }
}

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const url = `${API_URL}${path}`;

    const token = await getStoredToken();

    const headers: HeadersInit = {
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    return res;
}