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

import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';

import ShareCardVertical from '../components/share/ShareCardVertical';
import ShareCardHorizontal from '../components/share/ShareCardHorizontal';
import SharePhotoComposer from '../components/share/SharePhotoComposer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FontAwesome6 } from '@expo/vector-icons';
import { getWalkingRoute } from '../lib/routing';

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

function shouldAcceptPoint(
    lastPoint: RunPoint | null,
    nextPoint: RunPoint,
    isRunning: boolean
) {
    const accuracy = nextPoint.accuracy ?? 999;

    // 1) precisión mínima aceptable
    if (accuracy > 18) {
        return { accept: false, distance: 0, reason: 'bad_accuracy' };
    }

    if (!lastPoint) {
        return { accept: true, distance: 0, reason: 'first_point' };
    }

    const distance = haversineDistanceMeters(lastPoint, nextPoint);
    const timeDiffMs = Math.max(nextPoint.timestamp - lastPoint.timestamp, 1);
    const timeDiffSec = timeDiffMs / 1000;

    // 2) ruido mínimo
    if (distance < 3) {
        return { accept: false, distance: 0, reason: 'tiny_noise' };
    }

    const impliedSpeedMps = distance / timeDiffSec;
    const gpsSpeedMps = nextPoint.speed ?? null;

    // 3) límites más realistas para running
    // 6.5 m/s ≈ 23.4 km/h, ya es altísimo para una sesión normal
    if (impliedSpeedMps > 6.5) {
        return { accept: false, distance: 0, reason: 'impossible_speed' };
    }

    if (gpsSpeedMps != null && gpsSpeedMps > 6.5) {
        return { accept: false, distance: 0, reason: 'gps_speed_spike' };
    }

    // 4) si está pausado, ser todavía más estricto
    if (!isRunning) {
        if (distance > 8) {
            return { accept: false, distance: 0, reason: 'paused_jump' };
        }
    }

    return { accept: true, distance, reason: 'accepted' };
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


    const verticalShareRef = useRef<any>(null);
    const horizontalShareRef = useRef<any>(null);
    const photoComposerRef = useRef<any>(null);

    const [shareMainVisible, setShareMainVisible] = useState(false);
    const [sharePhotoModeVisible, setSharePhotoModeVisible] = useState(false);

    const [pendingShareMode, setPendingShareMode] = useState<'vertical' | 'horizontal' | null>(null);

    const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
    const [customComposerVisible, setCustomComposerVisible] = useState(false);

    const [showSessionSticker, setShowSessionSticker] = useState(true);
    const [confirmCloseComposerVisible, setConfirmCloseComposerVisible] = useState(false);

    const PREVIEW_WIDTH = 320;
    const PREVIEW_HEIGHT = 570;
    const PREVIEW_STICKER_WIDTH = 250;
    const PREVIEW_STICKER_HEIGHT = 95;
    const PREVIEW_STICKER_INTERACTION_PADDING = 28;

    const PREVIEW_STICKER_TOTAL_WIDTH =
        PREVIEW_STICKER_WIDTH + PREVIEW_STICKER_INTERACTION_PADDING * 2;

    const PREVIEW_STICKER_TOTAL_HEIGHT =
        PREVIEW_STICKER_HEIGHT + PREVIEW_STICKER_INTERACTION_PADDING * 2;

    const centeredSticker = {
        x: (PREVIEW_WIDTH - PREVIEW_STICKER_TOTAL_WIDTH) / 2,
        y: (PREVIEW_HEIGHT - PREVIEW_STICKER_TOTAL_HEIGHT) / 2,
        scale: 1,
        rotation: 0,
    };

    const [stickerTransform, setStickerTransform] = useState(centeredSticker);
    const stickerTransformRef = useRef(centeredSticker);

    const [stickerStyleIndex, setStickerStyleIndex] = useState<0 | 1 | 2>(0);

    const [sharingInProgress, setSharingInProgress] = useState(false);

    const [isSelectingFinishPoint, setIsSelectingFinishPoint] = useState(false);

    const [pendingFinishPoint, setPendingFinishPoint] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const [showPendingFinishCard, setShowPendingFinishCard] = useState(false);

    const [finishPoint, setFinishPoint] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const [confirmClearFinishVisible, setConfirmClearFinishVisible] = useState(false);

    const mapRef = useRef<any>(null);

    const activeFinishPoint = pendingFinishPoint ?? finishPoint;

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    const [plannedRouteGeometry, setPlannedRouteGeometry] = useState<any | null>(null);
    const [plannedRouteDistanceMeters, setPlannedRouteDistanceMeters] = useState<number | null>(null);
    const [plannedRouteDurationSeconds, setPlannedRouteDurationSeconds] = useState<number | null>(null);

    const [remainingRouteDistanceMeters, setRemainingRouteDistanceMeters] = useState<number | null>(null);
    const [remainingRouteDurationSeconds, setRemainingRouteDurationSeconds] = useState<number | null>(null);

    const [arrivalModalVisible, setArrivalModalVisible] = useState(false);

    const lastRouteRefreshAtRef = useRef<number>(0);
    const lastRouteRefreshPositionRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const arrivalHandledRef = useRef(false);

    const [routeGeometry, setRouteGeometry] = useState<any>(null);

    const getDistanceKm = (from: any, to: any) => {
        if (!from || !to) return null;

        const R = 6371; // km
        const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
        const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

        const lat1 = (from.latitude * Math.PI) / 180;
        const lat2 = (to.latitude * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const fetchRoute = async (
        from: { latitude: number; longitude: number },
        to: { latitude: number; longitude: number }
    ) => {
        try {
            const data = await getWalkingRoute(
                { lat: from.latitude, lng: from.longitude },
                { lat: to.latitude, lng: to.longitude }
            );

            setPlannedRouteGeometry(data.geometry);
            setPlannedRouteDistanceMeters(data.distance ?? null);
            setPlannedRouteDurationSeconds(data.duration ?? null);

            setRemainingRouteDistanceMeters(data.distance ?? null);
            setRemainingRouteDurationSeconds(data.duration ?? null);

            lastRouteRefreshAtRef.current = Date.now();
            lastRouteRefreshPositionRef.current = {
                latitude: from.latitude,
                longitude: from.longitude,
            };
        } catch (error) {
            console.error('Error obteniendo ruta ORS:', error);
            setPlannedRouteGeometry(null);
            setPlannedRouteDistanceMeters(null);
            setPlannedRouteDurationSeconds(null);
            setRemainingRouteDistanceMeters(null);
            setRemainingRouteDurationSeconds(null);
        }
    };

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
        stickerTransformRef.current = stickerTransform;
    }, [stickerTransform]);


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

    const openShareImage = async (uri: string) => {
        await Share.open({
            url: uri.startsWith('file://') ? uri : `file://${uri}`,
            type: 'image/png',
            failOnCancel: false,
            title: 'Compartir sesión',
        });
    };



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
                    const safeSpeed =
                        loc.coords.speed != null && loc.coords.speed >= 0 && loc.coords.speed <= 6.5
                            ? loc.coords.speed
                            : null;

                    setCurrentSpeedMps(safeSpeed);

                    const speed = safeSpeed ?? 0;
                    setMaxSpeedMps((prev) => (speed > prev ? speed : prev));

                    setRoutePoints((prev) => {
                        const last = prev.length > 0 ? prev[prev.length - 1] : null;
                        const decision = shouldAcceptPoint(last, nextPoint, isRunning && !isPaused);

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

        clearFinishGoalState();

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

        clearFinishGoalState();

        if (currentPosition) {
            setRoutePoints([currentPosition]);
        } else {
            setRoutePoints([]);
        }
    };

    const shouldFollowUser = isRunning;

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

    const handleToggleFinishSelection = () => {
        const next = !isSelectingFinishPoint;

        setIsSelectingFinishPoint(next);

        if (!next) {
            setPendingFinishPoint(null);
            setShowPendingFinishCard(false);
            setPlannedRouteGeometry(null);
            setPlannedRouteDistanceMeters(null);
            setPlannedRouteDurationSeconds(null);
            setRemainingRouteDistanceMeters(null);
            setRemainingRouteDurationSeconds(null);
        }
    };

    const handleMapPressForFinishPoint = (point: {
        latitude: number;
        longitude: number;
    }) => {
        if (!isSelectingFinishPoint) return;
        if (finishPoint) return;

        setPendingFinishPoint(point);
        setShowPendingFinishCard(false);

        if (currentPosition) {
            fetchRoute(currentPosition, point);

            setTimeout(() => {
                fitMapToRoute(currentPosition, point);
            }, 150);
        }

        setTimeout(() => {
            setShowPendingFinishCard(true);
        }, 2000);
    };

    const handleConfirmFinishPoint = () => {
        if (!pendingFinishPoint || !currentPosition) return;

        const confirmedPoint = pendingFinishPoint;

        setFinishPoint(confirmedPoint);
        setPendingFinishPoint(null);
        setShowPendingFinishCard(false);
        setIsSelectingFinishPoint(false);
        arrivalHandledRef.current = false;

        fetchRoute(currentPosition, confirmedPoint);

        setTimeout(() => {
            fitMapToRoute(currentPosition, confirmedPoint);
        }, 150);
    };

    const handleCancelPendingFinishPoint = () => {
        setPendingFinishPoint(null);
        setShowPendingFinishCard(false);
        setPlannedRouteGeometry(null);
        setPlannedRouteDistanceMeters(null);
        setPlannedRouteDurationSeconds(null);
        setRemainingRouteDistanceMeters(null);
        setRemainingRouteDurationSeconds(null);

        setTimeout(() => {
            setRecenterTick((prev) => prev + 1);
        }, 100);
    };

    const handleRequestClearFinishPoint = () => {
        setConfirmClearFinishVisible(true);
    };

    const handleCloseClearFinishConfirm = () => {
        setConfirmClearFinishVisible(false);
    };

    const handleConfirmClearFinishPoint = () => {
        setFinishPoint(null);
        setPendingFinishPoint(null);
        setShowPendingFinishCard(false);
        setIsSelectingFinishPoint(false);
        setConfirmClearFinishVisible(false);
        setPlannedRouteGeometry(null);
        setPlannedRouteDistanceMeters(null);
        setPlannedRouteDurationSeconds(null);
        setRemainingRouteDistanceMeters(null);
        setRemainingRouteDurationSeconds(null);
        arrivalHandledRef.current = false;

        setTimeout(() => {
            setRecenterTick((prev) => prev + 1);
        }, 100);
    };

    const clearFinishGoalState = () => {
        setFinishPoint(null);
        setPendingFinishPoint(null);
        setShowPendingFinishCard(false);
        setIsSelectingFinishPoint(false);
        setConfirmClearFinishVisible(false);
        setPlannedRouteGeometry(null);
        setPlannedRouteDistanceMeters(null);
        setPlannedRouteDurationSeconds(null);
        setRemainingRouteDistanceMeters(null);
        setRemainingRouteDurationSeconds(null);
        setArrivalModalVisible(false);
        arrivalHandledRef.current = false;
    };

    useEffect(() => {
        if (!isRunning) return;
        if (!currentPosition) return;
        if (!finishPoint) return;
        if (arrivalModalVisible) return;

        const now = Date.now();
        const lastAt = lastRouteRefreshAtRef.current;
        const lastPos = lastRouteRefreshPositionRef.current;

        const movedEnough =
            lastPos
                ? haversineDistanceMeters(
                    {
                        latitude: lastPos.latitude,
                        longitude: lastPos.longitude,
                        timestamp: 0,
                    },
                    {
                        latitude: currentPosition.latitude,
                        longitude: currentPosition.longitude,
                        timestamp: 0,
                    }
                ) >= 35
                : true;

        const waitedEnough = now - lastAt >= 20000;

        if (movedEnough || waitedEnough) {
            fetchRoute(currentPosition, finishPoint);
        }
    }, [currentPosition, finishPoint, isRunning, arrivalModalVisible]);

    useEffect(() => {
        if (!isRunning) return;
        if (!finishPoint) return;
        if (arrivalHandledRef.current) return;
        if (remainingRouteDistanceMeters == null) return;

        if (remainingRouteDistanceMeters <= 25) {
            arrivalHandledRef.current = true;
            setArrivalModalVisible(true);
        }
    }, [remainingRouteDistanceMeters, finishPoint, isRunning]);

    const clearArrivalGoal = () => {
        setFinishPoint(null);
        setPendingFinishPoint(null);
        setShowPendingFinishCard(false);
        setIsSelectingFinishPoint(false);
        setPlannedRouteGeometry(null);
        setPlannedRouteDistanceMeters(null);
        setPlannedRouteDurationSeconds(null);
        setRemainingRouteDistanceMeters(null);
        setRemainingRouteDurationSeconds(null);
    };

    const handleArrivalContinue = () => {
        setArrivalModalVisible(false);
        clearArrivalGoal();
    };

    const handleArrivalFinishSession = async () => {
        setArrivalModalVisible(false);
        clearArrivalGoal();
        await finish();
    };


    const handleShareSession = () => {
        if (!selectedHistorySession) return;
        setShareMainVisible(true);
    };

    const handleOpenPhotoFormats = () => {
        setShareMainVisible(false);
        setSharePhotoModeVisible(true);
    };

    const handleRequestCloseComposer = () => {
        setConfirmCloseComposerVisible(true);
    };

    const handleContinueEditingComposer = () => {
        setConfirmCloseComposerVisible(false);
    };

    const handleDiscardComposer = () => {
        setConfirmCloseComposerVisible(false);
        setCustomComposerVisible(false);
        setCustomPhotoUri(null);
        setShowSessionSticker(true);

        setShowSessionSticker(true);
        setStickerTransform(centeredSticker);
        stickerTransformRef.current = centeredSticker;
        setStickerStyleIndex(0);
    };



    const handlePickCamera = async () => {
        try {
            setShareMainVisible(false);

            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]?.uri) return;

            const initialPosition = { x: 16, y: 24 };

            setCustomPhotoUri(result.assets[0].uri);
            setShowSessionSticker(true);
            setStickerTransform(centeredSticker);
            stickerTransformRef.current = centeredSticker;
            setStickerStyleIndex(0);
            setCustomComposerVisible(true);
        } catch (error) {
            console.error('Error tomando foto:', error);
            Alert.alert('Error', 'No se pudo tomar la foto.');
        }
    };

    const handlePickGallery = async () => {
        try {
            setShareMainVisible(false);

            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permiso requerido', 'Debes permitir acceso a la galería.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]?.uri) return;

            const initialPosition = { x: 16, y: 24 };

            setCustomPhotoUri(result.assets[0].uri);
            setShowSessionSticker(true);
            setStickerTransform(centeredSticker);
            stickerTransformRef.current = centeredSticker;
            setStickerStyleIndex(0);
            setCustomComposerVisible(true);
        } catch (error) {
            console.error('Error eligiendo imagen:', error);
            Alert.alert('Error', 'No se pudo elegir la imagen.');
        }
    };



    const handleSelectPhotoFormat = (mode: 'vertical' | 'horizontal') => {
        setSharePhotoModeVisible(false);
        setPendingShareMode(mode);
    };

    const shareVerticalCard = async () => {
        if (!selectedHistorySession || !verticalShareRef.current) return;

        try {
            setSharingInProgress(true);

            const uri = await captureRef(verticalShareRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            await openShareImage(uri);
        } catch (error) {
            console.error('Error compartiendo formato vertical:', error);
            Alert.alert('Error', 'No se pudo compartir la imagen vertical.');
        } finally {
            setPendingShareMode(null);
            setSharingInProgress(false);
        }
    };

    const shareHorizontalCard = async () => {
        if (!selectedHistorySession || !horizontalShareRef.current) return;

        try {
            setSharingInProgress(true);

            const uri = await captureRef(horizontalShareRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            await openShareImage(uri);
        } catch (error) {
            console.error('Error compartiendo formato horizontal:', error);
            Alert.alert('Error', 'No se pudo compartir la imagen horizontal.');
        } finally {
            setPendingShareMode(null);
            setSharingInProgress(false);
        }
    };

    const shareCustomPhotoComposition = async () => {
        if (!customPhotoUri || !photoComposerRef.current) return;

        try {
            setSharingInProgress(true);

            const uri = await captureRef(photoComposerRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            await openShareImage(uri);
        } catch (error) {
            console.error('Error compartiendo composición personalizada:', error);
            Alert.alert('Error', 'No se pudo compartir la imagen personalizada.');
        } finally {
            setSharingInProgress(false);
        }
    };

    useEffect(() => {
        if (!selectedHistorySession) return;

        const timeout = setTimeout(() => {
            if (pendingShareMode === 'vertical') {
                shareVerticalCard();
            }

            if (pendingShareMode === 'horizontal') {
                shareHorizontalCard();
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [pendingShareMode, selectedHistorySession]);



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

    const handleShareLastSessionSummary = () => {
        if (!lastSessionSummary) return;

        const tempSession = {
            id: 'summary-temp',
            userId: user?.id ?? 'temp-user',
            startedAt: new Date(startedAtMs ?? Date.now()).toISOString(),
            endedAt: new Date().toISOString(),
            durationSeconds: lastSessionSummary.durationSeconds,
            distanceMeters: lastSessionSummary.distanceMeters,
            avgPaceSecPerKm: lastSessionSummary.avgPaceSecPerKm,
            maxSpeedMps: lastSessionSummary.maxSpeedMps,
            pathGeoJson: buildPathGeoJson(lastSessionSummary.routePoints),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        } as RunSession;

        setSelectedHistorySession(tempSession);
        setShareMainVisible(true);
    };

    const handleDeleteLastSessionSummary = () => {
        if (!lastSessionSummary) return;

        Alert.alert(
            'Borrar sesión',
            '¿Quieres borrar esta última sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const data = await getMyRunSessions();
                            const items = data.items ?? [];

                            if (items.length === 0) {
                                Alert.alert('Aviso', 'No se encontró una sesión para borrar.');
                                return;
                            }

                            const latestSession = items[0];

                            await deleteRunSession(latestSession.id);

                            setRunHistory((prev) =>
                                prev.filter((item) => item.id !== latestSession.id)
                            );

                            setSummaryVisible(false);
                            setLastSessionSummary(null);
                        } catch (error) {
                            console.error('Error borrando última sesión:', error);
                            Alert.alert('Error', 'No se pudo borrar la sesión.');
                        }
                    },
                },
            ]
        );
    };

    const goPrevStickerStyle = () => {
        setStickerStyleIndex((prev) => {
            if (prev === 0) return 2;
            return (prev - 1) as 0 | 1 | 2;
        });
    };

    const goNextStickerStyle = () => {
        setStickerStyleIndex((prev) => {
            if (prev === 2) return 0;
            return (prev + 1) as 0 | 1 | 2;
        });
    };

    const fitMapToRoute = (
        from: { latitude: number; longitude: number },
        to: { latitude: number; longitude: number }
    ) => {
        if (!mapRef.current) return;

        const north = Math.max(from.latitude, to.latitude);
        const south = Math.min(from.latitude, to.latitude);
        const east = Math.max(from.longitude, to.longitude);
        const west = Math.min(from.longitude, to.longitude);

        mapRef.current.fitBounds(
            [east, north],
            [west, south],
            80,
            800
        );
    };

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
                                onMapPress={handleMapPressForFinishPoint}
                                pendingFinishPoint={pendingFinishPoint}
                                finishPoint={finishPoint}
                                showFinishRoute={!!finishPoint}
                                plannedRouteGeometry={plannedRouteGeometry}
                                ref={mapRef}
                            />
                            <Pressable
                                onPress={() => {
                                    if (finishPoint) {
                                        handleRequestClearFinishPoint();
                                        return;
                                    }

                                    handleToggleFinishSelection();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: 14,
                                    bottom: 68,
                                    width: 46,
                                    height: 46,
                                    borderRadius: 23,
                                    backgroundColor:
                                        isSelectingFinishPoint || finishPoint
                                            ? COLORS.primary
                                            : 'rgba(17,17,17,0.94)',
                                    borderWidth: 1,
                                    borderColor: COLORS.primary,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 15,
                                }}
                            >
                                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <FontAwesome6
                                        name="flag-checkered"
                                        size={18}
                                        color={isSelectingFinishPoint || finishPoint ? '#111111' : COLORS.textLight}
                                    />

                                    {finishPoint && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: -6,
                                                right: -8,
                                                width: 16,
                                                height: 16,
                                                borderRadius: 8,
                                                backgroundColor: '#111111',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderWidth: 1,
                                                borderColor: COLORS.primary,
                                            }}
                                        >
                                            <Ionicons name="close" size={10} color={COLORS.primary} />
                                        </View>
                                    )}
                                </View>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    if (!currentPosition) return;

                                    if (mapRef.current?.recenterOnUser) {
                                        mapRef.current.recenterOnUser(
                                            [currentPosition.longitude, currentPosition.latitude],
                                            isRunning ? mapZoomLevel : 15
                                        );
                                    } else {
                                        setRecenterTick((prev) => prev + 1);
                                    }
                                }}
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



                                {pendingFinishPoint && showPendingFinishCard && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 110,
                                            alignSelf: 'center',
                                            backgroundColor: 'rgba(17,17,17,0.96)',
                                            borderWidth: 1,
                                            borderColor: COLORS.primary,
                                            borderRadius: 16,
                                            padding: 12,
                                            zIndex: 25,
                                            minWidth: 220,
                                        }}
                                    >
                                        <View className="items-center justify-between" style={{ marginBottom: 10 }}>
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                ¿Confirmar punto de llegada?
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={handleConfirmFinishPoint}
                                            style={{
                                                backgroundColor: COLORS.primary,
                                                paddingVertical: 10,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: '#111111',
                                                    fontSize: 13,
                                                    fontWeight: '800',
                                                }}
                                            >
                                                Seleccionar
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                                {/* Historial desplegable */}
                                {historyVisible && (
                                    <View
                                        className="mt-2 rounded-2xl px-3 py-3"
                                        style={{
                                            backgroundColor: 'rgba(10,10,10,0.96)',
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                            opacity: 0.92,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 12,
                                                fontWeight: '700',
                                                marginBottom: 7,
                                                marginLeft: 5,
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
                                                {runHistory.slice(0, 5).map((session) => (
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
                    {(isSelectingFinishPoint || activeFinishPoint) && (
                        <View
                            style={{
                                position: 'absolute',
                                left: 70,
                                right: 70,
                                bottom: 16,
                                alignSelf: 'center',
                                backgroundColor: 'rgba(17,17,17,0.94)',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 14,
                                zIndex: 21,
                            }}
                        >
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 12,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }}
                            >
                                {remainingRouteDistanceMeters != null
                                    ? `Distancia restante: ${formatDistance(remainingRouteDistanceMeters)}`
                                    : activeFinishPoint && currentPosition
                                        ? `Distancia de llegada: ${getDistanceKm(currentPosition, activeFinishPoint)?.toFixed(2)} km`
                                        : 'Selecciona un punto de llegada'}
                            </Text>
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

                        <View style={{ marginTop: 16 }}>
                            <View className="flex-row justify-between" style={{ gap: 10 }}>
                                <Pressable
                                    onPress={handleDeleteLastSessionSummary}
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
                                    onPress={handleShareLastSessionSummary}
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
                                        Compartir a redes
                                    </Text>
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={() => setSummaryVisible(false)}
                                style={{
                                    marginTop: 12,
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
                visible={shareMainVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setShareMainVisible(false)}
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
                                Compartir sesión
                            </Text>

                            <Pressable
                                onPress={() => setShareMainVisible(false)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 1,
                                    borderColor: '#333333',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={handleOpenPhotoFormats}
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
                                Compartir foto
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Usa fondos fijos de la app con tus datos.
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handlePickCamera}
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
                                Tomar foto
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Crea una imagen personalizada con stickers.
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handlePickGallery}
                            style={{
                                backgroundColor: '#161616',
                                borderWidth: 1,
                                borderColor: '#262626',
                                borderRadius: 16,
                                padding: 14,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                Elegir de galería
                            </Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                                Usa una imagen tuya y agrega datos de la sesión.
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={sharePhotoModeVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSharePhotoModeVisible(false)}
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
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 18,
                                fontWeight: '700',
                                marginBottom: 16,
                            }}
                        >
                            Elegir formato
                        </Text>

                        <Pressable
                            onPress={() => handleSelectPhotoFormat('vertical')}
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
                                Vertical
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleSelectPhotoFormat('horizontal')}
                            style={{
                                backgroundColor: '#161616',
                                borderWidth: 1,
                                borderColor: '#262626',
                                borderRadius: 16,
                                padding: 14,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                Horizontal
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={customComposerVisible}
                transparent
                animationType="fade"
                onRequestClose={handleRequestCloseComposer}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.82)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 16,
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
                                padding: 14,
                            }}
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 15,
                                        fontWeight: '700',
                                        marginLeft: 5,
                                    }}
                                >
                                    Editor imagen personalizada
                                </Text>

                                <Pressable
                                    onPress={handleRequestCloseComposer}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#1b1b1b',
                                        borderWidth: 1,
                                        borderColor: '#333333',
                                    }}
                                >
                                    <Ionicons name="close" size={18} color={COLORS.textLight} />
                                </Pressable>
                            </View>

                            {customPhotoUri && selectedHistorySession && (
                                <View style={{ alignItems: 'center' }}>
                                    <SharePhotoComposer
                                        photoUri={customPhotoUri}
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
                                        showSessionSticker={showSessionSticker}
                                        stickerTransform={stickerTransform}
                                        stickerStyleIndex={stickerStyleIndex}
                                        onStickerTransformChange={setStickerTransform}
                                        mode="preview"
                                    />
                                </View>
                            )}

                            <View
                                className="flex-row items-center justify-between"
                                style={{ marginTop: 12, gap: 10 }}
                            >
                                <Pressable
                                    onPress={() => {
                                        if (showSessionSticker) {
                                            setShowSessionSticker(false);
                                        } else {
                                            setStickerTransform(centeredSticker);
                                            stickerTransformRef.current = centeredSticker;
                                            setShowSessionSticker(true);
                                        }
                                    }}
                                    style={{
                                        backgroundColor: '#1a1a1a',
                                        borderWidth: 1,
                                        borderColor: '#333',
                                        borderRadius: 12,
                                        paddingVertical: 10,
                                        paddingHorizontal: 14,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: 105,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                                        {showSessionSticker ? 'Sticker ON' : 'Sticker OFF'}
                                    </Text>
                                </Pressable>

                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#121212',
                                        borderWidth: 1,
                                        borderColor: '#2a2a2a',
                                        borderRadius: 12,
                                        paddingVertical: 8,
                                        paddingHorizontal: 10,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Pressable
                                        onPress={goPrevStickerStyle}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#222',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="chevron-back" size={18} color="#fff" />
                                    </Pressable>

                                    <Text
                                        style={{
                                            color: '#BDBDBD',
                                            fontSize: 12,
                                            fontWeight: '600',
                                        }}
                                    >
                                        Sticker {stickerStyleIndex + 1}
                                    </Text>

                                    <Pressable
                                        onPress={goNextStickerStyle}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#222',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                                    </Pressable>
                                </View>
                            </View>

                            <Pressable
                                onPress={shareCustomPhotoComposition}
                                style={{
                                    marginTop: 12,
                                    backgroundColor: COLORS.primary,
                                    paddingVertical: 15,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#111', fontWeight: '800', fontSize: 15 }}>
                                    Compartir imagen
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>

            <Modal
                visible={confirmCloseComposerVisible}
                transparent
                animationType="fade"
                onRequestClose={handleContinueEditingComposer}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 330,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: 17,
                                fontWeight: '700',
                                marginBottom: 10,
                            }}
                        >
                            ¿Quieres salir?
                        </Text>

                        <Text
                            style={{
                                color: '#BDBDBD',
                                fontSize: 13,
                                lineHeight: 20,
                                marginBottom: 16,
                            }}
                        >
                            Si sales ahora, perderás la foto y los cambios de esta imagen personalizada.
                        </Text>

                        <View className="flex-row" style={{ gap: 10 }}>
                            <Pressable
                                onPress={handleContinueEditingComposer}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 1,
                                    borderColor: '#333',
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>
                                    Seguir editando
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleDiscardComposer}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#2a1212',
                                    borderWidth: 1,
                                    borderColor: '#7f1d1d',
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#FFB4B4', fontWeight: '700' }}>
                                    Salir
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={confirmClearFinishVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseClearFinishConfirm}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 330,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: 17,
                                    fontWeight: '700',
                                    flex: 1,
                                }}
                            >
                                ¿Quieres cancelar punto de llegada?
                            </Text>

                            <Pressable
                                onPress={handleCloseClearFinishConfirm}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#1f1f1f',
                                }}
                            >
                                <Ionicons name="close" size={14} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={handleConfirmClearFinishPoint}
                            style={{
                                backgroundColor: COLORS.primary,
                                paddingVertical: 12,
                                borderRadius: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#111111',
                                    fontWeight: '800',
                                    fontSize: 14,
                                }}
                            >
                                Cancelar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={arrivalModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleArrivalContinue}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: 20,
                                fontWeight: '800',
                                textAlign: 'center',
                                marginBottom: 8,
                            }}
                        >
                            ¡Has llegado con éxito!
                        </Text>

                        <Text
                            style={{
                                color: '#BDBDBD',
                                fontSize: 13,
                                textAlign: 'center',
                                marginBottom: 16,
                                lineHeight: 20,
                            }}
                        >
                            Has alcanzado el punto de llegada seleccionado.
                        </Text>

                        <View className="flex-row" style={{ gap: 10 }}>
                            <Pressable
                                onPress={handleArrivalFinishSession}
                                style={{
                                    flex: 1,
                                    backgroundColor: COLORS.primary,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontWeight: '800',
                                        fontSize: 13,
                                    }}
                                >
                                    Terminar sesión
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleArrivalContinue}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 1,
                                    borderColor: '#333',
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: 13,
                                    }}
                                >
                                    Continuar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: -4000,
                    left: -4000,
                    opacity: 1,
                }}
            >
                {selectedHistorySession && (
                    <>
                        <ViewShot
                            ref={verticalShareRef}
                            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                        >
                            <ShareCardVertical
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

                        <ViewShot
                            ref={horizontalShareRef}
                            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                        >
                            <ShareCardHorizontal
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
                    </>
                )}
            </View>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: -5000,
                    left: -5000,
                    opacity: 1,
                }}
            >
                {customPhotoUri && selectedHistorySession && (
                    <ViewShot
                        ref={photoComposerRef}
                        options={{
                            format: 'png',
                            quality: 1,
                            result: 'tmpfile',
                        }}
                    >
                        <SharePhotoComposer
                            photoUri={customPhotoUri}
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
                            showSessionSticker={showSessionSticker}
                            stickerTransform={{
                                x: stickerTransform.x * (1080 / PREVIEW_WIDTH),
                                y: stickerTransform.y * (1920 / PREVIEW_HEIGHT),
                                scale: stickerTransform.scale,
                                rotation: stickerTransform.rotation,
                            }}
                            stickerStyleIndex={stickerStyleIndex}
                            mode="export"
                        />
                    </ViewShot>
                )}
            </View>
        </SafeAreaView>
    );
}