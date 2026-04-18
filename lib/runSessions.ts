import { apiFetch } from './api';

export type CreateRunSessionPayload = {
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    distanceMeters: number;
    avgPaceSecPerKm?: number | null;
    maxSpeedMps?: number | null;
    pathGeoJson?: any;
};

export type RunSession = {
    id: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    distanceMeters: number;
    avgPaceSecPerKm: number | null;
    maxSpeedMps: number | null;
    pathGeoJson: any;
    createdAt: string;
    updatedAt: string;
};

export async function createRunSession(payload: CreateRunSessionPayload) {
    const res = await apiFetch('/run-sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo guardar la sesión de running');
    }

    return data as { message: string; item: RunSession };
}

export async function getMyRunSessions() {
    const res = await apiFetch('/run-sessions/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudieron cargar las sesiones');
    }

    return data as { items: RunSession[] };
}

export async function deleteRunSession(sessionId: string) {
    const res = await apiFetch(`/run-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo borrar la sesión');
    }

    return data as { message: string };
}