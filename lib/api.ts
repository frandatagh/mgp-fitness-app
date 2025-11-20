const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const url = `${API_URL}${path}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
        ...options,
    });

    let data: any = null;
    try {
        data = await response.json();
    } catch {
        // puede que no haya body (204, etc.)
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            `Error ${response.status} al llamar a ${path}`;

        throw new Error(message);
    }

    return data as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),
    put: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),
    patch: <T>(path: string, body?: unknown) =>
        request<T>(path, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),
    delete: <T>(path: string) =>
        request<T>(path, {
            method: 'DELETE',
        }),
};
