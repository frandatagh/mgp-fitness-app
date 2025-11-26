// lib/api.ts
import Constants from 'expo-constants';

const API_URL =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    'http://localhost:3000/api';   // 👈 CAMBIADO AQUÍ

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
    currentToken = token;
}

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const url = `${API_URL}${path}`;

    const headers: HeadersInit = {
        ...(options.headers || {}),
    };

    if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    return res;
}
