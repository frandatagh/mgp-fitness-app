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

export type TrainingActivityDay = {
    date: string;

    routineRecords: number;

    exerciseRecords: number;

    runningSessions: number;

    totalRecords: number;

    active: boolean;
};


export type TrainingActivityWeek = {
    weekStart: string;

    weekEnd: string;

    activeDays: number;

    routineRecords: number;

    exerciseRecords: number;

    runningSessions: number;

    totalRecords: number;

    consistencyScore: number;
};


export type TrainingActivityResponse = {
    currentWeek:
    TrainingActivityDay[];

    currentMonth:
    TrainingActivityDay[];

    weeklyHistory:
    TrainingActivityWeek[];

    totals: {
        activeDays: number;

        routineRecords: number;

        exerciseRecords: number;

        runningSessions: number;

        totalRecords: number;
    };
};

export type MyStatisticsResponse = {
    summary: {
        weeklySessions: number;
        totalDistanceMeters: number;
        avgEffort: number | null;
    };

    insights: InsightItem[];

    performance: {
        /*
         * Promedio de las valoraciones
         * de la semana actual.
         */
        weeklyAverage:
        number | null;

        /*
         * Promedio del mes actual.
         */
        monthlyAverage:
        number | null;

        /*
         * Última valoración registrada.
         */
        latestAverage:
        number | null;

        bestDay:
        string | null;

        worstDay:
        string | null;

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

export async function getTrainingActivity() {
    const res =
        await apiFetch(
            '/statistics/activity'
        );

    const data =
        await res
            .json()
            .catch(
                () => null
            );

    if (!res.ok) {
        throw new Error(
            data?.message ||
            'No se pudo cargar la actividad'
        );
    }

    return data as TrainingActivityResponse;
}