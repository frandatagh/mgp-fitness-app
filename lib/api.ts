// lib/api.ts
import Constants from 'expo-constants';

const API_URL =
    Constants.expoConfig?.extra?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    'http://192.168.0.81:3000/api';

let currentToken: string | null = null;

// lo llama AuthContext cuando haces login/logout
export function setAuthToken(token: string | null) {
    currentToken = token;
}

// 👉 TIPAR BIEN apiFetch
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

    return res; // <- Response
}
