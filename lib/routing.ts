import { apiFetch } from './api';

export async function getWalkingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const res = await apiFetch('/routing/route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || 'No se pudo obtener la ruta');
    }

    return data as {
        distance: number;
        duration: number;
        geometry: any;
    };
}