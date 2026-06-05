import { apiFetch } from './api';

export type InsightItem = {
    id: string;
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'neutral';
};

export type ExerciseEffortItem = {
    exerciseId: string;
    exerciseName: string;
    avgEffort: number;
    count: number;
};

export type MyStatisticsResponse = {
    summary: {
        weeklySessions: number;
        totalDistanceMeters: number;
        avgEffort: number | null;
    };

    insights: InsightItem[];

    performance: {
        weeklyAverage: number | null;
        bestDay: string | null;
        worstDay: string | null;

        chart: {
            labels: string[];
            gym: number[];
            running: number[];
        };
    };

    running: {
        weeklyDurationSeconds: number;
        monthlyDurationSeconds: number;

        avgMaxSpeedMps: number | null;

        weeklyAvgPaceSecPerKm: number | null;
        monthlyAvgPaceSecPerKm: number | null;

        weeklyDistanceMeters: number;
        monthlyDistanceMeters: number;
    };

    effort: {
        avgEffortByExercise: ExerciseEffortItem[];

        topBestExercises: ExerciseEffortItem[];

        topHardestExercises: ExerciseEffortItem[];
    };
};

export async function getMyStatistics() {
    const res = await apiFetch('/statistics/me');

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudieron cargar las estadísticas');
    }

    return data as MyStatisticsResponse;
}

export type AdviceItem = {
    id: string;
    title: string;
    description: string;
    type: 'running' | 'training' | 'recovery' | 'nutrition' | 'habit';
    priority: number;
};

export async function getMyAdvice() {
    const res = await apiFetch('/statistics/advice');

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudieron cargar los consejos');
    }

    return data as { items: AdviceItem[] };
}