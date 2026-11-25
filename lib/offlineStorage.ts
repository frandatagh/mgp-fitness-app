import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateRoutinePayload, Routine } from './routines';

export type PendingAction =
    | {
        id: string;
        userId?: string;
        type: 'CREATE_ROUTINE';
        payload: CreateRoutinePayload;
        createdAt: number;
    }
    | {
        id: string;
        userId?: string;
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
        userId?: string;
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
        const raw = await AsyncStorage.getItem(
            STORAGE_KEYS.pendingActions
        );

        if (!raw) return [];


        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            throw new Error(
                'El formato de las acciones pendientes no es válido.'
            );
        }

        return parsed as PendingAction[];

    } catch (error) {
        console.error('Error leyendo acciones pendientes:', error);
        throw error;
    }

}

export async function setPendingActions(
    actions: PendingAction[]
): Promise<void> {
    await AsyncStorage.setItem(
        STORAGE_KEYS.pendingActions,
        JSON.stringify(actions)
    );
}

/**
 * Serializa las modificaciones de la cola offline.
 * Cada operación espera a que termine la anterior.
 */
let pendingActionsWriteQueue: Promise<void> = Promise.resolve();

function schedulePendingActionWrite(
    operation: () => Promise<void>
): Promise<void> {
    const nextOperation = pendingActionsWriteQueue.then(operation);

    // Permitimos que futuras operaciones continúen,
    // incluso si una escritura anterior falló.
    pendingActionsWriteQueue = nextOperation.catch(() => { });

    // El error sí se informa a quien solicitó la operación.
    return nextOperation;
}




export async function enqueuePendingAction(
    action: PendingAction
): Promise<void> {
    return schedulePendingActionWrite(async () => {
        const current = await getPendingActions();

        // No agregamos dos veces la misma acción.
        if (current.some((item) => item.id === action.id)) {
            return;
        }

        await setPendingActions([...current, action]);
    });
}

export async function removePendingActionById(
    actionId: string
): Promise<void> {
    return schedulePendingActionWrite(async () => {
        const current = await getPendingActions();

        const next = current.filter(
            (action) => action.id !== actionId
        );

        // No escribimos si la acción ya no existe.
        if (next.length === current.length) {
            return;
        }

        await setPendingActions(next);
    });
}



export async function clearPendingActions(): Promise<void> {
    return schedulePendingActionWrite(async () => {
        await AsyncStorage.removeItem(
            STORAGE_KEYS.pendingActions
        );
    });
}


export function createPendingActionId(): string {
    return `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}