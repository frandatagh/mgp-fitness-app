import { api } from './api';

// Ajusta esto a lo que devuelva tu backend realmente
export interface AuthUser {
    id: string;
    email: string;
    username?: string;
}

export interface AuthResponse {
    user: AuthUser;
    token: string; // o accessToken, como lo tengas en el backend
}

export async function loginRequest(email: string, password: string) {
    // Ajusta la ruta si en tu backend es diferente
    return api.post<AuthResponse>('/auth/login', { email, password });
}

export async function registerRequest(input: {
    username: string;
    email: string;
    password: string;
}) {
    return api.post<AuthResponse>('/auth/register', input);
}
