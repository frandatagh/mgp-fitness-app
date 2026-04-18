import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    Text,
    View,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import LiveRunMap from '../components/LiveRunMap';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../lib/profile';
import { Ionicons } from '@expo/vector-icons';

import {
    createRunSession,
    getMyRunSessions,
    deleteRunSession,
    type RunSession,
} from '../lib/runSessions';

import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import ShareCardSimple from '../components/share/ShareCardSimple';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
    accuracy?: number | null;
};

function haversineDistanceMeters(a: RunPoint, b: RunPoint) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;

    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);

    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);

    const h =
        sinDLat * sinDLat +
        Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

    return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
}

function formatDistance(meters: number) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
}

function formatSpeed(speedMps: number | null) {
    if (speedMps == null || Number.isNaN(speedMps)) return '--';
    return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

function formatPace(distanceMeters: number, elapsedSeconds: number) {
    if (distanceMeters < 1 || elapsedSeconds < 1) return '--';
    const secPerKm = elapsedSeconds / (distanceMeters / 1000);
    const minutes = Math.floor(secPerKm / 60);
    const seconds = Math.round(secPerKm % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} /km`;
}

function shouldAcceptPoint(lastPoint: RunPoint | null, nextPoint: RunPoint) {
    const accuracy = nextPoint.accuracy ?? 999;

    // 1) descartamos puntos con mala precisión
    if (accuracy > 20) {
        return { accept: false, distance: 0 };
    }

    if (!lastPoint) {
        return { accept: true, distance: 0 };
    }

    const distance = haversineDistanceMeters(lastPoint, nextPoint);
    const timeDiffMs = Math.max(nextPoint.timestamp - lastPoint.timestamp, 1);
    const timeDiffSec = timeDiffMs / 1000;

    // 2) descartamos micro saltos muy chicos (ruido)
    if (distance < 4) {
        return { accept: false, distance: 0 };
    }

    // 3) descartamos saltos imposibles para caminata/carrera
    const impliedSpeedMps = distance / timeDiffSec;

    // ~28.8 km/h, muy alto para este contexto
    if (impliedSpeedMps > 8) {
        return { accept: false, distance: 0 };
    }

    return { accept: true, distance };
}

function buildPathGeoJson(points: {
    latitude: number;
    longitude: number;
}[]) {
    return {
        type: 'LineString',
        coordinates: points.map((p) => [p.longitude, p.latitude]),
    };
}

function SummaryRoutePreview({
    points,
}: {
    points: { latitude: number; longitude: number }[];
}) {
    if (!points || points.length < 2) {
        return (
            <View
                style={{
                    height: 140,
                    borderRadius: 18,
                    backgroundColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#333333',
                }}
            >
                <Text style={{ color: '#888' }}>Sin ruta suficiente para mostrar</Text>
            </View>
        );
    }

    return (
        <View
            style={{
                height: 180,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.primary,
            }}
        >
            <LiveRunMap
                currentPosition={points[points.length - 1] as any}
                routePoints={points as any}
                shouldFollowUser={false}
                zoomLevel={15}
                profileImageUrl={null}
                recenterTick={0}
            />
        </View>
    );
}

function formatSessionDate(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
    });
}

function formatSessionTime(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function pathGeoJsonToPoints(pathGeoJson: any) {
    if (
        !pathGeoJson ||
        pathGeoJson.type !== 'LineString' ||
        !Array.isArray(pathGeoJson.coordinates)
    ) {
        return [];
    }

    return pathGeoJson.coordinates
        .filter(
            (coord: any) =>
                Array.isArray(coord) &&
                coord.length >= 2 &&
                typeof coord[0] === 'number' &&
                typeof coord[1] === 'number'
        )
        .map((coord: number[], index: number) => ({
            latitude: coord[1],
            longitude: coord[0],
            timestamp: Date.now() + index,
            speed: null,
            accuracy: null,
        }));
}

function HistorySessionMapPreview({
    session,
}: {
    session: RunSession;
}) {
    const routePoints = pathGeoJsonToPoints(session.pathGeoJson);

    if (routePoints.length < 2) {
        return (
            <View
                style={{
                    height: 200,
                    borderRadius: 18,
                    backgroundColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#333333',
                }}
            >
                <Text style={{ color: '#888' }}>No hay ruta suficiente para mostrar</Text>
            </View>
        );
    }

    return (
        <View
            style={{
                height: 220,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.primary,
            }}
        >
            <LiveRunMap
                currentPosition={routePoints[routePoints.length - 1]}
                routePoints={routePoints}
                shouldFollowUser={false}
                zoomLevel={15}
                profileImageUrl={null}
                recenterTick={0}
            />
        </View>
    );
}

export default function LiveRunScreen() {
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [locationError, setLocationError] = useState<string | null>(null);

    const [currentPosition, setCurrentPosition] = useState<RunPoint | null>(null);
    const [routePoints, setRoutePoints] = useState<RunPoint[]>([]);

    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [distanceMeters, setDistanceMeters] = useState(0);
    const [currentSpeedMps, setCurrentSpeedMps] = useState<number | null>(null);

    const [mapZoomLevel, setMapZoomLevel] = useState(15);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const watchRef = useRef<Location.LocationSubscription | null>(null);

    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

    const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
    const [maxSpeedMps, setMaxSpeedMps] = useState<number>(0);

    const [summaryVisible, setSummaryVisible] = useState(false);
    const [lastSessionSummary, setLastSessionSummary] = useState<{
        durationSeconds: number;
        distanceMeters: number;
        avgPaceSecPerKm: number | null;
        maxSpeedMps: number | null;
        routePoints: {
            latitude: number;
            longitude: number;
            timestamp: number;
            speed?: number | null;
            accuracy?: number | null;
        }[];
    } | null>(null);

    const [historyVisible, setHistoryVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [runHistory, setRunHistory] = useState<RunSession[]>([]);

    const [selectedHistorySession, setSelectedHistorySession] = useState<RunSession | null>(null);
    const [historyDetailVisible, setHistoryDetailVisible] = useState(false);

    const [recenterTick, setRecenterTick] = useState(0);

    const [shareOptionsVisible, setShareOptionsVisible] = useState(false);
    const [shareMode, setShareMode] = useState<'simple' | 'map' | 'route' | null>(null);

    const simpleShareCardRef = useRef<any>(null);
    const [pendingShareMode, setPendingShareMode] = useState<'simple' | 'map' | 'route' | null>(null);
    const [sharingInProgress, setSharingInProgress] = useState(false);

    useEffect(() => {
        const loadProfileImage = async () => {
            try {
                const data = await getMyProfile();
                setProfileImageUrl(data.profile?.profileImageUrl ?? null);
            } catch (error) {
                console.log('No se pudo cargar la imagen de perfil:', error);
                setProfileImageUrl(null);
            }
        };

        loadProfileImage();
    }, []);


    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();

                if (!active) return;

                if (status !== 'granted') {
                    setLocationError(
                        'No se pudo acceder a tu ubicación. Habilita los permisos para usar el modo running.'
                    );
                    setLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation,
                });

                if (!active) return;

                const firstPoint: RunPoint = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    timestamp: loc.timestamp ?? Date.now(),
                    speed: loc.coords.speed,
                    accuracy: loc.coords.accuracy,
                };

                setCurrentPosition(firstPoint);
                setCurrentSpeedMps(loc.coords.speed ?? null);
                setLoading(false);
            } catch (error) {
                console.error('Error obteniendo ubicación inicial:', error);
                if (active) {
                    setLocationError('Ocurrió un error al obtener tu ubicación.');
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
            watchRef.current?.remove();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);



    const startTimer = () => {
        if (timerRef.current) return;

        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const start = async () => {
        try {
            if (!startedAtMs) {
                setStartedAtMs(Date.now());
            }
            setMaxSpeedMps(0);

            setIsRunning(true);
            setIsPaused(false);
            setMapZoomLevel(16.5);

            if (routePoints.length === 0 && currentPosition) {
                setRoutePoints([currentPosition]);
            }

            startTimer();

            watchRef.current?.remove();

            watchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2500,
                    distanceInterval: 4,
                },
                (loc) => {
                    const nextPoint: RunPoint = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        timestamp: loc.timestamp ?? Date.now(),
                        speed: loc.coords.speed,
                        accuracy: loc.coords.accuracy,
                    };

                    setCurrentPosition(nextPoint);
                    setCurrentSpeedMps(loc.coords.speed ?? null);
                    const speed = loc.coords.speed ?? 0;
                    setMaxSpeedMps((prev) => (speed > prev ? speed : prev));

                    setRoutePoints((prev) => {
                        const last = prev.length > 0 ? prev[prev.length - 1] : null;
                        const decision = shouldAcceptPoint(last, nextPoint);

                        if (!decision.accept) {
                            return prev;
                        }

                        if (last) {
                            setDistanceMeters((old) => old + decision.distance);
                        }

                        return [...prev, nextPoint];
                    });
                }
            );
        } catch (error) {
            console.error('Error iniciando tracking:', error);
            Alert.alert('Error', 'No se pudo iniciar el tracking.');
        }
    };

    const pause = () => {
        setIsPaused(true);
        setMapZoomLevel(15);
        stopTimer();
        watchRef.current?.remove();
        watchRef.current = null;
    };

    const resume = async () => {
        setMapZoomLevel(16.5);
        await start();
    };

    const finish = async () => {
        stopTimer();
        watchRef.current?.remove();
        watchRef.current = null;
        setIsRunning(false);
        setIsPaused(false);

        const endedAtMs = Date.now();

        const avgPaceSecPerKm =
            distanceMeters > 0 ? elapsedSeconds / (distanceMeters / 1000) : null;

        try {
            if (startedAtMs) {
                await createRunSession({
                    startedAt: new Date(startedAtMs).toISOString(),
                    endedAt: new Date(endedAtMs).toISOString(),
                    durationSeconds: elapsedSeconds,
                    distanceMeters,
                    avgPaceSecPerKm,
                    maxSpeedMps: maxSpeedMps || null,
                    pathGeoJson: buildPathGeoJson(routePoints),
                });
            }
        } catch (error) {
            console.error('Error guardando sesión de running:', error);
        }

        setLastSessionSummary({
            durationSeconds: elapsedSeconds,
            distanceMeters,
            avgPaceSecPerKm,
            maxSpeedMps: maxSpeedMps || null,
            routePoints,
        });

        setSummaryVisible(true);
    };

    const resetSession = () => {
        stopTimer();
        watchRef.current?.remove();
        watchRef.current = null;

        setIsRunning(false);
        setIsPaused(false);
        setElapsedSeconds(0);
        setDistanceMeters(0);
        setCurrentSpeedMps(null);
        setMapZoomLevel(15);

        setStartedAtMs(null);
        setMaxSpeedMps(0);

        if (currentPosition) {
            setRoutePoints([currentPosition]);
        } else {
            setRoutePoints([]);
        }
    };

    const shouldFollowUser = true;

    const toggleHistory = async () => {
        if (historyVisible) {
            setHistoryVisible(false);
            return;
        }

        try {
            setHistoryLoading(true);
            const data = await getMyRunSessions();
            setRunHistory(data.items ?? []);
            setHistoryVisible(true);
        } catch (error) {
            console.error('Error cargando historial de running:', error);
            Alert.alert('Error', 'No se pudo cargar el historial de corridas.');
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistorySessionDetail = (session: RunSession) => {
        setSelectedHistorySession(session);
        setHistoryDetailVisible(true);
    };

    const closeHistorySessionDetail = () => {
        setHistoryDetailVisible(false);
        setSelectedHistorySession(null);
    };


    const handleShareSession = () => {
        if (!selectedHistorySession) return;
        setShareOptionsVisible(true);
    };

    const handleSelectShareMode = async (mode: 'simple' | 'map' | 'route') => {
        setShareMode(mode);
        setShareOptionsVisible(false);

        if (mode === 'simple') {
            setPendingShareMode('simple');
        } else {
            Alert.alert(
                'Próximamente',
                mode === 'map'
                    ? 'El formato de compartir con mapa estará disponible pronto.'
                    : 'El formato de compartir solo con la ruta estará disponible pronto.'
            );
        }
    };

    const handleDeleteSession = async () => {
        if (!selectedHistorySession) return;

        Alert.alert(
            'Borrar sesión',
            '¿Estás seguro de que quieres borrar esta sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRunSession(selectedHistorySession.id);

                            setRunHistory((prev) =>
                                prev.filter((item) => item.id !== selectedHistorySession.id)
                            );

                            closeHistorySessionDetail();
                        } catch (error) {
                            console.error('Error borrando sesión:', error);
                            Alert.alert('Error', 'No se pudo borrar la sesión.');
                        }
                    },
                },
            ]
        );
    };

    const handleViewStatistics = () => {
        Alert.alert('Próximamente', 'La pantalla de estadísticas estará disponible pronto.');
    };

    const shareSimpleCardImage = async () => {
        if (!selectedHistorySession || !simpleShareCardRef.current) return;

        try {
            setSharingInProgress(true);

            const distanceText = formatDistance(selectedHistorySession.distanceMeters);
            const durationText = formatDuration(selectedHistorySession.durationSeconds);
            const paceText =
                selectedHistorySession.avgPaceSecPerKm != null
                    ? formatPace(
                        selectedHistorySession.distanceMeters,
                        selectedHistorySession.durationSeconds
                    )
                    : '--';
            const maxSpeedText =
                selectedHistorySession.maxSpeedMps != null
                    ? formatSpeed(selectedHistorySession.maxSpeedMps)
                    : '--';

            const uri = await captureRef(simpleShareCardRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            await Share.open({
                url: uri.startsWith('file://') ? uri : `file://${uri}`,
                type: 'image/png',
                failOnCancel: false,
                title: 'Compartir sesión',
                message:
                    `🏃 Corrida registrada en MGP Rutina Fitness\n\n` +
                    `Tiempo: ${durationText}\n` +
                    `Distancia: ${distanceText}\n` +
                    `Ritmo: ${paceText}\n` +
                    `Vel. máxima: ${maxSpeedText}`,
            });
        } catch (error) {
            console.error('Error compartiendo tarjeta simple:', error);
            Alert.alert('Error', 'No se pudo generar o compartir la imagen.');
        } finally {
            setPendingShareMode(null);
            setSharingInProgress(false);
        }
    };

    useEffect(() => {
        if (pendingShareMode !== 'simple') return;
        if (!selectedHistorySession) return;

        const timeout = setTimeout(() => {
            shareSimpleCardImage();
        }, 300);

        return () => clearTimeout(timeout);
    }, [pendingShareMode, selectedHistorySession]);

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
            <View
                className="flex-1 w-full px-4 pt-1"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                <View className="mb-1">
                    <View className="items-center">
                        <Image
                            source={require('../assets/img/icontwist.png')}
                            style={{ width: 180, height: 100 }}
                            resizeMode="contain"
                        />
                    </View>

                </View>

                <View
                    className="flex-1 mt-2 rounded-3xl overflow-hidden"
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                    }}
                >
                    {loading && (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text className="mt-2 text-[13px]" style={{ color: COLORS.textLight }}>
                                Obteniendo tu ubicación...
                            </Text>
                        </View>
                    )}

                    {!loading && locationError && (
                        <View className="flex-1 items-center justify-center px-4">
                            <Text
                                className="text-center text-[13px]"
                                style={{ color: COLORS.textLight }}
                            >
                                {locationError}
                            </Text>
                        </View>
                    )}

                    {!loading && !locationError && currentPosition && (
                        <View className="flex-1">
                            <LiveRunMap
                                currentPosition={currentPosition}
                                routePoints={routePoints}
                                shouldFollowUser={shouldFollowUser}
                                zoomLevel={mapZoomLevel}
                                profileImageUrl={profileImageUrl}
                                recenterTick={recenterTick}
                            />
                            <Pressable
                                onPress={() => setRecenterTick((prev) => prev + 1)}
                                style={{
                                    position: 'absolute',
                                    right: 14,
                                    bottom: 14,
                                    width: 46,
                                    height: 46,
                                    borderRadius: 23,
                                    backgroundColor: 'rgba(17,17,17,0.94)',
                                    borderWidth: 1,
                                    borderColor: COLORS.primary,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 15,
                                }}
                            >
                                <Ionicons name="locate" size={22} color={COLORS.textLight} />
                            </Pressable>

                            <View
                                className="absolute left-3 right-3 top-3"
                                style={{ zIndex: 20 }}
                            >
                                {/* Tarjeta principal */}
                                <View
                                    className="rounded-2xl px-4 py-3"
                                    style={{
                                        backgroundColor: 'rgba(17,17,17,0.92)',
                                        borderWidth: 1,
                                        borderColor: COLORS.primary,
                                    }}
                                >
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text
                                            className="text-[13px] font-semibold"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            {isRunning ? 'Sesión libre (en vivo)' : 'Sesión libre'}
                                        </Text>

                                        <Pressable
                                            onPress={toggleHistory}
                                            hitSlop={8}
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 15,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#1f1f1f',
                                                borderWidth: 1,
                                                borderColor: '#333333',
                                            }}
                                        >
                                            <Ionicons
                                                name={historyVisible ? 'close' : 'menu'}
                                                size={18}
                                                color={COLORS.textLight}
                                            />
                                        </Pressable>
                                    </View>

                                    <View className="flex-row justify-between items-start">
                                        <View className="items-center flex-1">
                                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Tiempo</Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '700',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatDuration(elapsedSeconds)}
                                            </Text>
                                        </View>

                                        <View className="items-center flex-1">
                                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Distancia</Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '700',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatDistance(distanceMeters)}
                                            </Text>
                                        </View>

                                        <View className="items-center flex-1">
                                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Velocidad</Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '700',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatSpeed(currentSpeedMps)}
                                            </Text>
                                        </View>

                                        <View className="items-center flex-1">
                                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Ritmo</Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '700',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatPace(distanceMeters, elapsedSeconds)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Historial desplegable */}
                                {historyVisible && (
                                    <View
                                        className="mt-2 rounded-2xl px-3 py-3"
                                        style={{
                                            backgroundColor: 'rgba(10,10,10,0.96)',
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                            maxHeight: 240,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: COLORS.textLight,
                                                fontSize: 12,
                                                fontWeight: '700',
                                                marginBottom: 5,
                                                marginLeft: 4,
                                            }}
                                        >
                                            Últimas corridas
                                        </Text>

                                        {historyLoading ? (
                                            <View className="py-5 items-center justify-center">
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 12,
                                                        marginTop: 8,
                                                    }}
                                                >
                                                    Cargando historial...
                                                </Text>
                                            </View>
                                        ) : runHistory.length === 0 ? (
                                            <View className="py-4">
                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 12,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    Aún no hay sesiones guardadas.
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={{ gap: 8 }}>
                                                {runHistory.slice(0, 6).map((session) => (
                                                    <Pressable
                                                        key={session.id}
                                                        onPress={() => openHistorySessionDetail(session)}
                                                        className="rounded-xl px-3 py-2"
                                                        style={{
                                                            backgroundColor: '#161616',
                                                            borderWidth: 1,
                                                            borderColor: '#262626',
                                                        }}
                                                    >
                                                        <View className="flex-row justify-between">

                                                            {/* FECHA */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>FECHA</Text>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                                                    {formatSessionDate(session.startedAt)}
                                                                </Text>
                                                            </View>

                                                            {/* HORA */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>HORA</Text>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                                                    {formatSessionTime(session.startedAt)}
                                                                </Text>
                                                            </View>

                                                            {/* DISTANCIA */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>DISTANCIA</Text>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                                                    {formatDistance(session.distanceMeters)}
                                                                </Text>
                                                            </View>

                                                            {/* TIEMPO */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>TIEMPO</Text>
                                                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                                                                    {formatDuration(session.durationSeconds)}
                                                                </Text>
                                                            </View>

                                                            {/* RITMO */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>RITMO</Text>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                                                    {session.avgPaceSecPerKm != null
                                                                        ? formatPace(session.distanceMeters, session.durationSeconds)
                                                                        : '--'}
                                                                </Text>
                                                            </View>

                                                            {/* VELOCIDAD MÁXIMA */}
                                                            <View className="items-center flex-1">
                                                                <Text style={{ color: '#6B7280', fontSize: 7 }}>VEL.MÁX</Text>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                                                                    {session.maxSpeedMps != null
                                                                        ? formatSpeed(session.maxSpeedMps)
                                                                        : '--'}
                                                                </Text>
                                                            </View>

                                                        </View>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                <View className="flex-row justify-between mt-2 mb-2">
                    <Pressable
                        onPress={() => router.replace('/home')}
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text className="text-[14px] font-normal" style={{ color: COLORS.textLight }}>
                            Volver
                        </Text>
                    </Pressable>

                    {!isRunning && (
                        <Pressable
                            onPress={start}
                            className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Text className="text-[14px] font-semibold" style={{ color: '#111111' }}>
                                Iniciar
                            </Text>
                        </Pressable>
                    )}

                    {isRunning && !isPaused && (
                        <Pressable
                            onPress={pause}
                            className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: '#444444' }}
                        >
                            <Text className="text-[14px] font-normal" style={{ color: COLORS.textLight }}>
                                Pausar
                            </Text>
                        </Pressable>
                    )}

                    {isRunning && isPaused && (
                        <Pressable
                            onPress={resume}
                            className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Text className="text-[14px] font-semibold" style={{ color: '#111111' }}>
                                Reanudar
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={finish}
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text className="text-[14px] font-normal" style={{ color: COLORS.textLight }}>
                            Finalizar
                        </Text>
                    </Pressable>
                </View>

                <View className="mb-2">
                    <Pressable
                        onPress={resetSession}
                        className="px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#222222' }}
                    >
                        <Text className="text-[14px] font-normal" style={{ color: COLORS.textLight }}>
                            Reiniciar sesión
                        </Text>
                    </Pressable>
                </View>
            </View>

            <Modal
                visible={summaryVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSummaryVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 380,
                            backgroundColor: '#0f0f0f',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 20,
                                fontWeight: '700',
                                marginBottom: 14,
                                textAlign: 'center',
                            }}
                        >
                            Sesión finalizada
                        </Text>

                        {lastSessionSummary && (
                            <>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        marginBottom: 16,
                                        gap: 10,
                                    }}
                                >
                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Tiempo</Text>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                            {formatDuration(lastSessionSummary.durationSeconds)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Distancia</Text>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                            {formatDistance(lastSessionSummary.distanceMeters)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Ritmo</Text>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                            {lastSessionSummary.avgPaceSecPerKm != null
                                                ? formatPace(
                                                    lastSessionSummary.distanceMeters,
                                                    lastSessionSummary.durationSeconds
                                                )
                                                : '--'}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Velocidad máxima</Text>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                            {lastSessionSummary.maxSpeedMps != null
                                                ? formatSpeed(lastSessionSummary.maxSpeedMps)
                                                : '--'}
                                        </Text>
                                    </View>
                                </View>

                                <SummaryRoutePreview points={lastSessionSummary.routePoints} />
                            </>
                        )}

                        <Pressable
                            onPress={() => setSummaryVisible(false)}
                            style={{
                                marginTop: 16,
                                backgroundColor: COLORS.primary,
                                paddingVertical: 14,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#111111',
                                    fontWeight: '700',
                                    fontSize: 15,
                                }}
                            >
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={historyDetailVisible}
                transparent
                animationType="fade"
                onRequestClose={closeHistorySessionDetail}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.72)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 390,
                            backgroundColor: '#0f0f0f',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 19,
                                    fontWeight: '700',
                                }}
                            >
                                Detalle de sesión
                            </Text>

                            <Pressable
                                onPress={closeHistorySessionDetail}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#1b1b1b',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        {selectedHistorySession && (
                            <>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        rowGap: 10,
                                        marginBottom: 16,
                                    }}
                                >
                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Fecha</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {formatSessionDate(selectedHistorySession.startedAt)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Hora</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {formatSessionTime(selectedHistorySession.startedAt)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Distancia</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {formatDistance(selectedHistorySession.distanceMeters)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Tiempo</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {formatDuration(selectedHistorySession.durationSeconds)}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Ritmo</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {selectedHistorySession.avgPaceSecPerKm != null
                                                ? formatPace(
                                                    selectedHistorySession.distanceMeters,
                                                    selectedHistorySession.durationSeconds
                                                )
                                                : '--'}
                                        </Text>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Vel. máxima</Text>
                                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                            {selectedHistorySession.maxSpeedMps != null
                                                ? formatSpeed(selectedHistorySession.maxSpeedMps)
                                                : '--'}
                                        </Text>
                                    </View>
                                </View>

                                <HistorySessionMapPreview session={selectedHistorySession} />

                                <View style={{ marginTop: 16 }}>
                                    {/* fila de 2 botones */}
                                    <View className="flex-row justify-between" style={{ gap: 10 }}>
                                        <Pressable
                                            onPress={handleDeleteSession}
                                            className="flex-1 items-center justify-center"
                                            style={{
                                                backgroundColor: '#1b1b1b',
                                                borderWidth: 1,
                                                borderColor: '#3a3a3a',
                                                paddingVertical: 13,
                                                borderRadius: 14,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: '#FF6B6B',
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                Borrar sesión
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={handleShareSession}
                                            className="flex-1 items-center justify-center"
                                            style={{
                                                backgroundColor: '#1b1b1b',
                                                borderWidth: 1,
                                                borderColor: '#3a3a3a',
                                                paddingVertical: 13,
                                                borderRadius: 14,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                Compartir en redes
                                            </Text>
                                        </Pressable>
                                    </View>

                                    {/* botón grande abajo */}
                                    <Pressable
                                        onPress={handleViewStatistics}
                                        className="items-center justify-center"
                                        style={{
                                            marginTop: 12,
                                            backgroundColor: COLORS.primary,
                                            paddingVertical: 15,
                                            borderRadius: 16,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: '#111111',
                                                fontSize: 15,
                                                fontWeight: '700',
                                            }}
                                        >
                                            Ver estadísticas
                                        </Text>
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={shareOptionsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setShareOptionsVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.72)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            backgroundColor: '#0f0f0f',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 18,
                                    fontWeight: '700',
                                }}
                            >
                                Elegir formato
                            </Text>

                            <Pressable
                                onPress={() => setShareOptionsVisible(false)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#1b1b1b',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => handleSelectShareMode('simple')}
                            style={{
                                backgroundColor: '#161616',
                                borderWidth: 1,
                                borderColor: '#262626',
                                borderRadius: 16,
                                padding: 14,
                                marginBottom: 10,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                Resumen simple
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Tiempo, distancia, ritmo, velocidad máxima y logo.
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleSelectShareMode('map')}
                            style={{
                                backgroundColor: '#161616',
                                borderWidth: 1,
                                borderColor: '#262626',
                                borderRadius: 16,
                                padding: 14,
                                marginBottom: 10,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                Resumen + mapa
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Datos completos con mapa y ruta.
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleSelectShareMode('route')}
                            style={{
                                backgroundColor: '#161616',
                                borderWidth: 1,
                                borderColor: '#262626',
                                borderRadius: 16,
                                padding: 14,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                Resumen + ruta
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Datos con dibujo de la ruta, sin mapa.
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: -3000,
                    left: -3000,
                    opacity: 1,
                }}
            >
                {selectedHistorySession && (
                    <ViewShot
                        ref={simpleShareCardRef}
                        options={{
                            format: 'png',
                            quality: 1,
                            result: 'tmpfile',
                        }}
                    >
                        <ShareCardSimple
                            durationText={formatDuration(selectedHistorySession.durationSeconds)}
                            distanceText={formatDistance(selectedHistorySession.distanceMeters)}
                            paceText={
                                selectedHistorySession.avgPaceSecPerKm != null
                                    ? formatPace(
                                        selectedHistorySession.distanceMeters,
                                        selectedHistorySession.durationSeconds
                                    )
                                    : '--'
                            }
                            maxSpeedText={
                                selectedHistorySession.maxSpeedMps != null
                                    ? formatSpeed(selectedHistorySession.maxSpeedMps)
                                    : '--'
                            }
                        />
                    </ViewShot>
                )}
            </View>
        </SafeAreaView>
    );
}