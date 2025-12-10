// app/nearby.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    Text,
    View,
    Image
} from 'react-native';
import TrainingMap, { MapRegion } from '../components/TrainingMap';
import {
    ALL_POINTS,
    OUTDOOR_POINTS,
    GYM_POINTS,
    ACTIVITIES_POINTS,
    FilterType,
    TrainingPoint,
} from '../constants/trainingPoints';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';



export default function NearbyScreen() {
    const { isAuthenticated } = useAuth();

    const [location, setLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const [locationError, setLocationError] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    const [filter, setFilter] = useState<FilterType>('all');
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Redirigir si no está autenticado
    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated]);

    // Pedir permisos de ubicación y obtener posición
    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    if (isMounted) {
                        setLocationError(
                            'No se pudo acceder a tu ubicación. Habilita los permisos de ubicación para ver los puntos cercanos.'
                        );
                        setLoadingLocation(false);
                    }
                    return;
                }

                const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                if (isMounted) {
                    setLocation({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    });
                    setLocationError(null);
                }
            } catch (err) {
                console.error('Error obteniendo ubicación:', err);
                if (isMounted) {
                    setLocationError('Ocurrió un error al obtener tu ubicación.');
                }
            } finally {
                if (isMounted) setLoadingLocation(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    // Puntos de entrenamiento de ejemplo cerca del usuario
    const points: TrainingPoint[] = useMemo(() => {
        switch (filter) {
            case 'outdoor':
                return OUTDOOR_POINTS;
            case 'gym':
                return GYM_POINTS;
            case 'activities':
                return ACTIVITIES_POINTS;
            case 'all':
            default:
                return ALL_POINTS;
        }
    }, [filter]);


    const filteredPoints = useMemo(() => {
        if (filter === 'all') return points;
        return points.filter((p) => p.type === filter);
    }, [points, filter]);

    const initialRegion: MapRegion | undefined = location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
        }
        : undefined;

    const [selectedPoint, setSelectedPoint] = useState<TrainingPoint | null>(null);

    const [fixedPoint, setFixedPoint] = useState<TrainingPoint | null>(null); // 👈 nuevo


    const handleBackToRoutines = () => {
        router.replace('/home');
    };

    const handleStartRunning = () => {
        // Próximamente
        // Podés mostrar un pequeño aviso o dejarlo silencioso por ahora
        console.log('Comenzar a correr (próximamente)');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 w-full px-4 pt-1"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* Encabezado con título */}
                <View className="mb-1">
                    {/* LOGO SUPERIOR */}
                    <View className="items-center">
                        <Image
                            source={require('../assets/img/icontwist.png')}
                            style={{ width: 180, height: 100 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View className="items-start pl-2">
                        <Text
                            className="text-[14px] font-light text-gray-500"

                        >
                            Puntos cercanos
                        </Text>
                    </View>
                </View>

                {/* Marco principal con mapa */}
                <View
                    className="flex-1 mt-2 rounded-3xl overflow-hidden"
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                    }}
                >
                    {loadingLocation && (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text
                                className="mt-2 text-[13px]"
                                style={{ color: COLORS.textLight }}
                            >
                                Obteniendo tu ubicación...
                            </Text>
                        </View>
                    )}

                    {!loadingLocation && locationError && (
                        <View className="flex-1 items-center justify-center px-4">
                            <Text
                                className="text-center text-[13px]"
                                style={{ color: COLORS.textLight }}
                            >
                                {locationError}
                            </Text>
                        </View>
                    )}

                    {!loadingLocation && !locationError && initialRegion && (
                        <TrainingMap
                            region={initialRegion}
                            points={points}
                            onPointPress={setSelectedPoint}
                            routeFrom={
                                location
                                    ? { latitude: location.latitude, longitude: location.longitude }
                                    : undefined
                            }
                            routeTo={
                                fixedPoint
                                    ? { latitude: fixedPoint.latitude, longitude: fixedPoint.longitude }
                                    : undefined
                            }
                        />
                    )}

                    {/* MODAL: detalle del punto de entrenamiento */}
                    <Modal
                        visible={!!selectedPoint}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setSelectedPoint(null)}
                    >
                        <View
                            className="flex-1 justify-center items-center"
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                            {/* Tocar fuera del cuadro = cerrar */}
                            <Pressable
                                className="absolute inset-0"
                                onPress={() => setSelectedPoint(null)}
                            />

                            {/* Contenedor del modal */}
                            <View
                                className="w-80 max-w-xs rounded-3xl px-4 py-4"
                                style={{
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: COLORS.primary,
                                }}
                            >
                                {/* Título centrado */}
                                <View className="mb-3">
                                    <Text
                                        className="text-xl font-semibold text-center"
                                        style={{ color: COLORS.textLight }}
                                        numberOfLines={2}
                                    >
                                        {selectedPoint?.name}
                                    </Text>
                                </View>

                                {/* Tipo + descripción */}
                                {selectedPoint && (
                                    <Text
                                        className="text-[13px] mb-1 text-center"
                                        style={{ color: COLORS.accent }}
                                    >
                                        {selectedPoint.type === 'outdoor'
                                            ? 'Punto de entrenamiento al aire libre'
                                            : selectedPoint.type === 'gym'
                                                ? 'Gimnasio'
                                                : 'Actividad / club deportivo'}
                                    </Text>
                                )}

                                {selectedPoint?.description && (
                                    <Text
                                        className="text-[13px] mb-4 text-center"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        {selectedPoint.description}
                                    </Text>
                                )}

                                {/* Botones */}
                                <View className="mt-2">
                                    {/* Fijar punto: botón grande */}
                                    <Pressable
                                        className="rounded-full py-2 mb-3 items-center justify-center"
                                        style={{ backgroundColor: COLORS.primary }}
                                        onPress={() => {
                                            if (selectedPoint) {
                                                setFixedPoint(selectedPoint);  // 👈 fijamos el punto para la ruta
                                            }
                                            setSelectedPoint(null);          // cerramos el modal
                                        }}
                                    >
                                        <Text
                                            className="text-[13px] font-semibold"
                                            style={{ color: '#111111' }}
                                        >
                                            Fijar punto
                                        </Text>
                                    </Pressable>


                                    {/* Fila: Correr ahora + Cancelar */}
                                    <View className="flex-row justify-between">
                                        <Pressable
                                            className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                                            style={{ backgroundColor: '#444444' }}
                                            onPress={() => {
                                                console.log('Correr ahora', selectedPoint?.id);
                                                // más adelante: navegar a pantalla de carrera
                                                setSelectedPoint(null);
                                            }}
                                        >
                                            <Text
                                                className="text-[13px] font-semibold"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                Correr ahora
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                                            style={{ backgroundColor: '#222222' }}
                                            onPress={() => setSelectedPoint(null)}
                                        >
                                            <Text
                                                className="text-[13px] font-semibold"
                                                style={{ color: COLORS.textMuted }}
                                            >
                                                Cancelar
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Modal>


                </View>


                {/* Botones inferiores */}
                <View className="flex-row justify-between mt-2 mb-2">
                    {/* Regresar a mis rutinas */}
                    <Pressable
                        onPress={handleBackToRoutines}
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Regresar a mis rutinas
                        </Text>
                    </Pressable>

                    {/* Comenzar a correr */}
                    <Pressable
                        onPress={handleStartRunning}
                        className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Comenzar a correr
                        </Text>
                    </Pressable>

                    {/* Filtros */}
                    <Pressable
                        onPress={() => setFiltersVisible(true)}
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Filtros
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Modal de filtros */}
            <Modal
                visible={filtersVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFiltersVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-72 rounded-3xl px-4 py-4"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-base font-semibold mb-3 text-center"
                            style={{ color: COLORS.textLight }}
                        >
                            Filtros de puntos
                        </Text>

                        {(
                            [
                                { key: 'all', label: 'Todos' },
                                { key: 'outdoor', label: 'Entrenamiento al aire libre' },
                                { key: 'gym', label: 'Gimnasios' },
                                { key: 'activities', label: 'Otras actividades deportivas' },
                            ] as { key: FilterType; label: string }[]
                        ).map((opt) => (
                            <Pressable
                                key={opt.key}
                                className="py-2"
                                onPress={() => {
                                    setFilter(opt.key);
                                    setFiltersVisible(false);
                                }}
                            >
                                <Text
                                    className="text-[14px]"
                                    style={{
                                        color: filter === opt.key ? COLORS.primary : COLORS.textLight,
                                    }}
                                >
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}


                        <Pressable
                            className="mt-4 py-2 rounded-full items-center"
                            style={{ backgroundColor: '#444444' }}
                            onPress={() => setFiltersVisible(false)}
                        >
                            <Text
                                className="text-[13px] font-semibold"
                                style={{ color: COLORS.textLight }}
                            >
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
