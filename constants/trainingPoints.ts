// constants/trainingPoints.ts

// Puntos de entrenamiento MANUALES para mostrar en el mapa
// Filtros que usás en la UI
export type FilterType = 'all' | 'outdoor' | 'gym' | 'activities';

// Tipo real que guarda cada punto (sin "all")
export type PointCategory = Exclude<FilterType, 'all'>;
// => 'outdoor' | 'gym' | 'activities'

export type TrainingPoint = {
    id: string;
    name: string;
    type: PointCategory;
    latitude: number;
    longitude: number;
    description?: string;
};

// 🔹 Sólo outdoor por ahora (completá con tus datos reales)
export const OUTDOOR_POINTS: TrainingPoint[] = [
    {
        id: 'out_1',
        name: 'Plaza España',
        type: 'outdoor',
        latitude: -37.98927846836796,
        longitude: -57.54524304727992,
        description: 'Equipos de calistenia y barras.',
    },
    {
        id: 'out_2',
        name: 'Playa Morgan',
        type: 'outdoor',
        latitude: -37.96211152050284,
        longitude: -57.540219465135124,
        description: 'Equipos de calistenia y barras.',
    },

];

// 🔹 Más adelante vas llenando estas si querés
export const GYM_POINTS: TrainingPoint[] = [
    // { id: 'gym_1', name: 'Gimnasio X', type: 'gym', latitude: ..., longitude: ... }
];

export const ACTIVITIES_POINTS: TrainingPoint[] = [
    // { id: 'act_1', name: 'Club Deportivo Municipal', type: 'activities', latitude: ..., longitude: ... }
];

// 🔹 Todos juntos (para el filtro "all")
export const ALL_POINTS: TrainingPoint[] = [
    ...OUTDOOR_POINTS,
    ...GYM_POINTS,
    ...ACTIVITIES_POINTS,
];
