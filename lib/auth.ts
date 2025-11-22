// lib/auth.ts
import { apiFetch } from './api';

export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
};

export type AuthResponse = {
    token: string;
    user: AuthUser;
};

/**
 * Login: envía email y password, devuelve token + user
 */
export async function loginRequest(
    email: string,
    password: string
): Promise<AuthResponse> {
    const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('Error en login, respuesta:', text);
        throw new Error('Credenciales inválidas o error al iniciar sesión');
    }

    const data = (await res.json()) as AuthResponse;
    return data;
}

/**
 * Registro: crea usuario nuevo, devuelve token + user
 */
export async function registerRequest(
    name: string,
    email: string,
    password: string
): Promise<AuthResponse> {
    const res = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('Error en registro, respuesta:', text);
        throw new Error('No se pudo crear la cuenta (revisa email / contraseña)');
    }

    const data = (await res.json()) as AuthResponse;
    return data;
}
