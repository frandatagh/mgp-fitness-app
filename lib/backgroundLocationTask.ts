// lib/backgroundLocationTask.ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const LIVE_RUN_LOCATION_TASK = 'LIVE_RUN_LOCATION_TASK';

TaskManager.defineTask(LIVE_RUN_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.log('Background location error:', error);
        return;
    }

    const locations = (data as any)?.locations as Location.LocationObject[];

    if (!locations?.length) return;

    // Acá luego guardamos puntos en AsyncStorage
    console.log('Background locations:', locations);
});