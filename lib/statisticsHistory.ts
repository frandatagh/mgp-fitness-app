import { apiFetch } from './api';

export type StatisticsHistoryRecord = {
    id: string;
    type: 'run' | 'routine' | 'exercise';
    title: string;
    subtitle: string;
    rating?: number | null;
    createdAt: string;
};

export type StatisticsHistoryDay = {
    date: string;
    label: string;
    records: StatisticsHistoryRecord[];
};

export async function getStatisticsHistory(): Promise<{
    items: StatisticsHistoryDay[];
    archivedItems: StatisticsArchivedHistoryItem[];
}> {
    const res = await apiFetch('/statistics/history');

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo cargar el historial');
    }

    return {
        items: data?.items ?? [],
        archivedItems: data?.archivedItems ?? [],
    };
}

export async function deleteStatisticsHistoryRecord(
    type: 'run' | 'routine' | 'exercise',
    id: string
) {
    let endpoint = '';

    if (type === 'run') {
        endpoint = `/run-sessions/${id}`;
    }

    if (type === 'routine') {
        endpoint = `/routine-checkins/${id}`;
    }

    if (type === 'exercise') {
        endpoint = `/exercise-checkins/${id}`;
    }

    const res = await apiFetch(endpoint, {
        method: 'DELETE',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo borrar el registro');
    }

    return data;
}

export type StatisticsArchivedHistoryItem = {
    id: string;
    year: number;
    month: number;
    label: string;
    subtitle: string;
    runSessions: number;
    runningDistanceMeters: number;
    runningDurationSeconds: number;
    avgRunRating: number | null;
    avgRoutineRating: number | null;
    avgExerciseEffort: number | null;
};

export async function clearAllStatisticsHistory() {
    const res = await apiFetch('/statistics/history/clear-all', {
        method: 'DELETE',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo limpiar el historial');
    }

    return data;
}