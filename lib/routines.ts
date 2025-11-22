// lib/routines.ts
import { apiFetch } from './api';

export interface RoutineExercise {
    id?: string;
    name: string;
    sets?: string | null;
    reps?: string | null;
    notes?: string | null;
    order?: number | null;
}

export interface Routine {
    id: string;
    title: string;
    notes?: string | null;
    exercises?: RoutineExercise[];
    createdAt?: string;
    updatedAt?: string;
}

interface RoutineListResponse {
    items: Routine[];
}

export type CreateRoutinePayload = {
    title: string;
    notes?: string | null;
    exercises?: {
        name: string;
        sets?: string | null;
        reps?: string | null;
        notes?: string | null;
        order?: number;
    }[];
};

export type UpdateRoutinePayload = {
    title?: string;
    notes?: string | null;
};

export async function getRoutines(): Promise<Routine[]> {
    const res = await apiFetch('/routines', {
        method: 'GET',
    });

    if (!res.ok) {
        throw new Error('No se pudieron cargar las rutinas');
    }

    const data = (await res.json()) as RoutineListResponse;
    return data.items ?? [];
}

export async function getRoutine(id: string): Promise<Routine> {
    const res = await apiFetch(`/routines/${id}`, {
        method: 'GET',
    });

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error('Rutina no encontrada');
        }
        throw new Error('Error al cargar la rutina');
    }

    const data = (await res.json()) as Routine;
    return data;
}

export async function createRoutine(
    payload: CreateRoutinePayload
): Promise<Routine> {
    const res = await apiFetch('/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('Error creando rutina, respuesta:', text);
        throw new Error('Error al crear la rutina');
    }

    const data = (await res.json()) as Routine;
    return data;
}

export async function updateRoutine(
    id: string,
    payload: UpdateRoutinePayload
): Promise<Routine> {
    const res = await apiFetch(`/routines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('Error actualizando rutina, respuesta:', text);
        throw new Error('Error al actualizar la rutina');
    }

    const data = (await res.json()) as Routine;
    return data;
}

export async function deleteRoutine(id: string): Promise<void> {
    const res = await apiFetch(`/routines/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        throw new Error('Error al borrar la rutina');
    }
}
