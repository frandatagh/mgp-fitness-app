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
            await createRoutine(
                action.payload,
                action.id
            );
            return;
        }



        case 'EXERCISE_CHECKIN': {
            await saveExerciseCheckin(
                action.exerciseId,
                {
                    ...action.payload,
                    performedAt: new Date(action.createdAt).toISOString(),
                }
            );
            return;
        }


        case 'ROUTINE_CHECKIN': {
            await saveRoutineCheckin(
                action.routineId,
                {
                    ...action.payload,
                    performedAt: new Date(action.createdAt).toISOString(),
                }
            );
            return;
        }

        default: {
            const exhaustiveCheck: never = action;
            throw new Error(`Acción no soportada: ${JSON.stringify(exhaustiveCheck)}`);
        }
    }
}



export async function syncPendingActions(
    userId: string,
    isSessionActive: () => boolean
): Promise<{
    processed: number;
    remaining: number;
}> {
    // Sin usuario o sin sesión activa, no sincronizamos.
    if (!userId.trim() || !isSessionActive()) {
        return {
            processed: 0,
            remaining: (await getPendingActions()).length,
        };
    }

    // Evitamos sincronizaciones simultáneas.
    if (syncInProgress) {
        return {
            processed: 0,
            remaining: (await getPendingActions()).length,
        };
    }

    syncInProgress = true;

    try {
        const netState = await NetInfo.fetch();


        if (
            netState.isConnected !== true ||
            netState.isInternetReachable === false
        ) {
            return {
                processed: 0,
                remaining: (await getPendingActions()).length,
            };
        }

        const actions = await getPendingActions();

        let processed = 0;



        for (const action of actions) {
            // Si cambió la sesión, dejamos de enviar acciones.
            if (!isSessionActive()) {
                console.warn(
                    'Sincronización detenida: la sesión ya no está activa.'
                );
                break;
            }

            // Solo procesamos acciones del usuario autenticado.
            if (action.userId !== userId) {
                continue;
            }


            try {
                await processPendingAction(action);

                // Volvemos a comprobar la sesión después de
                // recibir la respuesta del servidor.
                if (!isSessionActive()) {
                    console.warn(
                        '[OfflineSync] La sesión cambió durante la solicitud. ' +
                        'La acción permanecerá pendiente para su verificación.'
                    );
                    break;
                }

                // Eliminamos la acción solamente después de
                // una respuesta exitosa y una sesión vigente.
                await removePendingActionById(action.id);

                processed += 1;

            } catch (error) {
                console.error(
                    'Error sincronizando acción pendiente:',
                    action.id,
                    error
                );

                // Conservamos la acción y detenemos esta sincronización.
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