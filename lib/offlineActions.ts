import NetInfo from '@react-native-community/netinfo';
import {
    createPendingActionId,
    enqueuePendingAction,
} from './offlineStorage';
import {
    createRoutine,
    saveExerciseCheckin,
    saveRoutineCheckin,
    type CreateRoutinePayload,
} from './routines';


export async function createRoutineWithOfflineSupport(
    payload: CreateRoutinePayload,
    userId: string
) {
    // Verificamos que la rutina tenga un propietario.
    if (!userId?.trim()) {
        throw new Error(
            'No se puede crear una rutina sin identificar al usuario.'
        );
    }

    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            userId,
            type: 'CREATE_ROUTINE',
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message:
                'Rutina guardada localmente. Se sincronizará cuando vuelva internet.',
        };
    }

    const result = await createRoutine(payload);

    return {
        offlineSaved: false,
        message: 'Rutina guardada correctamente.',
        data: result,
    };
}



export async function saveExerciseCheckinWithOfflineSupport(
    exerciseId: string,
    payload: { routineId: string; score: number },
    userId: string
) {
    // Verificamos que la valoración tenga propietario.
    if (!userId.trim()) {
        throw new Error(
            'No se puede guardar el ejercicio sin identificar al usuario.'
        );
    }

    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            userId,
            type: 'EXERCISE_CHECKIN',
            exerciseId,
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message:
                'Valoración guardada localmente. Se sincronizará al reconectar.',
        };
    }

    const result = await saveExerciseCheckin(
        exerciseId,
        payload
    );

    return {
        offlineSaved: false,
        message: 'Valoración guardada correctamente.',
        data: result,
    };
}



export async function saveRoutineCheckinWithOfflineSupport(
    routineId: string,
    payload: { score: number },
    userId: string
) {
    // Ninguna valoración puede guardarse sin propietario.
    if (!userId.trim()) {
        throw new Error(
            'No se puede guardar la valoración sin identificar al usuario.'
        );
    }

    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            userId,
            type: 'ROUTINE_CHECKIN',
            routineId,
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message:
                'Valoración guardada localmente. Se sincronizará al reconectar.',
        };
    }

    const result = await saveRoutineCheckin(
        routineId,
        payload
    );

    return {
        offlineSaved: false,
        message: 'Valoración guardada correctamente.',
        data: result,
    };
}
