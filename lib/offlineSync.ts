import NetInfo from '@react-native-community/netinfo';
import {
    getPendingActions,
    removePendingActionById,
    type PendingAction,
} from './offlineStorage';
import {
    createRoutine,
    saveExerciseCheckin,
    saveRoutineCheckin,
} from './routines';

let syncInProgress = false;

async function processPendingAction(action: PendingAction): Promise<void> {
    switch (action.type) {
        case 'CREATE_ROUTINE': {
            await createRoutine(action.payload);
            return;
        }

        case 'EXERCISE_CHECKIN': {
            await saveExerciseCheckin(action.exerciseId, action.payload);
            return;
        }

        case 'ROUTINE_CHECKIN': {
            await saveRoutineCheckin(action.routineId, action.payload);
            return;
        }

        default: {
            const exhaustiveCheck: never = action;
            throw new Error(`Acción no soportada: ${JSON.stringify(exhaustiveCheck)}`);
        }
    }
}

export async function syncPendingActions(): Promise<{
    processed: number;
    remaining: number;
}> {
    if (syncInProgress) {
        return { processed: 0, remaining: (await getPendingActions()).length };
    }

    syncInProgress = true;

    try {
        const netState = await NetInfo.fetch();

        if (!netState.isConnected) {
            return {
                processed: 0,
                remaining: (await getPendingActions()).length,
            };
        }

        const actions = await getPendingActions();

        let processed = 0;

        for (const action of actions) {
            try {
                await processPendingAction(action);
                await removePendingActionById(action.id);
                processed += 1;
            } catch (error) {
                console.error('Error sincronizando acción pendiente:', action, error);

                // Cortamos en la primera que falla para mantener orden y evitar efectos raros.
                break;
            }
        }

        const remaining = (await getPendingActions()).length;

        return { processed, remaining };
    } finally {
        syncInProgress = false;
    }
}

export function isSyncInProgress(): boolean {
    return syncInProgress;
}