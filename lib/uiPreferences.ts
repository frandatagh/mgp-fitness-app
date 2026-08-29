import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type RoutineViewMode =
    | 'table'
    | 'cards';

const ROUTINE_VIEW_MODE_KEY =
    'mgp_routine_view_mode';

async function getStorageItem(
    key: string
): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            if (
                typeof window ===
                'undefined'
            ) {
                return null;
            }

            return window.localStorage.getItem(
                key
            );
        }

        return await SecureStore.getItemAsync(
            key
        );
    } catch (error) {
        console.log(
            'Error leyendo preferencia visual:',
            error
        );

        return null;
    }
}

async function setStorageItem(
    key: string,
    value: string
): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            if (
                typeof window ===
                'undefined'
            ) {
                return;
            }

            window.localStorage.setItem(
                key,
                value
            );

            return;
        }

        await SecureStore.setItemAsync(
            key,
            value
        );
    } catch (error) {
        console.log(
            'Error guardando preferencia visual:',
            error
        );
    }
}

export async function getRoutineViewMode():
    Promise<RoutineViewMode> {
    const stored =
        await getStorageItem(
            ROUTINE_VIEW_MODE_KEY
        );

    if (
        stored === 'cards' ||
        stored === 'table'
    ) {
        return stored;
    }

    /*
     * La tabla actual queda como
     * comportamiento inicial.
     */
    return 'table';
}

export async function saveRoutineViewMode(
    mode: RoutineViewMode
): Promise<void> {
    await setStorageItem(
        ROUTINE_VIEW_MODE_KEY,
        mode
    );
}