import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateRoutinePayload, Routine } from './routines';

export type PendingAction =
    | {
        id: string;
        type: 'CREATE_ROUTINE';
        payload: CreateRoutinePayload;
        createdAt: number;
    }
    | {
        id: string;
        type: 'EXERCISE_CHECKIN';
        exerciseId: string;
        payload: {
            routineId: string;
            score: number;
        };
        createdAt: number;
    }
    | {
        id: string;
        type: 'ROUTINE_CHECKIN';
        routineId: string;
        payload: {
            score: number;
        };
        createdAt: number;
    };

const STORAGE_KEYS = {
    routinesList: 'offline:routines:list',
    routineDetailPrefix: 'offline:routine:detail:',
    pendingActions: 'offline:pending-actions',
} as const;

function routineDetailKey(id: string): string {
    return `${STORAGE_KEYS.routineDetailPrefix}${id}`;
}

export async function getCachedRoutines(): Promise<Routine[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.routinesList);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Error leyendo cache de rutinas:', error);
        return [];
    }
}

export async function setCachedRoutines(routines: Routine[]): Promise<void> {
    try {
        await AsyncStorage.setItem(
            STORAGE_KEYS.routinesList,
            JSON.stringify(routines)
        );
    } catch (error) {
        console.error('Error guardando cache de rutinas:', error);
    }
}

export async function getCachedRoutineDetail(id: string): Promise<Routine | null> {
    try {
        const raw = await AsyncStorage.getItem(routineDetailKey(id));
        if (!raw) return null;

        return JSON.parse(raw) as Routine;
    } catch (error) {
        console.error(`Error leyendo cache de rutina ${id}:`, error);
        return null;
    }
}

export async function setCachedRoutineDetail(
    id: string,
    routine: Routine
): Promise<void> {
    try {
        await AsyncStorage.setItem(routineDetailKey(id), JSON.stringify(routine));
    } catch (error) {
        console.error(`Error guardando cache de rutina ${id}:`, error);
    }
}

export async function removeCachedRoutineDetail(id: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(routineDetailKey(id));
    } catch (error) {
        console.error(`Error borrando cache de rutina ${id}:`, error);
    }
}

export async function getPendingActions(): Promise<PendingAction[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.pendingActions);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Error leyendo acciones pendientes:', error);
        return [];
    }
}

export async function setPendingActions(actions: PendingAction[]): Promise<void> {
    try {
        await AsyncStorage.setItem(
            STORAGE_KEYS.pendingActions,
            JSON.stringify(actions)
        );
    } catch (error) {
        console.error('Error guardando acciones pendientes:', error);
    }
}

export async function enqueuePendingAction(action: PendingAction): Promise<void> {
    const current = await getPendingActions();
    current.push(action);
    await setPendingActions(current);
}

export async function removePendingActionById(actionId: string): Promise<void> {
    const current = await getPendingActions();
    const next = current.filter((action) => action.id !== actionId);
    await setPendingActions(next);
}

export async function clearPendingActions(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.pendingActions);
    } catch (error) {
        console.error('Error limpiando acciones pendientes:', error);
    }
}

export function createPendingActionId(): string {
    return `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}