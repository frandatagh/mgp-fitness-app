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
    payload: CreateRoutinePayload
) {
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            type: 'CREATE_ROUTINE',
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message: 'Rutina guardada localmente. Se sincronizará cuando vuelva internet.',
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
    payload: { routineId: string; score: number }
) {
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            type: 'EXERCISE_CHECKIN',
            exerciseId,
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message: 'Checkin guardado localmente. Se sincronizará al reconectar.',
        };
    }

    const result = await saveExerciseCheckin(exerciseId, payload);

    return {
        offlineSaved: false,
        message: 'Checkin guardado correctamente.',
        data: result,
    };
}

export async function saveRoutineCheckinWithOfflineSupport(
    routineId: string,
    payload: { score: number }
) {
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
        await enqueuePendingAction({
            id: createPendingActionId(),
            type: 'ROUTINE_CHECKIN',
            routineId,
            payload,
            createdAt: Date.now(),
        });

        return {
            offlineSaved: true,
            message: 'Estado de rutina guardado localmente. Se sincronizará al reconectar.',
        };
    }

    const result = await saveRoutineCheckin(routineId, payload);

    return {
        offlineSaved: false,
        message: 'Estado de rutina guardado correctamente.',
        data: result,
    };
}