import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import {
    createRunSession,
    getMyRunSessions,
    deleteRunSession,
    rateRunSession,
    type RunSession,
} from '../lib/runSessions';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { getWalkingRoute } from '../lib/routing';
import { COLORS } from '../constants/colors';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import LiveRunMap from '../components/LiveRunMap.web';
import AppHeader from '@/components/AppHeader';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
    accuracy?: number | null;
    segmentId?: number;
};

const IS_LOCAL_DEV = __DEV__;

const MAX_DISPLAY_ACCURACY_METERS =
    IS_LOCAL_DEV ? 90000 : 120;

const MAX_START_ACCURACY_METERS =
    IS_LOCAL_DEV ? 90000 : 120;

const MAX_ROUTE_ACCURACY_METERS =
    IS_LOCAL_DEV ? 90000 : 35;



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
        Math.cos(lat1) *
        Math.cos(lat2) *
        sinDLon *
        sinDLon;

    return 2 * R * Math.asin(Math.sqrt(h));
}

function shouldAcceptWebPoint(
    lastPoint: RunPoint | null,
    nextPoint: RunPoint
) {
    const accuracy = nextPoint.accuracy ?? 999;

    // Para la primera prueba web somos un poco
    // más tolerantes que en native.
    if (accuracy > MAX_ROUTE_ACCURACY_METERS) {
        return {
            accept: false,
            distance: 0,
            reason: 'bad_accuracy',
        };
    }

    if (!lastPoint) {
        return {
            accept: true,
            distance: 0,
            reason: 'first_point',
        };
    }

    const distance =
        haversineDistanceMeters(lastPoint, nextPoint);

    const timeDiffMs = Math.max(
        nextPoint.timestamp - lastPoint.timestamp,
        1
    );

    const timeDiffSec = timeDiffMs / 1000;

    // Evitamos pequeños saltos del GPS.
    if (distance < 3) {
        return {
            accept: false,
            distance: 0,
            reason: 'tiny_noise',
        };
    }

    const impliedSpeedMps =
        distance / timeDiffSec;

    const gpsSpeedMps =
        nextPoint.speed ?? null;

    // Evitamos saltos imposibles.
    if (impliedSpeedMps > 6.5) {
        return {
            accept: false,
            distance: 0,
            reason: 'impossible_speed',
        };
    }

    if (
        gpsSpeedMps != null &&
        gpsSpeedMps > 6.5
    ) {
        return {
            accept: false,
            distance: 0,
            reason: 'gps_speed_spike',
        };
    }

    return {
        accept: true,
        distance,
        reason: 'accepted',
    };
}

function formatDistance(meters: number) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(2)} km`;
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

function formatSpeed(speedMps: number | null) {
    if (
        speedMps == null ||
        Number.isNaN(speedMps)
    ) {
        return '--';
    }

    return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

function formatPace(
    distanceMeters: number,
    elapsedSeconds: number
) {
    if (
        distanceMeters < 1 ||
        elapsedSeconds < 1
    ) {
        return '--';
    }

    const secondsPerKm =
        elapsedSeconds /
        (distanceMeters / 1000);

    const minutes =
        Math.floor(secondsPerKm / 60);

    const seconds =
        Math.round(secondsPerKm % 60);

    return `${String(minutes).padStart(2, '0')}:${String(
        seconds
    ).padStart(2, '0')} /km`;
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                paddingHorizontal: 2,
            }}
        >
            <Text
                style={{
                    color: '#999999',
                    fontSize: 9,
                }}
            >
                {label}
            </Text>

            <Text
                numberOfLines={1}
                style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: '800',
                    marginTop: 2,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

function buildStoredPathGeoJson(points: RunPoint[]) {
    const segments =
        new Map<number, RunPoint[]>();

    points.forEach((point) => {
        const segmentId =
            point.segmentId ?? 0;

        const existing =
            segments.get(segmentId) ?? [];

        existing.push(point);

        segments.set(
            segmentId,
            existing
        );
    });

    return {
        type: 'FeatureCollection',
        features: Array.from(
            segments.entries()
        )
            .filter(
                ([, segmentPoints]) =>
                    segmentPoints.length >= 2
            )
            .map(
                ([
                    segmentId,
                    segmentPoints,
                ]) => ({
                    type: 'Feature',
                    properties: {
                        segmentId,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates:
                            segmentPoints.map(
                                (point) => [
                                    point.longitude,
                                    point.latitude,
                                ]
                            ),
                    },
                })
            ),
    };
}

function pathGeoJsonToPoints(
    pathGeoJson: any
): RunPoint[] {
    if (!pathGeoJson) return [];

    try {
        const parsed =
            typeof pathGeoJson === 'string'
                ? JSON.parse(pathGeoJson)
                : pathGeoJson;

        let counter = 0;

        const convertLine = (
            coordinates: any[],
            segmentId: number
        ) =>
            coordinates
                .filter(
                    (coord) =>
                        Array.isArray(coord) &&
                        coord.length >= 2 &&
                        typeof coord[0] === 'number' &&
                        typeof coord[1] === 'number'
                )
                .map((coord) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                    timestamp:
                        Date.now() +
                        counter++,
                    speed: null,
                    accuracy: null,
                    segmentId,
                }));

        /*
         * Sesiones mobile antiguas.
         */
        if (
            parsed.type === 'LineString' &&
            Array.isArray(
                parsed.coordinates
            )
        ) {
            return convertLine(
                parsed.coordinates,
                0
            );
        }

        /*
         * Feature individual.
         */
        if (
            parsed.type === 'Feature' &&
            parsed.geometry?.type ===
            'LineString'
        ) {
            return convertLine(
                parsed.geometry.coordinates ??
                [],
                parsed.properties
                    ?.segmentId ?? 0
            );
        }

        /*
         * Sesiones web segmentadas.
         */
        if (
            parsed.type ===
            'FeatureCollection' &&
            Array.isArray(
                parsed.features
            )
        ) {
            return parsed.features.flatMap(
                (
                    feature: any,
                    index: number
                ) => {
                    if (
                        feature?.geometry
                            ?.type !==
                        'LineString'
                    ) {
                        return [];
                    }

                    return convertLine(
                        feature.geometry
                            .coordinates ?? [],
                        feature.properties
                            ?.segmentId ??
                        index
                    );
                }
            );
        }

        /*
         * Lo dejamos compatible también
         * con MultiLineString.
         */
        if (
            parsed.type ===
            'MultiLineString' &&
            Array.isArray(
                parsed.coordinates
            )
        ) {
            return parsed.coordinates.flatMap(
                (
                    line: any[],
                    index: number
                ) =>
                    convertLine(
                        line,
                        index
                    )
            );
        }

        return [];
    } catch {
        return [];
    }
}

function getRouteBounds(
    points: RunPoint[]
) {
    if (points.length === 0) {
        return null;
    }

    let minLng =
        points[0].longitude;

    let maxLng =
        points[0].longitude;

    let minLat =
        points[0].latitude;

    let maxLat =
        points[0].latitude;

    points.forEach((point) => {
        minLng = Math.min(
            minLng,
            point.longitude
        );

        maxLng = Math.max(
            maxLng,
            point.longitude
        );

        minLat = Math.min(
            minLat,
            point.latitude
        );

        maxLat = Math.max(
            maxLat,
            point.latitude
        );
    });

    const lngSpan =
        maxLng - minLng;

    const latSpan =
        maxLat - minLat;

    const lngPadding =
        Math.max(
            lngSpan * 0.18,
            0.0012
        );

    const latPadding =
        Math.max(
            latSpan * 0.18,
            0.0012
        );

    return {
        ne: [
            maxLng + lngPadding,
            maxLat + latPadding,
        ] as [number, number],

        sw: [
            minLng - lngPadding,
            minLat - latPadding,
        ] as [number, number],
    };
}

function HistorySessionMapPreview({
    session,
    height = 240,
}: {
    session: RunSession;
    height?: number;
}) {
    const mapRef =
        useRef<any>(null);

    const points = useMemo(
        () =>
            pathGeoJsonToPoints(
                session.pathGeoJson
            ),
        [session.pathGeoJson]
    );

    const bounds = useMemo(
        () =>
            getRouteBounds(points),
        [points]
    );

    useEffect(() => {
        if (!bounds) return;

        const timer =
            setTimeout(() => {
                mapRef.current?.fitBounds?.(
                    bounds.ne,
                    bounds.sw,
                    45,
                    600
                );
            }, 600);

        return () =>
            clearTimeout(timer);
    }, [bounds]);

    if (points.length < 2) {
        return (
            <View
                style={{
                    height,
                    borderRadius: 18,
                    backgroundColor:
                        '#111111',
                    alignItems:
                        'center',
                    justifyContent:
                        'center',
                }}
            >
                <Text
                    style={{
                        color: '#888888',
                    }}
                >
                    Sin ruta suficiente
                </Text>
            </View>
        );
    }

    return (
        <View
            style={{
                height,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor:
                    COLORS.primary,
            }}
        >
            <LiveRunMap
                ref={mapRef}
                currentPosition={
                    points[
                    points.length - 1
                    ]
                }
                routePoints={points}
                shouldFollowUser={false}
                zoomLevel={13}
                recenterTick={0}
            />
        </View>
    );
}

export default function LiveRunWeb() {


    const [loading, setLoading] = useState(true);

    const [locationError, setLocationError] =
        useState<string | null>(null);

    const [currentPosition, setCurrentPosition] =
        useState<RunPoint | null>(null);

    const [recenterTick, setRecenterTick] =
        useState(0);

    const watchIdRef = useRef<number | null>(null);

    const hasReliablePositionRef = useRef(false);



    const [isRunning, setIsRunning] =
        useState(false);

    const isRunningRef =
        useRef(false);

    const [isPaused, setIsPaused] =
        useState(false);

    const isPausedRef =
        useRef(false);

    const [elapsedSeconds, setElapsedSeconds] =
        useState(0);

    const [currentSpeedMps, setCurrentSpeedMps] =
        useState<number | null>(null);

    const [maxSpeedMps, setMaxSpeedMps] =
        useState(0);

    const startedAtMsRef =
        useRef<number | null>(null);

    const pauseStartedAtRef =
        useRef<number | null>(null);

    const totalPausedMsRef =
        useRef(0);

    const [routePoints, setRoutePoints] =
        useState<RunPoint[]>([]);

    const [distanceMeters, setDistanceMeters] =
        useState(0);

    const lastAcceptedPointRef =
        useRef<RunPoint | null>(null);

    const currentSegmentIdRef = useRef(0);

    const forceSegmentBreakRef = useRef(false);

    const [gpsBreakCount, setGpsBreakCount] =
        useState(0);

    type WakeLockSentinelLike = {
        released: boolean;
        release: () => Promise<void>;
        addEventListener: (
            type: 'release',
            listener: () => void
        ) => void;
    };

    const [screenLockMode, setScreenLockMode] =
        useState(false);

    const screenLockModeRef =
        useRef(false);

    const [wakeLockActive, setWakeLockActive] =
        useState(false);

    const wakeLockRef =
        useRef<WakeLockSentinelLike | null>(null);

    const unlockTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const [unlockHolding, setUnlockHolding] =
        useState(false);

    const [wakeLockMessage, setWakeLockMessage] =
        useState<string | null>(null);

    const canStartRun =
        currentPosition != null &&
        (currentPosition.accuracy ?? 999) <=
        MAX_START_ACCURACY_METERS;

    const [savingSession, setSavingSession] =
        useState(false);

    const [summaryVisible, setSummaryVisible] =
        useState(false);

    const [lastSessionSummary, setLastSessionSummary] =
        useState<{
            session: RunSession;
            gpsBreakCount: number;
        } | null>(null);

    const [runSessionRating, setRunSessionRating] =
        useState<number | null>(null);

    const [
        runSessionRatingLoading,
        setRunSessionRatingLoading,
    ] = useState(false);

    const [
        runSessionRatingSaved,
        setRunSessionRatingSaved,
    ] = useState(false);

    const runSessionRatingSavedRef =
        useRef(false);

    const [
        confirmDeleteSummary,
        setConfirmDeleteSummary,
    ] = useState(false);

    const [
        deletingSummarySession,
        setDeletingSummarySession,
    ] = useState(false);

    const [historyVisible, setHistoryVisible] =
        useState(false);

    const [historyLoading, setHistoryLoading] =
        useState(false);

    const [runHistory, setRunHistory] =
        useState<RunSession[]>([]);

    const [
        selectedHistorySession,
        setSelectedHistorySession,
    ] =
        useState<RunSession | null>(null);

    const mapRef = useRef<any>(null);

    const [historyError, setHistoryError] =
        useState<string | null>(null);

    const [
        historyDeleteConfirm,
        setHistoryDeleteConfirm,
    ] = useState(false);

    const [
        historyDeleting,
        setHistoryDeleting,
    ] = useState(false);

    const [isSelectingFinishPoint, setIsSelectingFinishPoint] =
        useState(false);

    const [pendingFinishPoint, setPendingFinishPoint] =
        useState<{
            latitude: number;
            longitude: number;
        } | null>(null);

    const [finishPoint, setFinishPoint] =
        useState<{
            latitude: number;
            longitude: number;
        } | null>(null);

    const [showPendingFinishCard, setShowPendingFinishCard] =
        useState(false);

    const [confirmClearFinishVisible, setConfirmClearFinishVisible] =
        useState(false);

    const [arrivalModalVisible, setArrivalModalVisible] =
        useState(false);

    const [routeLoading, setRouteLoading] =
        useState(false);

    const [plannedRouteGeometry, setPlannedRouteGeometry] =
        useState<any | null>(null);

    const [
        plannedRouteDistanceMeters,
        setPlannedRouteDistanceMeters,
    ] = useState<number | null>(null);

    const [
        plannedRouteDurationSeconds,
        setPlannedRouteDurationSeconds,
    ] = useState<number | null>(null);

    const [
        remainingRouteDistanceMeters,
        setRemainingRouteDistanceMeters,
    ] = useState<number | null>(null);

    const [
        remainingRouteDurationSeconds,
        setRemainingRouteDurationSeconds,
    ] = useState<number | null>(null);

    const lastRouteRefreshAtRef =
        useRef(0);

    const lastRouteRefreshPositionRef =
        useRef<{
            latitude: number;
            longitude: number;
        } | null>(null);

    const arrivalHandledRef =
        useRef(false);

    const routeRequestInFlightRef = useRef(false);

    const [deletePromptLoading, setDeletePromptLoading] =
        useState(false);

    const deletePromptTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    type DangerousRunAction =
        | 'home'
        | 'reset'
        | 'finish';

    const [
        dangerLoadingAction,
        setDangerLoadingAction,
    ] =
        useState<DangerousRunAction | null>(
            null
        );

    const [
        dangerActionToConfirm,
        setDangerActionToConfirm,
    ] =
        useState<DangerousRunAction | null>(
            null
        );

    const dangerActionTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(
            null
        );

    const pendingHomeAfterFinishRef =
        useRef(false);

    const requestDeleteSummaryConfirmation = () => {
        if (
            deletePromptLoading ||
            deletingSummarySession
        ) {
            return;
        }

        setDeletePromptLoading(true);

        if (deletePromptTimerRef.current) {
            clearTimeout(
                deletePromptTimerRef.current
            );
        }

        deletePromptTimerRef.current =
            setTimeout(() => {
                deletePromptTimerRef.current =
                    null;

                setDeletePromptLoading(false);

                setConfirmDeleteSummary(true);
            }, 2000);
    };

    const requestScreenWakeLock = async () => {
        if (typeof navigator === 'undefined') {
            return false;
        }

        const wakeLockManager = (
            navigator as Navigator & {
                wakeLock?: {
                    request: (
                        type: 'screen'
                    ) => Promise<WakeLockSentinelLike>;
                };
            }
        ).wakeLock;

        if (!wakeLockManager) {
            setWakeLockMessage(
                'Este dispositivo no permite mantener la pantalla activa.'
            );

            setWakeLockActive(false);
            return false;
        }

        try {
            /*
             * Si ya tenemos uno activo,
             * no pedimos otro.
             */
            if (
                wakeLockRef.current &&
                !wakeLockRef.current.released
            ) {
                setWakeLockActive(true);
                return true;
            }

            const sentinel =
                await wakeLockManager.request('screen');

            wakeLockRef.current = sentinel;
            setWakeLockActive(true);
            setWakeLockMessage(null);

            /*
             * El sistema puede liberar el Wake Lock
             * por su cuenta.
             */
            sentinel.addEventListener(
                'release',
                () => {
                    if (
                        wakeLockRef.current ===
                        sentinel
                    ) {
                        wakeLockRef.current = null;
                    }

                    setWakeLockActive(false);
                }
            );

            return true;
        } catch (error) {
            console.error(
                'No se pudo activar Wake Lock:',
                error
            );

            setWakeLockActive(false);

            setWakeLockMessage(
                'No se pudo mantener la pantalla activa.'
            );

            return false;
        }
    };

    const releaseScreenWakeLock = async () => {
        const sentinel =
            wakeLockRef.current;

        wakeLockRef.current = null;
        setWakeLockActive(false);

        if (
            sentinel &&
            !sentinel.released
        ) {
            try {
                await sentinel.release();
            } catch (error) {
                console.log(
                    'Wake Lock ya estaba liberado:',
                    error
                );
            }
        }
    };

    const enterScreenLockMode = async () => {
        if (!isRunningRef.current) return;

        const acquired =
            await requestScreenWakeLock();

        if (!acquired) {
            return;
        }

        screenLockModeRef.current = true;
        setScreenLockMode(true);
    };

    const exitScreenLockMode = async () => {
        screenLockModeRef.current = false;
        setScreenLockMode(false);

        if (unlockTimerRef.current) {
            clearTimeout(
                unlockTimerRef.current
            );

            unlockTimerRef.current = null;
        }

        setUnlockHolding(false);

        await releaseScreenWakeLock();
    };

    const startUnlockHold = () => {
        if (unlockTimerRef.current) {
            clearTimeout(
                unlockTimerRef.current
            );
        }

        setUnlockHolding(true);

        unlockTimerRef.current =
            setTimeout(() => {
                unlockTimerRef.current = null;

                setUnlockHolding(false);

                void exitScreenLockMode();
            }, 5000);
    };

    const cancelUnlockHold = () => {
        if (unlockTimerRef.current) {
            clearTimeout(
                unlockTimerRef.current
            );

            unlockTimerRef.current = null;
        }

        setUnlockHolding(false);
    };

    useEffect(() => {
        if (
            !isRunning ||
            isPaused ||
            startedAtMsRef.current == null
        ) {
            return;
        }

        const updateTimer = () => {
            const startedAt =
                startedAtMsRef.current;

            if (startedAt == null) return;

            const elapsed = Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        startedAt -
                        totalPausedMsRef.current
                    ) / 1000
                )
            );

            setElapsedSeconds(elapsed);
        };

        updateTimer();

        const interval =
            setInterval(updateTimer, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [isRunning, isPaused]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const handleVisibilityChange = () => {
            /*
             * La PWA deja de estar visible.
             */
            if (
                document.visibilityState === 'hidden'
            ) {
                if (isRunningRef.current) {
                    forceSegmentBreakRef.current =
                        true;
                }

                return;
            }

            /*
             * La PWA volvió a estar visible.
             *
             * Si estábamos en Modo Carrera,
             * intentamos recuperar el Wake Lock.
             */
            if (
                document.visibilityState === 'visible' &&
                screenLockModeRef.current &&
                isRunningRef.current
            ) {
                void requestScreenWakeLock();
            }
        };

        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange
        );

        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
        };
    }, []);

    useEffect(() => {
        let active = true;

        const handlePosition = (position: GeolocationPosition) => {
            if (!active) return;

            const nextPoint: RunPoint = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp ?? Date.now(),
                speed: position.coords.speed,
                accuracy: position.coords.accuracy,
            };

            const accuracy =
                nextPoint.accuracy ?? 999;

            /*
             * No movemos el mapa con posiciones
             * extremadamente imprecisas.
             */
            if (accuracy > MAX_DISPLAY_ACCURACY_METERS) {
                setLoading(false);

                if (!hasReliablePositionRef.current) {
                    setLocationError(
                        `Señal GPS imprecisa (${Math.round(
                            accuracy
                        )} m). Esperando una ubicación más precisa...`
                    );
                }

                return;
            }

            hasReliablePositionRef.current = true;

            setCurrentPosition(nextPoint);
            setLocationError(null);
            setLoading(false);

            if (
                isRunningRef.current &&
                !isPausedRef.current
            ) {
                const lastPoint =
                    lastAcceptedPointRef.current;

                /*
                 * Primero comprobamos si el nuevo punto
                 * tiene una precisión GPS aceptable.
                 */
                const validAsSegmentStart =
                    shouldAcceptWebPoint(
                        null,
                        nextPoint
                    );

                /*
                 * Protección adicional:
                 * si pasó mucho tiempo y además estamos
                 * lejos del último punto, probablemente
                 * hubo una interrupción del GPS.
                 */
                const timeGapMs =
                    lastPoint
                        ? Math.max(
                            nextPoint.timestamp -
                            lastPoint.timestamp,
                            0
                        )
                        : 0;

                const jumpDistanceMeters =
                    lastPoint
                        ? haversineDistanceMeters(
                            lastPoint,
                            nextPoint
                        )
                        : 0;

                const probableGpsInterruption =
                    forceSegmentBreakRef.current ||
                    (
                        timeGapMs > 15000 &&
                        jumpDistanceMeters > 30
                    );

                /*
                 * Si hubo una interrupción:
                 * NO sumamos la distancia faltante.
                 * Iniciamos un segmento nuevo.
                 */
                if (
                    lastPoint &&
                    probableGpsInterruption
                ) {
                    /*
                     * Esperamos un punto suficientemente
                     * preciso antes de iniciar el nuevo tramo.
                     */
                    if (!validAsSegmentStart.accept) {
                        return;
                    }

                    currentSegmentIdRef.current += 1;

                    const restartPoint: RunPoint = {
                        ...nextPoint,
                        segmentId:
                            currentSegmentIdRef.current,
                    };
                    setCurrentSpeedMps(0);

                    setRoutePoints(
                        (current) => [
                            ...current,
                            restartPoint,
                        ]
                    );

                    lastAcceptedPointRef.current =
                        restartPoint;

                    forceSegmentBreakRef.current =
                        false;

                    setGpsBreakCount(
                        (current) => current + 1
                    );

                    return;
                }

                /*
                 * Funcionamiento normal.
                 */
                const decision =
                    shouldAcceptWebPoint(
                        lastPoint,
                        nextPoint
                    );

                if (!decision.accept) {
                    /*
                     * Si simplemente estamos prácticamente
                     * quietos, mostramos velocidad cero.
                     */
                    if (
                        decision.reason ===
                        'tiny_noise'
                    ) {
                        setCurrentSpeedMps(0);
                    }

                    return;
                }

                const acceptedPoint: RunPoint = {
                    ...nextPoint,
                    segmentId:
                        currentSegmentIdRef.current,
                };
                /*
 * Calculamos velocidad.
 *
 * Primero usamos la velocidad que nos da
 * directamente el GPS cuando es válida.
 *
 * Si el navegador no la proporciona,
 * la derivamos usando distancia / tiempo.
 */
                let safeSpeedMps: number | null = null;

                if (
                    nextPoint.speed != null &&
                    nextPoint.speed >= 0 &&
                    nextPoint.speed <= 6.5
                ) {
                    safeSpeedMps =
                        nextPoint.speed;
                } else if (lastPoint) {
                    const secondsBetweenPoints =
                        Math.max(
                            (
                                nextPoint.timestamp -
                                lastPoint.timestamp
                            ) / 1000,
                            0.1
                        );

                    const calculatedSpeed =
                        decision.distance /
                        secondsBetweenPoints;

                    if (
                        calculatedSpeed >= 0 &&
                        calculatedSpeed <= 6.5
                    ) {
                        safeSpeedMps =
                            calculatedSpeed;
                    }
                }

                setCurrentSpeedMps(
                    safeSpeedMps ?? 0
                );

                if (safeSpeedMps != null) {
                    setMaxSpeedMps(
                        (previous) =>
                            Math.max(
                                previous,
                                safeSpeedMps
                            )
                    );
                }

                if (lastPoint) {
                    setDistanceMeters(
                        (current) =>
                            current + decision.distance
                    );
                }

                setRoutePoints(
                    (current) => [
                        ...current,
                        acceptedPoint,
                    ]
                );

                lastAcceptedPointRef.current =
                    acceptedPoint;
            }
        };

        const handleLocationError = (
            error: GeolocationPositionError
        ) => {
            if (!active) return;

            console.error(
                'Error GPS web:',
                error.code,
                error.message
            );

            if (error.code === 1) {
                setLocationError(
                    'Necesitamos permiso de ubicación para usar el modo running.'
                );
            } else if (error.code === 2) {
                setLocationError(
                    'No pudimos determinar tu ubicación.'
                );
            } else if (error.code === 3) {
                setLocationError(
                    'La ubicación está tardando demasiado. Intenta nuevamente.'
                );
            } else {
                setLocationError(
                    'No pudimos obtener tu ubicación.'
                );
            }

            setLoading(false);
        };

        if (
            typeof navigator === 'undefined' ||
            !navigator.geolocation
        ) {
            setLocationError(
                'Este navegador no permite acceder a la ubicación.'
            );

            setLoading(false);

            return;
        }

        /*
         * Primera posición.
         * Esto también dispara el permiso del navegador
         * si todavía no fue concedido.
         */
        navigator.geolocation.getCurrentPosition(
            handlePosition,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );

        /*
         * Seguimiento continuo.
         */
        watchIdRef.current =
            navigator.geolocation.watchPosition(
                handlePosition,
                handleLocationError,
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0,
                }
            );

        return () => {
            active = false;

            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(
                    watchIdRef.current
                );

                watchIdRef.current = null;
            }
        };
    }, []);

    const fetchRoute = async (

        from: {
            latitude: number;
            longitude: number;
        },
        to: {
            latitude: number;
            longitude: number;
        }
    ) => {
        try {
            if (routeRequestInFlightRef.current) return;

            routeRequestInFlightRef.current = true;
            setRouteLoading(true);

            const data =
                await getWalkingRoute(
                    {
                        lat: from.latitude,
                        lng: from.longitude,
                    },
                    {
                        lat: to.latitude,
                        lng: to.longitude,
                    }
                );

            setPlannedRouteGeometry(
                data.geometry
            );

            setPlannedRouteDistanceMeters(
                data.distance ?? null
            );

            setPlannedRouteDurationSeconds(
                data.duration ?? null
            );

            setRemainingRouteDistanceMeters(
                data.distance ?? null
            );

            setRemainingRouteDurationSeconds(
                data.duration ?? null
            );

            lastRouteRefreshAtRef.current =
                Date.now();

            lastRouteRefreshPositionRef.current = {
                latitude: from.latitude,
                longitude: from.longitude,
            };
        } catch (error) {
            console.error(
                'Error obteniendo ruta:',
                error
            );

            setPlannedRouteGeometry(null);
            setPlannedRouteDistanceMeters(null);
            setPlannedRouteDurationSeconds(null);
            setRemainingRouteDistanceMeters(null);
            setRemainingRouteDurationSeconds(null);

            Alert.alert(
                'Ruta no disponible',
                'No se pudo calcular una ruta hasta ese punto.'
            );
        } finally {
            setRouteLoading(false);
            routeRequestInFlightRef.current = false;
            setRouteLoading(false);
        }
    };

    const startRun = () => {
        if (!currentPosition) return;

        const accuracy =
            currentPosition.accuracy ?? 999;

        if (
            accuracy >
            MAX_START_ACCURACY_METERS
        ) {
            return;
        }

        currentSegmentIdRef.current = 0;
        forceSegmentBreakRef.current = false;

        setGpsBreakCount(0);
        setDistanceMeters(0);
        setElapsedSeconds(0);
        setCurrentSpeedMps(null);
        setMaxSpeedMps(0);

        startedAtMsRef.current =
            Date.now();

        pauseStartedAtRef.current =
            null;

        totalPausedMsRef.current = 0;

        isPausedRef.current = false;
        setIsPaused(false);

        /*
         * Solamente comenzamos a guardar
         * recorrido si el GPS ya tiene
         * precisión suficiente.
         */
        if (
            accuracy <=
            MAX_ROUTE_ACCURACY_METERS
        ) {
            const firstPoint: RunPoint = {
                ...currentPosition,
                segmentId: 0,
            };

            setRoutePoints([
                firstPoint,
            ]);

            lastAcceptedPointRef.current =
                firstPoint;
        } else {
            setRoutePoints([]);

            lastAcceptedPointRef.current =
                null;
        }

        isRunningRef.current = true;
        setIsRunning(true);
    };

    const pauseRun = () => {
        if (
            !isRunningRef.current ||
            isPausedRef.current
        ) {
            return;
        }

        isPausedRef.current = true;
        setIsPaused(true);

        pauseStartedAtRef.current =
            Date.now();

        setCurrentSpeedMps(0);

        /*
         * Cuando retomemos no queremos
         * dibujar una línea desde el punto
         * previo a la pausa.
         */
        forceSegmentBreakRef.current =
            true;
    };

    const resumeRun = () => {
        if (
            !isRunningRef.current ||
            !isPausedRef.current
        ) {
            return;
        }

        if (
            pauseStartedAtRef.current != null
        ) {
            totalPausedMsRef.current +=
                Date.now() -
                pauseStartedAtRef.current;

            pauseStartedAtRef.current =
                null;
        }

        /*
         * El próximo punto válido comienza
         * un segmento nuevo.
         */
        forceSegmentBreakRef.current =
            true;

        isPausedRef.current = false;
        setIsPaused(false);
    };

    const handleRateLastRunSession =
        async (rating: number) => {
            if (
                runSessionRatingLoading ||
                runSessionRatingSaved
            ) {
                return;
            }

            const session =
                lastSessionSummary?.session;

            if (!session?.id) {
                return;
            }

            try {
                setRunSessionRating(rating);
                setRunSessionRatingLoading(true);

                await rateRunSession(
                    session.id,
                    rating
                );

                runSessionRatingSavedRef.current =
                    true;

                setRunSessionRatingSaved(true);
            } catch (error) {
                console.error(
                    'Error guardando valoración:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudo guardar la valoración.'
                );
            } finally {
                setRunSessionRatingLoading(false);
            }
        };

    const ensureRunSessionRatingBeforeClose =
        async () => {
            if (
                runSessionRatingSavedRef.current
            ) {
                return;
            }

            /*
             * Igual que en mobile:
             * si no eligió una valoración,
             * usamos 6 como valor neutral.
             */
            await handleRateLastRunSession(6);
        };

    const finishRun = async () => {
        if (
            !isRunningRef.current ||
            savingSession
        ) {
            return;
        }

        const endedAtMs =
            Date.now();

        const startedAtMs =
            startedAtMsRef.current;

        const pendingPauseMs =
            pauseStartedAtRef.current !=
                null
                ? endedAtMs -
                pauseStartedAtRef.current
                : 0;

        const totalPausedMs =
            totalPausedMsRef.current +
            pendingPauseMs;

        const finalElapsedSeconds =
            startedAtMs != null
                ? Math.max(
                    0,
                    Math.floor(
                        (
                            endedAtMs -
                            startedAtMs -
                            totalPausedMs
                        ) / 1000
                    )
                )
                : elapsedSeconds;

        /*
         * Primero detenemos la sesión
         * localmente para que el GPS
         * deje de sumar mientras hablamos
         * con Render.
         */
        isRunningRef.current = false;
        setIsRunning(false);

        isPausedRef.current = false;
        setIsPaused(false);

        setElapsedSeconds(
            finalElapsedSeconds
        );

        setCurrentSpeedMps(0);

        screenLockModeRef.current =
            false;

        setScreenLockMode(false);

        await releaseScreenWakeLock();

        const avgPaceSecPerKm =
            distanceMeters > 0
                ? finalElapsedSeconds /
                (
                    distanceMeters /
                    1000
                )
                : null;

        try {
            setSavingSession(true);

            if (startedAtMs == null) {
                throw new Error(
                    'No se encontró el inicio de la sesión.'
                );
            }

            const created =
                await createRunSession({
                    startedAt:
                        new Date(
                            startedAtMs
                        ).toISOString(),

                    endedAt:
                        new Date(
                            endedAtMs
                        ).toISOString(),

                    durationSeconds:
                        finalElapsedSeconds,

                    distanceMeters,

                    avgPaceSecPerKm,

                    maxSpeedMps:
                        maxSpeedMps > 0
                            ? maxSpeedMps
                            : null,

                    pathGeoJson:
                        routePoints.length >= 2
                            ? buildStoredPathGeoJson(
                                routePoints
                            )
                            : null,
                });

            /*
             * Actualizamos también el historial
             * local inmediatamente.
             */
            if (!created?.item) {
                throw new Error(
                    'El servidor no devolvió la sesión creada.'
                );
            }

            setRunHistory(
                (current) => [
                    created.item,
                    ...current.filter(
                        (session) =>
                            session.id !==
                            created.item.id
                    ),
                ]
            );

            /*
             * Preparamos el resumen.
             */
            setRunSessionRating(null);
            setRunSessionRatingLoading(false);
            setRunSessionRatingSaved(false);

            runSessionRatingSavedRef.current =
                false;

            setConfirmDeleteSummary(false);

            setLastSessionSummary({
                session: created.item,
                gpsBreakCount,
            });

            setSummaryVisible(true);
        } catch (error) {
            console.error(
                'Error guardando sesión web:',
                error
            );
            pendingHomeAfterFinishRef.current =
                false;

            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar la sesión.'
            );
        } finally {
            setSavingSession(false);

            lastAcceptedPointRef.current =
                null;

            forceSegmentBreakRef.current =
                false;

            pauseStartedAtRef.current =
                null;

            totalPausedMsRef.current = 0;

            startedAtMsRef.current =
                null;
        }
        clearFinishGoalState();
    };

    const resetRun = async () => {
        /*
         * Si había una pausa abierta,
         * la descartamos.
         */
        pauseStartedAtRef.current = null;
        totalPausedMsRef.current = 0;

        /*
         * Nueva sesión lógica desde este instante.
         */
        startedAtMsRef.current =
            isRunningRef.current
                ? Date.now()
                : null;

        setElapsedSeconds(0);
        setDistanceMeters(0);
        setCurrentSpeedMps(null);
        setMaxSpeedMps(0);

        setGpsBreakCount(0);

        currentSegmentIdRef.current = 0;
        forceSegmentBreakRef.current = false;

        isPausedRef.current = false;
        setIsPaused(false);

        /*
         * Si tenemos un GPS suficientemente bueno,
         * usamos la posición actual como nuevo inicio.
         */
        const accuracy =
            currentPosition?.accuracy ?? 999;

        if (
            currentPosition &&
            accuracy <= MAX_ROUTE_ACCURACY_METERS
        ) {
            const firstPoint: RunPoint = {
                ...currentPosition,
                segmentId: 0,
            };

            setRoutePoints([firstPoint]);

            lastAcceptedPointRef.current =
                firstPoint;
        } else {
            setRoutePoints([]);

            lastAcceptedPointRef.current =
                null;
        }

        /*
         * Volvemos a centrar el mapa.
         */
        setRecenterTick(
            (current) => current + 1
        );
        clearFinishGoalState();
    };

    const toggleHistory = async () => {
        /*
         * Si ya está abierto,
         * simplemente cerramos.
         */
        if (historyVisible) {
            setHistoryVisible(false);
            setSelectedHistorySession(null);
            setHistoryDeleteConfirm(false);
            return;
        }

        /*
         * Abrimos el modal inmediatamente.
         * Adentro aparecerá el spinner.
         */
        setSelectedHistorySession(null);
        setHistoryDeleteConfirm(false);

        setHistoryError(null);
        setHistoryVisible(true);
        setHistoryLoading(true);

        try {
            /*
             * Queremos mostrar el spinner
             * como mínimo 1 segundo.
             *
             * Si el servidor tarda 2 segundos,
             * entonces dura 2 segundos.
             */
            const minimumLoadingTime =
                new Promise<void>(
                    (resolve) => {
                        setTimeout(
                            resolve,
                            1000
                        );
                    }
                );

            const [
                data,
            ] = await Promise.all([
                getMyRunSessions(),
                minimumLoadingTime,
            ]);

            /*
             * El modal rápido muestra
             * solamente las últimas 10.
             */
            setRunHistory(
                (data.items ?? []).slice(
                    0,
                    10
                )
            );
        } catch (error) {
            console.error(
                'Error cargando historial:',
                error
            );

            setHistoryError(
                'No pudimos cargar las sesiones.'
            );
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistoryModal = () => {
        setHistoryVisible(false);

        setSelectedHistorySession(null);

        setHistoryDeleteConfirm(false);

        setHistoryError(null);
    };

    const deleteSelectedHistorySession =
        async () => {
            const session =
                selectedHistorySession;

            if (
                !session ||
                historyDeleting
            ) {
                return;
            }

            try {
                setHistoryDeleting(true);

                await deleteRunSession(
                    session.id
                );

                /*
                 * La eliminamos también
                 * del listado local.
                 */
                setRunHistory(
                    (current) =>
                        current.filter(
                            (item) =>
                                item.id !==
                                session.id
                        )
                );

                /*
                 * Regresamos a la lista.
                 */
                setSelectedHistorySession(
                    null
                );

                setHistoryDeleteConfirm(
                    false
                );
            } catch (error) {
                console.error(
                    'Error eliminando sesión:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudo eliminar la sesión.'
                );
            } finally {
                setHistoryDeleting(false);
            }
        };

    type IoniconName =
        React.ComponentProps<
            typeof Ionicons
        >['name'];

    function BottomActionButton({
        icon,
        label,
        onPress,
        primary = false,
        danger = false,
        large = false,
        disabled = false,
        loading = false,
    }: {
        icon: IoniconName;
        label: string;
        onPress: () => void;
        primary?: boolean;
        danger?: boolean;
        large?: boolean;
        disabled?: boolean;
        loading?: boolean;
    }) {
        return (
            <Pressable
                disabled={
                    disabled ||
                    loading
                }
                onPress={onPress}
                style={({ pressed }) => ({
                    flex:
                        large
                            ? 1.2
                            : 1,

                    minWidth: 0,

                    height:
                        large
                            ? 70
                            : 65,

                    borderRadius: 17,

                    alignItems: 'center',
                    justifyContent: 'center',

                    backgroundColor:
                        disabled
                            ? '#252525'
                            : primary
                                ? COLORS.primary
                                : danger
                                    ? '#3A2020'
                                    : pressed
                                        ? '#333333'
                                        : '#242424',

                    borderWidth: 3,

                    borderColor:
                        primary
                            ? COLORS.primary
                            : danger
                                ? '#704040'
                                : '#353535',

                    opacity:
                        disabled
                            ? 0.45
                            : pressed
                                ? 0.8
                                : 1,
                })}
            >
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={
                            primary
                                ? '#111111'
                                : danger
                                    ? '#FF7777'
                                    : COLORS.primary
                        }
                    />
                ) : (
                    <Ionicons
                        name={icon}
                        size={
                            large
                                ? 35
                                : 29
                        }
                        color={
                            primary
                                ? '#111111'
                                : danger
                                    ? '#FF7777'
                                    : '#FFFFFF'
                        }
                    />
                )}

                <Text
                    numberOfLines={1}
                    style={{
                        color:
                            primary
                                ? '#111111'
                                : danger
                                    ? '#FF9999'
                                    : '#DADADA',

                        fontSize: 12,
                        fontWeight: '600',
                        marginTop: 3,
                    }}
                >
                    {loading ? '...' : label}
                </Text>
            </Pressable>
        );
    }

    function formatSessionDate(
        dateString: string
    ) {
        return new Date(
            dateString
        ).toLocaleDateString(
            'es-AR',
            {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
            }
        );
    }

    function formatSessionTime(
        dateString: string
    ) {
        return new Date(
            dateString
        ).toLocaleTimeString(
            'es-AR',
            {
                hour: '2-digit',
                minute: '2-digit',
            }
        );
    }

    function HistoryMetric({
        label,
        value,
    }: {
        label: string;
        value: string;
    }) {
        return (
            <View
                style={{
                    flexBasis: '47%',
                    flexGrow: 1,
                    backgroundColor:
                        '#181818',
                    borderRadius: 14,
                    padding: 12,
                }}
            >
                <Text
                    style={{
                        color: '#888888',
                        fontSize: 10,
                    }}
                >
                    {label}
                </Text>

                <Text
                    style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: '900',
                        marginTop: 3,
                    }}
                >
                    {value}
                </Text>
            </View>
        );
    }

    const fitMapToRoute = (
        from: {
            latitude: number;
            longitude: number;
        },
        to: {
            latitude: number;
            longitude: number;
        }
    ) => {
        if (!mapRef.current) return;

        const north =
            Math.max(
                from.latitude,
                to.latitude
            );

        const south =
            Math.min(
                from.latitude,
                to.latitude
            );

        const east =
            Math.max(
                from.longitude,
                to.longitude
            );

        const west =
            Math.min(
                from.longitude,
                to.longitude
            );

        mapRef.current.fitBounds(
            [east, north],
            [west, south],
            70,
            650
        );
    };

    const handleToggleFinishSelection = () => {
        /*
         * Si ya existe un destino,
         * tocar la bandera significa
         * querer eliminarlo.
         */
        if (finishPoint) {
            setConfirmClearFinishVisible(true);
            return;
        }

        const next =
            !isSelectingFinishPoint;

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

    const handleMapPressForFinishPoint =
        async (point: {
            latitude: number;
            longitude: number;
        }) => {
            if (!isSelectingFinishPoint) {
                return;
            }

            if (finishPoint) {
                return;
            }

            setPendingFinishPoint(point);
            setShowPendingFinishCard(true);

            if (currentPosition) {
                await fetchRoute(
                    currentPosition,
                    point
                );

                setTimeout(() => {
                    fitMapToRoute(
                        currentPosition,
                        point
                    );
                }, 100);
            }
        };

    const handleConfirmFinishPoint = () => {
        if (
            !pendingFinishPoint ||
            !currentPosition
        ) {
            return;
        }

        const confirmedPoint =
            pendingFinishPoint;

        setFinishPoint(
            confirmedPoint
        );

        setPendingFinishPoint(null);

        setShowPendingFinishCard(false);

        setIsSelectingFinishPoint(false);

        arrivalHandledRef.current =
            false;

        setTimeout(() => {
            fitMapToRoute(
                currentPosition,
                confirmedPoint
            );
        }, 100);
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
            setRecenterTick(
                (current) =>
                    current + 1
            );
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

        arrivalHandledRef.current =
            false;
    };

    const handleConfirmClearFinishPoint = () => {
        clearFinishGoalState();

        setTimeout(() => {
            setRecenterTick(
                (current) =>
                    current + 1
            );
        }, 100);
    };

    useEffect(() => {
        if (!isRunning) return;
        if (isPaused) return;
        if (!currentPosition) return;
        if (!finishPoint) return;
        if (arrivalModalVisible) return;

        const now =
            Date.now();

        const previousPosition =
            lastRouteRefreshPositionRef.current;

        const movedEnough =
            previousPosition
                ? haversineDistanceMeters(
                    {
                        latitude:
                            previousPosition.latitude,
                        longitude:
                            previousPosition.longitude,
                        timestamp: 0,
                    },
                    {
                        latitude:
                            currentPosition.latitude,
                        longitude:
                            currentPosition.longitude,
                        timestamp: 0,
                    }
                ) >= 35
                : true;

        const waitedEnough =
            now -
            lastRouteRefreshAtRef.current >=
            20000;

        if (
            movedEnough ||
            waitedEnough
        ) {
            void fetchRoute(
                currentPosition,
                finishPoint
            );
        }
    }, [
        currentPosition,
        finishPoint,
        isRunning,
        isPaused,
        arrivalModalVisible,
    ]);

    useEffect(() => {
        if (!isRunning) return;
        if (!finishPoint) return;

        if (
            arrivalHandledRef.current
        ) {
            return;
        }

        if (
            remainingRouteDistanceMeters ==
            null
        ) {
            return;
        }

        if (
            remainingRouteDistanceMeters <=
            25
        ) {
            arrivalHandledRef.current =
                true;

            setArrivalModalVisible(
                true
            );
        }
    }, [
        remainingRouteDistanceMeters,
        finishPoint,
        isRunning,
    ]);

    useEffect(() => {
        return () => {
            if (
                deletePromptTimerRef.current
            ) {
                clearTimeout(
                    deletePromptTimerRef.current
                );
            }

            if (
                dangerActionTimerRef.current
            ) {
                clearTimeout(
                    dangerActionTimerRef.current
                );
            }
        };
    }, []);

    const closeSessionSummary =
        async () => {
            await ensureRunSessionRatingBeforeClose();

            setSummaryVisible(false);
            setConfirmDeleteSummary(false);
            setLastSessionSummary(null);

            const shouldGoHome =
                pendingHomeAfterFinishRef.current;

            pendingHomeAfterFinishRef.current =
                false;

            if (shouldGoHome) {
                router.replace('/home');
            }
        };

    const openStatisticsFromSummary =
        async () => {
            await ensureRunSessionRatingBeforeClose();

            pendingHomeAfterFinishRef.current =
                false;

            setSummaryVisible(false);
            setLastSessionSummary(null);

            router.push('/statistics');
        };

    const deleteLastCompletedSession =
        async () => {
            const session =
                lastSessionSummary?.session;

            if (
                !session ||
                deletingSummarySession
            ) {
                return;
            }

            try {
                setDeletingSummarySession(true);

                await deleteRunSession(
                    session.id
                );

                /*
                 * La quitamos también del
                 * historial que ya está en memoria.
                 */
                setRunHistory(
                    (current) =>
                        current.filter(
                            (item) =>
                                item.id !==
                                session.id
                        )
                );

                setSummaryVisible(false);
                setLastSessionSummary(null);
                setConfirmDeleteSummary(false);

                /*
                 * Limpiamos la sesión visual
                 * que acaba de borrarse.
                 */
                await resetRun();
            } catch (error) {
                console.error(
                    'Error borrando sesión:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudo borrar la sesión.'
                );
            } finally {
                setDeletingSummarySession(false);
            }
        };

    const requestDangerousRunAction = (
        action: DangerousRunAction
    ) => {
        /*
         * Si no hay carrera activa,
         * Home y Reset funcionan normalmente.
         */
        if (!isRunningRef.current) {
            if (action === 'home') {
                router.replace('/home');
                return;
            }

            if (action === 'reset') {
                void resetRun();
                return;
            }
        }

        /*
         * Evitamos dos acciones simultáneas.
         */
        if (
            dangerLoadingAction ||
            dangerActionToConfirm
        ) {
            return;
        }

        setDangerLoadingAction(action);

        if (dangerActionTimerRef.current) {
            clearTimeout(
                dangerActionTimerRef.current
            );
        }

        dangerActionTimerRef.current =
            setTimeout(() => {
                dangerActionTimerRef.current =
                    null;

                setDangerLoadingAction(null);

                setDangerActionToConfirm(
                    action
                );
            }, 1000);
    };

    const confirmDangerousRunAction =
        async () => {
            const action =
                dangerActionToConfirm;

            if (!action) return;

            setDangerActionToConfirm(null);

            if (action === 'reset') {
                await resetRun();
                return;
            }

            if (action === 'finish') {
                await finishRun();
                return;
            }

            if (action === 'home') {
                /*
                 * No abandonamos la carrera.
                 * Primero la finalizamos y guardamos.
                 */
                pendingHomeAfterFinishRef.current =
                    true;

                await finishRun();
            }
        };

    const cancelDangerousRunAction = () => {
        setDangerActionToConfirm(null);
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: COLORS.background,
            }}
        >
            <View
                style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: 800,
                    alignSelf: 'center',
                    paddingHorizontal: 14,
                }}
            >
                {/* Logo */}

                <AppHeader profileGreeting={`Mar del Plata`} />

                {/* Mapa */}



                <View
                    style={{
                        flex: 1,
                        minHeight: 320,
                        borderRadius: 24,
                        marginTop: 15,
                        overflow: 'hidden',
                        borderWidth: 3,
                        borderColor: COLORS.primary,
                        backgroundColor: '#111111',
                    }}
                >
                    {loading && (
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ActivityIndicator
                                size="large"
                                color={COLORS.primary}
                            />

                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    marginTop: 10,
                                }}
                            >
                                Obteniendo ubicación...
                            </Text>
                        </View>
                    )}

                    {!loading && locationError && (
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 20,
                            }}
                        >
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    textAlign: 'center',
                                }}
                            >
                                {locationError}
                            </Text>
                        </View>
                    )}

                    {!loading &&
                        !locationError &&
                        currentPosition && (
                            <>
                                <LiveRunMap
                                    ref={mapRef}

                                    currentPosition={
                                        currentPosition
                                    }

                                    routePoints={
                                        routePoints
                                    }

                                    shouldFollowUser={
                                        isRunning &&
                                        !isPaused &&
                                        !isSelectingFinishPoint &&
                                        !pendingFinishPoint
                                    }

                                    zoomLevel={16}

                                    recenterTick={
                                        recenterTick
                                    }

                                    onMapPress={
                                        handleMapPressForFinishPoint
                                    }

                                    pendingFinishPoint={
                                        pendingFinishPoint
                                    }

                                    finishPoint={
                                        finishPoint
                                    }

                                    plannedRouteGeometry={
                                        plannedRouteGeometry
                                    }
                                />

                                {isPaused && (
                                    <View
                                        pointerEvents="none"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            bottom: 0,
                                            left: 0,
                                            right: 0,

                                            backgroundColor:
                                                'rgba(0,0,0,0.46)',

                                            alignItems: 'center',
                                            justifyContent: 'center',

                                            zIndex: 20,
                                        }}
                                    >
                                        <View
                                            style={{
                                                backgroundColor:
                                                    'rgba(15,15,15,0.94)',

                                                borderWidth: 1,
                                                borderColor: '#FFD36A',

                                                borderRadius: 22,

                                                paddingHorizontal: 28,
                                                paddingVertical: 18,

                                                alignItems: 'center',

                                                shadowColor: '#000000',
                                                shadowOpacity: 0.35,
                                                shadowRadius: 12,
                                            }}
                                        >
                                            <Ionicons
                                                name="pause-circle"
                                                size={46}
                                                color="#FFD36A"
                                            />

                                            <Text
                                                style={{
                                                    color: '#FFD36A',
                                                    fontSize: 22,
                                                    fontWeight: '900',
                                                    marginTop: 7,
                                                    letterSpacing: 1.2,
                                                }}
                                            >
                                                PAUSADO
                                            </Text>

                                            <Text
                                                style={{
                                                    color: '#BBBBBB',
                                                    fontSize: 11,
                                                    marginTop: 5,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Tiempo y recorrido detenidos
                                            </Text>

                                            <Text
                                                style={{
                                                    color: '#777777',
                                                    fontSize: 10,
                                                    marginTop: 3,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Tocá ▶ Reanudar para continuar
                                            </Text>
                                        </View>
                                    </View>
                                )}


                                <Pressable
                                    onPress={
                                        handleToggleFinishSelection
                                    }
                                    style={({ pressed }) => ({
                                        position: 'absolute',

                                        right: 14,

                                        // ARRIBA DE LA BRÚJULA
                                        bottom: 112,

                                        width: 46,
                                        height: 46,
                                        borderRadius: 23,

                                        backgroundColor:
                                            isSelectingFinishPoint ||
                                                finishPoint
                                                ? COLORS.primary
                                                : pressed
                                                    ? '#333333'
                                                    : 'rgba(17,17,17,0.92)',

                                        borderWidth: 1,
                                        borderColor:
                                            COLORS.primary,

                                        alignItems: 'center',
                                        justifyContent: 'center',

                                        zIndex: 30,

                                        shadowColor: '#000000',
                                        shadowOpacity: 0.25,
                                        shadowRadius: 5,
                                        elevation: 5,
                                    })}
                                >
                                    <View
                                        style={{
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FontAwesome6
                                            name="flag-checkered"
                                            size={18}
                                            color={
                                                isSelectingFinishPoint ||
                                                    finishPoint
                                                    ? '#111111'
                                                    : COLORS.primary
                                            }
                                        />

                                        {finishPoint && (
                                            <View
                                                style={{
                                                    position: 'absolute',

                                                    top: -9,
                                                    right: -10,

                                                    width: 17,
                                                    height: 17,
                                                    borderRadius: 9,

                                                    backgroundColor:
                                                        '#111111',

                                                    borderWidth: 1,
                                                    borderColor:
                                                        COLORS.primary,

                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'center',
                                                }}
                                            >
                                                <Ionicons
                                                    name="close"
                                                    size={11}
                                                    color={
                                                        COLORS.primary
                                                    }
                                                />
                                            </View>
                                        )}
                                    </View>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        setRecenterTick(
                                            (value) => value + 1
                                        )
                                    }
                                    style={({ pressed }) => ({
                                        position: 'absolute',

                                        right: 14,
                                        bottom: 58,

                                        width: 46,
                                        height: 46,
                                        borderRadius: 23,

                                        backgroundColor: pressed
                                            ? COLORS.primary
                                            : 'rgba(17,17,17,0.92)',

                                        borderWidth: 1,
                                        borderColor: COLORS.primary,

                                        alignItems: 'center',
                                        justifyContent: 'center',

                                        zIndex: 30,

                                        shadowColor: '#000000',
                                        shadowOpacity: 0.25,
                                        shadowRadius: 5,
                                        elevation: 5,
                                    })}
                                >
                                    {({ pressed }) => (
                                        <Ionicons
                                            name="compass-outline"
                                            size={25}
                                            color={
                                                pressed
                                                    ? '#111111'
                                                    : COLORS.primary
                                            }
                                        />
                                    )}
                                </Pressable>
                                {pendingFinishPoint &&
                                    showPendingFinishCard && (
                                        <View
                                            style={{
                                                position: 'absolute',

                                                top: 92,
                                                left: 30,
                                                right: 30,

                                                backgroundColor:
                                                    'rgba(17,17,17,0.96)',

                                                borderWidth: 1,
                                                borderColor:
                                                    COLORS.primary,

                                                borderRadius: 16,

                                                padding: 12,

                                                zIndex: 40,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textLight,
                                                    fontSize: 13,
                                                    fontWeight: '800',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                ¿Usar este punto como llegada?
                                            </Text>

                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,
                                                    fontSize: 11,
                                                    textAlign: 'center',
                                                    marginTop: 5,
                                                }}
                                            >
                                                {routeLoading
                                                    ? 'Calculando ruta...'
                                                    : plannedRouteDistanceMeters !=
                                                        null
                                                        ? `${formatDistance(
                                                            plannedRouteDistanceMeters
                                                        )} hasta el destino`
                                                        : 'Toca confirmar para continuar'}
                                            </Text>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    gap: 8,
                                                    marginTop: 10,
                                                }}
                                            >
                                                <Pressable
                                                    onPress={
                                                        handleCancelPendingFinishPoint
                                                    }
                                                    style={{
                                                        flex: 1,

                                                        paddingVertical: 10,

                                                        borderRadius: 12,

                                                        backgroundColor:
                                                            '#292929',

                                                        alignItems:
                                                            'center',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                '#FFFFFF',
                                                            fontWeight:
                                                                '700',
                                                        }}
                                                    >
                                                        Cancelar
                                                    </Text>
                                                </Pressable>

                                                <Pressable
                                                    onPress={
                                                        handleConfirmFinishPoint
                                                    }
                                                    disabled={
                                                        routeLoading
                                                    }
                                                    style={{
                                                        flex: 1,

                                                        paddingVertical: 10,

                                                        borderRadius: 12,

                                                        backgroundColor:
                                                            COLORS.primary,

                                                        alignItems:
                                                            'center',

                                                        opacity:
                                                            routeLoading
                                                                ? 0.5
                                                                : 1,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                '#111111',
                                                            fontWeight:
                                                                '900',
                                                        }}
                                                    >
                                                        Seleccionar
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    )}
                                {finishPoint &&
                                    remainingRouteDistanceMeters !=
                                    null && (
                                        <View
                                            pointerEvents="none"
                                            style={{
                                                position: 'absolute',

                                                top: 88,

                                                alignSelf: 'center',

                                                backgroundColor:
                                                    'rgba(17,17,17,0.92)',

                                                borderWidth: 1,
                                                borderColor:
                                                    COLORS.primary,

                                                borderRadius: 999,

                                                paddingHorizontal: 14,
                                                paddingVertical: 7,

                                                zIndex: 25,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textLight,
                                                    fontSize: 11,
                                                    fontWeight: '800',
                                                }}
                                            >
                                                🏁{' '}
                                                {formatDistance(
                                                    remainingRouteDistanceMeters
                                                )}{' '}
                                                restantes
                                            </Text>
                                        </View>
                                    )}
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: 'absolute',
                                        left: 12,
                                        right: 12,
                                        top: 12,

                                        backgroundColor:
                                            'rgba(17,17,17,0.92)',

                                        borderWidth: 1,
                                        borderColor:
                                            COLORS.primary,

                                        borderRadius: 16,

                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                COLORS.textLight,
                                            fontSize: 14,
                                            fontWeight: '800',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {isPaused
                                            ? 'Sesión pausada'
                                            : isRunning
                                                ? 'Sesión libre (en vivo)'
                                                : 'Sesión libre'}
                                    </Text>

                                    <View
                                        style={{
                                            flexDirection: 'row',

                                        }}
                                    >
                                        <Metric
                                            label="Tiempo"
                                            value={formatDuration(
                                                elapsedSeconds
                                            )}
                                        />

                                        <Metric
                                            label="Distancia"
                                            value={formatDistance(
                                                distanceMeters
                                            )}
                                        />

                                        <Metric
                                            label="Velocidad"
                                            value={formatSpeed(
                                                currentSpeedMps
                                            )}
                                        />

                                        <Metric
                                            label="Ritmo"
                                            value={formatPace(
                                                distanceMeters,
                                                elapsedSeconds
                                            )}
                                        />
                                    </View>
                                </View>

                                {/* Debug temporal */}

                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: 'absolute',
                                        left: 12,
                                        bottom: 12,
                                        backgroundColor:
                                            'rgba(17,17,17,0.88)',
                                        borderWidth: 1,
                                        borderColor:
                                            COLORS.primary,
                                        borderRadius: 12,
                                        paddingHorizontal: 10,
                                        paddingVertical: 7,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                COLORS.primary,
                                            fontSize: 11,
                                            fontWeight: '800',
                                        }}
                                    >
                                        GPS WEB BETA
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            marginTop: 3,
                                        }}
                                    >
                                        Lat:{' '}
                                        {currentPosition.latitude.toFixed(
                                            5
                                        )}
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                        }}
                                    >
                                        Lng:{' '}
                                        {currentPosition.longitude.toFixed(
                                            5
                                        )}
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#BBBBBB',
                                            fontSize: 10,
                                        }}
                                    >
                                        Precisión:{' '}
                                        {currentPosition.accuracy !=
                                            null
                                            ? `${Math.round(
                                                currentPosition.accuracy
                                            )} m`
                                            : '--'}
                                    </Text>
                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            marginTop: 2,
                                        }}
                                    >
                                        Estado:{' '}
                                        {isRunning
                                            ? 'CORRIENDO'
                                            : 'DETENIDO'}
                                    </Text>

                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                        }}
                                    >
                                        Puntos: {routePoints.length}
                                    </Text>

                                    <Text
                                        style={{
                                            color: COLORS.primary,
                                            fontSize: 10,
                                            fontWeight: '800',
                                        }}
                                    >
                                        Distancia:{' '}
                                        {formatDistance(distanceMeters)}
                                    </Text>
                                    <Text
                                        style={{
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                        }}
                                    >
                                        Cortes GPS: {gpsBreakCount}
                                    </Text>
                                    <Text
                                        style={{
                                            color:
                                                (currentPosition.accuracy ?? 999) <=
                                                    MAX_ROUTE_ACCURACY_METERS
                                                    ? COLORS.primary
                                                    : '#FFD36A',
                                            fontSize: 10,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {(currentPosition.accuracy ?? 999) <=
                                            MAX_ROUTE_ACCURACY_METERS
                                            ? 'GPS listo'
                                            : 'GPS ajustando precisión...'}
                                    </Text>
                                </View>
                            </>
                        )}
                </View>

                {isRunning &&
                    !isPaused &&
                    !screenLockMode && (
                        <Pressable
                            onPress={() =>
                                void enterScreenLockMode()
                            }
                            style={{
                                marginTop: 10,
                                backgroundColor: '#181818',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                                borderRadius: 14,
                                paddingVertical: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: COLORS.primary,
                                    fontSize: 14,
                                    fontWeight: '800',
                                }}
                            >
                                🔒 Activar modo carrera
                            </Text>

                            <Text
                                style={{
                                    color: '#AAAAAA',
                                    fontSize: 10,
                                    marginTop: 3,
                                }}
                            >
                                Mantiene la pantalla activa y evita toques accidentales
                            </Text>
                        </Pressable>
                    )}

                {/* Botones */}

                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 10,
                        marginBottom: 10,
                    }}
                >
                    {/* 1 — HOME */}
                    <BottomActionButton
                        icon="home-outline"
                        label="Volver"
                        loading={
                            dangerLoadingAction ===
                            'home'
                        }
                        onPress={() =>
                            requestDangerousRunAction(
                                'home'
                            )
                        }
                    />

                    {/* 2 — REINICIAR */}
                    <BottomActionButton
                        icon="refresh"
                        label="Reiniciar"
                        loading={
                            dangerLoadingAction ===
                            'reset'
                        }
                        onPress={() =>
                            requestDangerousRunAction(
                                'reset'
                            )
                        }
                    />

                    {/* 3 — BOTÓN CENTRAL */}
                    {!isRunning ? (
                        <BottomActionButton
                            icon="play"
                            label={
                                canStartRun
                                    ? 'Iniciar'
                                    : 'GPS'
                            }
                            primary
                            large
                            disabled={!canStartRun}
                            onPress={startRun}
                        />
                    ) : (
                        <BottomActionButton
                            icon={
                                isPaused
                                    ? 'play'
                                    : 'pause'
                            }
                            label={
                                isPaused
                                    ? 'Reanudar'
                                    : 'Pausar'
                            }
                            primary={isPaused}
                            large
                            onPress={
                                isPaused
                                    ? resumeRun
                                    : pauseRun
                            }
                        />
                    )}

                    {/* 4 — ESTADÍSTICAS / FINALIZAR */}
                    {!isRunning ? (
                        <BottomActionButton
                            icon="stats-chart-outline"
                            label="Métricas"
                            onPress={() =>
                                router.push('/statistics')
                            }
                        />
                    ) : (
                        <BottomActionButton
                            icon="stop"
                            label="Finalizar"
                            danger
                            loading={
                                dangerLoadingAction ===
                                'finish'
                            }
                            onPress={() =>
                                requestDangerousRunAction(
                                    'finish'
                                )
                            }
                        />
                    )}

                    {/* 5 — HISTORIAL */}
                    <BottomActionButton
                        icon="time-outline"
                        label="Historial"
                        onPress={() =>
                            void toggleHistory()
                        }
                    />
                </View>

                {screenLockMode && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,

                            backgroundColor: '#000000',

                            alignItems: 'center',
                            justifyContent: 'center',

                            zIndex: 9999,
                            elevation: 9999,

                            padding: 30,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.primary,
                                fontSize: 14,
                                fontWeight: '900',
                                marginBottom: 30,
                                letterSpacing: 1,
                            }}
                        >
                            MARDEL FITNESS
                        </Text>

                        <Text
                            style={{
                                fontSize: 38,
                                marginBottom: 14,
                            }}
                        >
                            🔒
                        </Text>

                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 36,
                                fontWeight: '900',
                            }}
                        >
                            {formatDuration(
                                elapsedSeconds
                            )}
                        </Text>

                        <Text
                            style={{
                                color: '#777777',
                                fontSize: 11,
                                marginTop: 3,
                            }}
                        >
                            TIEMPO
                        </Text>

                        <View
                            style={{
                                width: '100%',
                                maxWidth: 330,

                                flexDirection: 'row',

                                marginTop: 28,
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#888888',
                                        fontSize: 10,
                                    }}
                                >
                                    DISTANCIA
                                </Text>

                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontSize: 21,
                                        fontWeight: '900',
                                        marginTop: 4,
                                    }}
                                >
                                    {formatDistance(
                                        distanceMeters
                                    )}
                                </Text>
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#888888',
                                        fontSize: 10,
                                    }}
                                >
                                    VELOCIDAD
                                </Text>

                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontSize: 21,
                                        fontWeight: '900',
                                        marginTop: 4,
                                    }}
                                >
                                    {formatSpeed(
                                        currentSpeedMps
                                    )}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                marginTop: 22,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#888888',
                                    fontSize: 10,
                                }}
                            >
                                RITMO
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.primary,
                                    fontSize: 22,
                                    fontWeight: '900',
                                    marginTop: 4,
                                }}
                            >
                                {formatPace(
                                    distanceMeters,
                                    elapsedSeconds
                                )}
                            </Text>
                        </View>

                        <Text
                            style={{
                                color: '#888888',
                                fontSize: 12,
                                marginTop: 7,
                            }}
                        >
                            Carrera en curso
                        </Text>

                        <View
                            style={{
                                marginTop: 24,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 999,
                                backgroundColor:
                                    wakeLockActive
                                        ? '#162000'
                                        : '#251111',
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        wakeLockActive
                                            ? COLORS.primary
                                            : '#FF7777',

                                    fontSize: 11,
                                    fontWeight: '800',
                                }}
                            >
                                {wakeLockActive
                                    ? '● Pantalla protegida'
                                    : '● Wake Lock inactivo'}
                            </Text>
                        </View>

                        {wakeLockMessage && (
                            <Text
                                style={{
                                    color: '#FF9999',
                                    fontSize: 10,
                                    textAlign: 'center',
                                    marginTop: 10,
                                }}
                            >
                                {wakeLockMessage}
                            </Text>
                        )}

                        <Pressable
                            onPressIn={
                                startUnlockHold
                            }
                            onPressOut={
                                cancelUnlockHold
                            }
                            style={{
                                marginTop: 50,
                                width: '100%',
                                maxWidth: 300,

                                borderWidth: 1,
                                borderColor:
                                    unlockHolding
                                        ? COLORS.primary
                                        : '#333333',

                                backgroundColor:
                                    unlockHolding
                                        ? '#182300'
                                        : '#111111',

                                borderRadius: 22,
                                paddingVertical: 22,
                                paddingHorizontal: 20,
                                alignItems: 'center',

                                // WEB: impedir selección durante pulsación larga
                                userSelect: 'none',

                                // Safari/iPhone
                                WebkitUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                            } as any}
                        >
                            <Text
                                selectable={false}
                                pointerEvents="none"
                                style={{
                                    color:
                                        unlockHolding
                                            ? COLORS.primary
                                            : '#FFFFFF',

                                    fontSize: 15,
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    userSelect: 'none',
                                }}
                            >
                                {unlockHolding
                                    ? 'Seguí presionando...'
                                    : 'Mantener presionado'}
                            </Text>

                            <Text
                                selectable={false}
                                pointerEvents="none"
                                style={{
                                    color: '#888888',
                                    fontSize: 11,
                                    marginTop: 5,
                                    userSelect: 'none',
                                }}
                            >
                                5 segundos para desbloquear
                            </Text>
                        </Pressable>

                        <Text
                            style={{
                                color: '#555555',
                                fontSize: 10,
                                textAlign: 'center',
                                marginTop: 30,
                                lineHeight: 15,
                            }}
                        >
                            No uses el botón lateral del teléfono durante la carrera.
                        </Text>
                    </View>
                )}

            </View>
            <Modal
                visible={historyVisible}
                transparent
                animationType="fade"
                onRequestClose={
                    closeHistoryModal
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.78)',

                        justifyContent: 'center',
                        alignItems: 'center',

                        padding: 18,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 390,

                            maxHeight: '82%',

                            backgroundColor:
                                '#101010',

                            borderRadius: 22,

                            borderWidth: 1,
                            borderColor:
                                '#303030',

                            paddingHorizontal: 14,
                            paddingTop: 12,
                            paddingBottom: 12,

                            overflow: 'hidden',
                        }}
                    >
                        {/* PEQUEÑO INDICADOR SUPERIOR */}

                        <View
                            style={{
                                width: 40,
                                height: 4,

                                backgroundColor:
                                    '#3A3A3A',

                                borderRadius: 999,

                                alignSelf: 'center',

                                marginBottom: 11,
                            }}
                        />

                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',

                                marginBottom: 12,
                            }}
                        >
                            {selectedHistorySession && (
                                <Pressable
                                    onPress={() => {
                                        setSelectedHistorySession(
                                            null
                                        );

                                        setHistoryDeleteConfirm(
                                            false
                                        );
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,

                                        borderRadius: 18,

                                        backgroundColor:
                                            '#1D1D1D',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',

                                        marginRight: 9,
                                    }}
                                >
                                    <Ionicons
                                        name="arrow-back"
                                        size={19}
                                        color="#CCCCCC"
                                    />
                                </Pressable>
                            )}

                            <View
                                style={{
                                    flex: 1,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',

                                        fontSize: 17,

                                        fontWeight: '900',
                                    }}
                                >
                                    {selectedHistorySession
                                        ? 'Detalle de sesión'
                                        : 'Historial de carreras'}
                                </Text>

                                <Text
                                    style={{
                                        color: '#777777',

                                        fontSize: 10,

                                        marginTop: 2,
                                    }}
                                >
                                    {selectedHistorySession
                                        ? formatSessionDate(
                                            selectedHistorySession
                                                .startedAt
                                        )
                                        : 'Últimas 10 sesiones'}
                                </Text>
                            </View>

                            {!selectedHistorySession &&
                                !historyLoading && (
                                    <View
                                        style={{
                                            minWidth: 27,
                                            height: 27,

                                            borderRadius:
                                                999,

                                            backgroundColor:
                                                '#1C1C1C',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',

                                            paddingHorizontal:
                                                7,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    COLORS.primary,

                                                fontSize:
                                                    10,

                                                fontWeight:
                                                    '900',
                                            }}
                                        >
                                            {
                                                runHistory.length
                                            }
                                        </Text>
                                    </View>
                                )}
                        </View>

                        {/* CONTENIDO */}

                        {historyLoading ? (
                            <View
                                style={{
                                    minHeight: 160,

                                    alignItems: 'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="large"
                                    color={
                                        COLORS.primary
                                    }
                                />

                                <Text
                                    style={{
                                        color: '#999999',

                                        fontSize: 11,

                                        marginTop: 10,
                                    }}
                                >
                                    Cargando sesiones...
                                </Text>
                            </View>
                        ) : historyError ? (
                            <View
                                style={{
                                    minHeight: 130,

                                    alignItems: 'center',

                                    justifyContent:
                                        'center',

                                    paddingHorizontal:
                                        20,
                                }}
                            >
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={28}
                                    color="#FF9999"
                                />

                                <Text
                                    style={{
                                        color: '#BBBBBB',

                                        fontSize: 11,

                                        textAlign:
                                            'center',

                                        marginTop: 8,
                                    }}
                                >
                                    {historyError}
                                </Text>
                            </View>
                        ) : !selectedHistorySession ? (
                            /*
                             * LISTADO COMPACTO
                             */
                            <ScrollView
                                showsVerticalScrollIndicator={
                                    false
                                }
                                style={{
                                    maxHeight: 390,
                                }}
                            >
                                {runHistory.length ===
                                    0 ? (
                                    <View
                                        style={{
                                            minHeight:
                                                130,

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',
                                        }}
                                    >
                                        <Ionicons
                                            name="walk-outline"
                                            size={28}
                                            color="#666666"
                                        />

                                        <Text
                                            style={{
                                                color:
                                                    '#888888',

                                                fontSize:
                                                    11,

                                                marginTop:
                                                    8,
                                            }}
                                        >
                                            Todavía no hay
                                            sesiones guardadas.
                                        </Text>
                                    </View>
                                ) : (
                                    runHistory.map(
                                        (
                                            session,
                                            index
                                        ) => (
                                            <Pressable
                                                key={
                                                    session.id
                                                }
                                                onPress={() =>
                                                    setSelectedHistorySession(
                                                        session
                                                    )
                                                }
                                                style={({
                                                    pressed,
                                                }) => ({
                                                    height:
                                                        48,

                                                    flexDirection:
                                                        'row',

                                                    alignItems:
                                                        'center',

                                                    paddingHorizontal:
                                                        10,

                                                    borderRadius:
                                                        12,

                                                    backgroundColor:
                                                        pressed
                                                            ? '#252525'
                                                            : index %
                                                                2 ===
                                                                0
                                                                ? '#181818'
                                                                : '#151515',

                                                    marginBottom:
                                                        5,

                                                    borderWidth:
                                                        1,

                                                    borderColor:
                                                        '#252525',
                                                })}
                                            >
                                                {/* FECHA */}

                                                <View
                                                    style={{
                                                        flex: 1,

                                                        minWidth:
                                                            0,
                                                    }}
                                                >
                                                    <Text
                                                        numberOfLines={
                                                            1
                                                        }
                                                        style={{
                                                            color:
                                                                '#E5E5E5',

                                                            fontSize:
                                                                11,

                                                            fontWeight:
                                                                '700',
                                                        }}
                                                    >
                                                        {formatSessionDate(
                                                            session.startedAt
                                                        )}
                                                        {' · '}
                                                        {formatSessionTime(
                                                            session.startedAt
                                                        )}
                                                    </Text>
                                                </View>

                                                {/* DISTANCIA */}

                                                <Text
                                                    numberOfLines={
                                                        1
                                                    }
                                                    style={{
                                                        width: 70,

                                                        color:
                                                            COLORS.primary,

                                                        fontSize:
                                                            10,

                                                        fontWeight:
                                                            '800',

                                                        textAlign:
                                                            'right',
                                                    }}
                                                >
                                                    {formatDistance(
                                                        session.distanceMeters
                                                    )}
                                                </Text>

                                                {/* TIEMPO */}

                                                <Text
                                                    numberOfLines={
                                                        1
                                                    }
                                                    style={{
                                                        width: 68,

                                                        color:
                                                            '#AAAAAA',

                                                        fontSize:
                                                            10,

                                                        fontWeight:
                                                            '700',

                                                        textAlign:
                                                            'right',

                                                        marginLeft:
                                                            5,
                                                    }}
                                                >
                                                    {formatDuration(
                                                        session.durationSeconds
                                                    )}
                                                </Text>

                                                <Ionicons
                                                    name="chevron-forward"
                                                    size={15}
                                                    color="#666666"

                                                    style={{
                                                        marginLeft:
                                                            5,
                                                    }}
                                                />
                                            </Pressable>
                                        )
                                    )
                                )}
                            </ScrollView>
                        ) : (
                            /*
                             * DETALLE
                             */
                            <ScrollView
                                showsVerticalScrollIndicator={
                                    false
                                }
                                style={{
                                    maxHeight: 475,
                                }}
                            >
                                <HistorySessionMapPreview
                                    session={
                                        selectedHistorySession
                                    }
                                    height={185}
                                />

                                <View
                                    style={{
                                        flexDirection:
                                            'row',

                                        flexWrap:
                                            'wrap',

                                        marginTop: 10,

                                        gap: 8,
                                    }}
                                >
                                    <HistoryMetric
                                        label="Distancia"
                                        value={formatDistance(
                                            selectedHistorySession
                                                .distanceMeters
                                        )}
                                    />

                                    <HistoryMetric
                                        label="Tiempo"
                                        value={formatDuration(
                                            selectedHistorySession
                                                .durationSeconds
                                        )}
                                    />

                                    <HistoryMetric
                                        label="Ritmo"
                                        value={
                                            selectedHistorySession
                                                .avgPaceSecPerKm !=
                                                null
                                                ? formatPace(
                                                    selectedHistorySession
                                                        .distanceMeters,

                                                    selectedHistorySession
                                                        .durationSeconds
                                                )
                                                : '--'
                                        }
                                    />

                                    <HistoryMetric
                                        label="Vel. máx."
                                        value={formatSpeed(
                                            selectedHistorySession
                                                .maxSpeedMps
                                        )}
                                    />
                                </View>

                                {/* BORRAR SESIÓN */}

                                {!historyDeleteConfirm ? (
                                    <Pressable
                                        onPress={() =>
                                            setHistoryDeleteConfirm(
                                                true
                                            )
                                        }
                                        style={{
                                            marginTop: 10,

                                            height: 42,

                                            borderRadius: 12,

                                            backgroundColor:
                                                '#1E1515',

                                            borderWidth: 1,

                                            borderColor:
                                                '#4B2B2B',

                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',

                                            gap: 7,
                                        }}
                                    >
                                        <Ionicons
                                            name="trash-outline"
                                            size={16}
                                            color="#D98C8C"
                                        />

                                        <Text
                                            style={{
                                                color:
                                                    '#D98C8C',

                                                fontSize:
                                                    11,

                                                fontWeight:
                                                    '800',
                                            }}
                                        >
                                            Eliminar sesión
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <View
                                        style={{
                                            marginTop: 10,

                                            backgroundColor:
                                                '#201313',

                                            borderWidth: 1,

                                            borderColor:
                                                '#543030',

                                            borderRadius:
                                                14,

                                            padding: 11,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    '#E0B0B0',

                                                textAlign:
                                                    'center',

                                                fontSize:
                                                    11,

                                                fontWeight:
                                                    '700',
                                            }}
                                        >
                                            ¿Eliminar definitivamente esta sesión?
                                        </Text>

                                        <View
                                            style={{
                                                flexDirection:
                                                    'row',

                                                gap: 8,

                                                marginTop:
                                                    9,
                                            }}
                                        >
                                            <Pressable
                                                onPress={() =>
                                                    setHistoryDeleteConfirm(
                                                        false
                                                    )
                                                }
                                                style={{
                                                    flex: 1,

                                                    height:
                                                        38,

                                                    borderRadius:
                                                        11,

                                                    backgroundColor:
                                                        '#282828',

                                                    alignItems:
                                                        'center',

                                                    justifyContent:
                                                        'center',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color:
                                                            '#CCCCCC',

                                                        fontSize:
                                                            11,

                                                        fontWeight:
                                                            '700',
                                                    }}
                                                >
                                                    Cancelar
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() =>
                                                    void deleteSelectedHistorySession()
                                                }
                                                disabled={
                                                    historyDeleting
                                                }
                                                style={{
                                                    flex: 1,

                                                    height:
                                                        38,

                                                    borderRadius:
                                                        11,

                                                    backgroundColor:
                                                        '#6F2020',

                                                    alignItems:
                                                        'center',

                                                    justifyContent:
                                                        'center',

                                                    opacity:
                                                        historyDeleting
                                                            ? 0.6
                                                            : 1,
                                                }}
                                            >
                                                {historyDeleting ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="#FFFFFF"
                                                    />
                                                ) : (
                                                    <Text
                                                        style={{
                                                            color:
                                                                '#FFFFFF',

                                                            fontSize:
                                                                11,

                                                            fontWeight:
                                                                '900',
                                                        }}
                                                    >
                                                        Eliminar
                                                    </Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        {/* FOOTER */}

                        <View
                            style={{
                                borderTopWidth: 1,

                                borderTopColor:
                                    '#252525',

                                marginTop: 11,

                                paddingTop: 10,
                            }}
                        >
                            <Pressable
                                onPress={
                                    closeHistoryModal
                                }
                                style={({
                                    pressed,
                                }) => ({
                                    height: 42,

                                    borderRadius: 13,

                                    backgroundColor:
                                        pressed
                                            ? '#292929'
                                            : '#1C1C1C',

                                    borderWidth: 1,

                                    borderColor:
                                        '#303030',

                                    flexDirection:
                                        'row',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    gap: 6,
                                })}
                            >
                                <Ionicons
                                    name="close"
                                    size={17}
                                    color="#888888"
                                />

                                <Text
                                    style={{
                                        color: '#AAAAAA',

                                        fontSize: 11,

                                        fontWeight: '700',
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
                visible={
                    confirmClearFinishVisible
                }
                transparent
                animationType="fade"
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor:
                            'rgba(0,0,0,0.70)',
                        justifyContent:
                            'center',
                        alignItems:
                            'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 330,

                            backgroundColor:
                                '#101010',

                            borderRadius: 22,

                            borderWidth: 1,
                            borderColor:
                                COLORS.primary,

                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 17,
                                fontWeight: '800',
                                textAlign: 'center',
                            }}
                        >
                            ¿Cancelar punto de llegada?
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 18,
                            }}
                        >
                            <Pressable
                                onPress={() =>
                                    setConfirmClearFinishVisible(
                                        false
                                    )
                                }
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        '#292929',
                                    borderRadius: 14,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontWeight: '700',
                                    }}
                                >
                                    Mantener
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={
                                    handleConfirmClearFinishPoint
                                }
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        COLORS.primary,
                                    borderRadius: 14,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontWeight: '900',
                                    }}
                                >
                                    Eliminar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={
                    arrivalModalVisible
                }
                transparent
                animationType="fade"
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor:
                            'rgba(0,0,0,0.72)',
                        justifyContent:
                            'center',
                        alignItems:
                            'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,

                            backgroundColor:
                                '#101010',

                            borderRadius: 22,

                            borderWidth: 1,
                            borderColor:
                                COLORS.primary,

                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color:
                                    COLORS.primary,
                                fontSize: 21,
                                fontWeight: '900',
                                textAlign: 'center',
                            }}
                        >
                            🏁 ¡Llegaste!
                        </Text>

                        <Text
                            style={{
                                color: '#AAAAAA',
                                fontSize: 13,
                                lineHeight: 19,
                                textAlign: 'center',
                                marginTop: 8,
                            }}
                        >
                            Alcanzaste el punto de llegada seleccionado.
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 18,
                            }}
                        >
                            <Pressable
                                onPress={() => {
                                    setArrivalModalVisible(
                                        false
                                    );

                                    clearFinishGoalState();
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        '#292929',
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontWeight: '700',
                                    }}
                                >
                                    Continuar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={async () => {
                                    setArrivalModalVisible(
                                        false
                                    );

                                    clearFinishGoalState();

                                    await finishRun();
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        COLORS.primary,
                                    paddingVertical: 13,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontWeight: '900',
                                    }}
                                >
                                    Finalizar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={summaryVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    void closeSessionSummary();
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor:
                            'rgba(0,0,0,0.82)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 16,
                    }}
                >
                    <View
                        style={{
                            width: '95%',
                            maxWidth: 420,
                            maxHeight: '92%',

                            backgroundColor:
                                '#101010',

                            borderRadius: 26,

                            borderWidth: 3,
                            borderColor:
                                COLORS.primary,

                            padding: 16,
                        }}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={
                                false
                            }
                        >
                            {/* ENCABEZADO */}

                            <View
                                style={{
                                    alignItems: 'center',
                                    marginBottom: 14,
                                }}
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={34}
                                    color={COLORS.primary}
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,
                                        fontSize: 21,
                                        fontWeight: '900',
                                        marginTop: 6,
                                    }}
                                >
                                    Sesión finalizada
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,
                                        fontSize: 11,
                                        marginTop: 3,
                                    }}
                                >
                                    Carrera guardada correctamente
                                </Text>
                            </View>

                            {lastSessionSummary && (
                                <>
                                    {/* MAPA */}

                                    <HistorySessionMapPreview
                                        session={
                                            lastSessionSummary.session
                                        }
                                    />

                                    {/* MÉTRICAS */}

                                    <View
                                        style={{
                                            flexDirection:
                                                'row',
                                            flexWrap:
                                                'wrap',
                                            gap: 10,
                                            marginTop: 14,
                                        }}
                                    >
                                        <HistoryMetric
                                            label="Tiempo"
                                            value={formatDuration(
                                                lastSessionSummary
                                                    .session
                                                    .durationSeconds
                                            )}
                                        />

                                        <HistoryMetric
                                            label="Distancia"
                                            value={formatDistance(
                                                lastSessionSummary
                                                    .session
                                                    .distanceMeters
                                            )}
                                        />

                                        <HistoryMetric
                                            label="Ritmo promedio"
                                            value={
                                                lastSessionSummary
                                                    .session
                                                    .avgPaceSecPerKm !=
                                                    null
                                                    ? formatPace(
                                                        lastSessionSummary
                                                            .session
                                                            .distanceMeters,

                                                        lastSessionSummary
                                                            .session
                                                            .durationSeconds
                                                    )
                                                    : '--'
                                            }
                                        />

                                        <HistoryMetric
                                            label="Vel. máxima"
                                            value={formatSpeed(
                                                lastSessionSummary
                                                    .session
                                                    .maxSpeedMps
                                            )}
                                        />
                                    </View>



                                    {/* VALORACIÓN */}

                                    <View
                                        style={{
                                            marginTop: 14,

                                            backgroundColor:
                                                '#151515',

                                            borderWidth: 1,
                                            borderColor:
                                                '#303030',

                                            borderRadius: 18,

                                            padding: 12,
                                        }}
                                    >
                                        {!runSessionRatingSaved && (
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textLight,

                                                    fontSize: 13,
                                                    fontWeight: '800',
                                                    textAlign: 'center',
                                                    marginBottom: 10,
                                                }}
                                            >
                                                ¿Cómo te fue en la carrera de hoy?
                                            </Text>
                                        )}

                                        {runSessionRatingLoading ? (
                                            <View
                                                style={{
                                                    alignItems:
                                                        'center',
                                                    paddingVertical:
                                                        8,
                                                }}
                                            >
                                                <ActivityIndicator
                                                    size="small"
                                                    color={
                                                        COLORS.primary
                                                    }
                                                />

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textMuted,
                                                        fontSize: 10,
                                                        marginTop: 5,
                                                    }}
                                                >
                                                    Guardando valoración...
                                                </Text>
                                            </View>
                                        ) : runSessionRatingSaved ? (
                                            <View
                                                style={{
                                                    alignItems:
                                                        'center',
                                                    paddingVertical:
                                                        6,
                                                }}
                                            >
                                                <Ionicons
                                                    name="checkmark-circle-outline"
                                                    size={21}
                                                    color={
                                                        COLORS.primary
                                                    }
                                                />

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.primary,
                                                        fontSize: 12,
                                                        fontWeight:
                                                            '800',
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    Valoración guardada
                                                </Text>

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textMuted,
                                                        fontSize: 10,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Esfuerzo: {
                                                        runSessionRating
                                                    }/10
                                                </Text>
                                            </View>
                                        ) : (
                                            <>
                                                <View
                                                    style={{
                                                        flexDirection:
                                                            'row',
                                                        justifyContent:
                                                            'center',
                                                        flexWrap:
                                                            'wrap',
                                                        gap: 5,
                                                    }}
                                                >
                                                    {Array.from(
                                                        {
                                                            length: 10,
                                                        },
                                                        (
                                                            _,
                                                            index
                                                        ) => {
                                                            const value =
                                                                index +
                                                                1;

                                                            const selected =
                                                                runSessionRating ===
                                                                value;

                                                            return (
                                                                <Pressable
                                                                    key={
                                                                        value
                                                                    }
                                                                    onPress={() =>
                                                                        void handleRateLastRunSession(
                                                                            value
                                                                        )
                                                                    }
                                                                    style={{
                                                                        width: 27,
                                                                        height: 27,

                                                                        borderRadius: 7,

                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',

                                                                        backgroundColor:
                                                                            selected
                                                                                ? COLORS.primary
                                                                                : value <=
                                                                                    3
                                                                                    ? '#7F1D1D'
                                                                                    : value <=
                                                                                        7
                                                                                        ? '#3F3F46'
                                                                                        : '#3F6212',
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                selected
                                                                                    ? '#111111'
                                                                                    : '#FFFFFF',

                                                                            fontSize:
                                                                                11,

                                                                            fontWeight:
                                                                                '900',
                                                                        }}
                                                                    >
                                                                        {
                                                                            value
                                                                        }
                                                                    </Text>
                                                                </Pressable>
                                                            );
                                                        }
                                                    )}
                                                </View>

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textMuted,

                                                        fontSize: 9,

                                                        textAlign:
                                                            'center',

                                                        marginTop: 8,
                                                    }}
                                                >
                                                    Si no calificás, se guardará 6 automáticamente.
                                                </Text>
                                            </>
                                        )}
                                    </View>

                                    {/* BORRADO */}

                                    {confirmDeleteSummary ? (
                                        <View
                                            style={{
                                                marginTop: 14,
                                                backgroundColor:
                                                    '#211111',

                                                borderWidth: 1,
                                                borderColor:
                                                    '#7F1D1D',

                                                borderRadius: 16,
                                                padding: 12,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        '#FFB4B4',

                                                    textAlign:
                                                        'center',

                                                    fontSize: 12,
                                                    fontWeight:
                                                        '800',
                                                }}
                                            >
                                                ¿Eliminar definitivamente esta sesión?
                                            </Text>

                                            <View
                                                style={{
                                                    flexDirection:
                                                        'row',
                                                    gap: 8,
                                                    marginTop: 10,
                                                }}
                                            >
                                                <Pressable
                                                    onPress={() =>
                                                        setConfirmDeleteSummary(
                                                            false
                                                        )
                                                    }
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            '#292929',

                                                        paddingVertical:
                                                            11,

                                                        borderRadius:
                                                            12,

                                                        alignItems:
                                                            'center',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                '#FFFFFF',

                                                            fontWeight:
                                                                '700',
                                                        }}
                                                    >
                                                        Cancelar
                                                    </Text>
                                                </Pressable>

                                                <Pressable
                                                    onPress={() =>
                                                        void deleteLastCompletedSession()
                                                    }
                                                    disabled={
                                                        deletingSummarySession
                                                    }
                                                    style={{
                                                        flex: 1,

                                                        backgroundColor:
                                                            '#7F1D1D',

                                                        paddingVertical:
                                                            11,

                                                        borderRadius:
                                                            12,

                                                        alignItems:
                                                            'center',

                                                        opacity:
                                                            deletingSummarySession
                                                                ? 0.6
                                                                : 1,
                                                    }}
                                                >
                                                    {deletingSummarySession ? (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color="#FFFFFF"
                                                        />
                                                    ) : (
                                                        <Text
                                                            style={{
                                                                color:
                                                                    '#FFFFFF',

                                                                fontWeight:
                                                                    '900',
                                                            }}
                                                        >
                                                            Eliminar
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            {/* ACCIONES */}

                                            <View
                                                style={{
                                                    flexDirection:
                                                        'row',
                                                    gap: 9,
                                                    marginTop: 14,
                                                }}
                                            >
                                                <Pressable
                                                    onPress={
                                                        requestDeleteSummaryConfirmation
                                                    }
                                                    disabled={deletePromptLoading}
                                                    style={{
                                                        flex: 1,

                                                        backgroundColor:
                                                            '#211111',

                                                        borderWidth: 1,
                                                        borderColor:
                                                            '#633333',

                                                        paddingVertical:
                                                            12,

                                                        borderRadius:
                                                            14,

                                                        alignItems:
                                                            'center',
                                                    }}
                                                >
                                                    {deletePromptLoading ? (
                                                        <>
                                                            <ActivityIndicator
                                                                size="small"
                                                                color="#FF9999"
                                                            />

                                                            <Text
                                                                style={{
                                                                    color: '#FF9999',
                                                                    fontSize: 10,
                                                                    fontWeight: '800',
                                                                    marginTop: 4,
                                                                }}
                                                            >
                                                                Preparando...
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Ionicons
                                                                name="trash-outline"
                                                                size={18}
                                                                color="#FF9999"
                                                            />

                                                            <Text
                                                                style={{
                                                                    color: '#FF9999',
                                                                    fontSize: 11,
                                                                    fontWeight: '800',
                                                                    marginTop: 3,
                                                                }}
                                                            >
                                                                Borrar
                                                            </Text>
                                                        </>
                                                    )}
                                                </Pressable>

                                                <Pressable
                                                    onPress={() =>
                                                        void openStatisticsFromSummary()
                                                    }
                                                    style={{
                                                        flex: 1,

                                                        backgroundColor:
                                                            '#202020',

                                                        borderWidth: 1,
                                                        borderColor:
                                                            '#383838',

                                                        paddingVertical:
                                                            12,

                                                        borderRadius:
                                                            14,

                                                        alignItems:
                                                            'center',
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="stats-chart-outline"
                                                        size={18}
                                                        color={
                                                            COLORS.primary
                                                        }
                                                    />

                                                    <Text
                                                        style={{
                                                            color:
                                                                COLORS.textLight,

                                                            fontSize: 11,
                                                            fontWeight:
                                                                '800',

                                                            marginTop: 3,
                                                        }}
                                                    >
                                                        Ver métricas
                                                    </Text>
                                                </Pressable>
                                            </View>

                                            {/* CERRAR */}

                                            <Pressable
                                                onPress={() =>
                                                    void closeSessionSummary()
                                                }
                                                style={{
                                                    marginTop: 10,

                                                    backgroundColor:
                                                        COLORS.primary,

                                                    paddingVertical: 14,

                                                    borderRadius: 16,

                                                    alignItems:
                                                        'center',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color:
                                                            '#111111',

                                                        fontSize: 14,

                                                        fontWeight:
                                                            '900',
                                                    }}
                                                >
                                                    Cerrar
                                                </Text>
                                            </Pressable>
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={
                    dangerActionToConfirm != null
                }
                transparent
                animationType="fade"
                onRequestClose={
                    cancelDangerousRunAction
                }
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor:
                            'rgba(0,0,0,0.78)',

                        justifyContent:
                            'center',

                        alignItems:
                            'center',

                        padding: 22,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 350,

                            backgroundColor:
                                '#101010',

                            borderWidth: 1,
                            borderColor:
                                dangerActionToConfirm ===
                                    'finish'
                                    ? '#704040'
                                    : COLORS.primary,

                            borderRadius: 24,

                            padding: 18,
                        }}
                    >
                        <View
                            style={{
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons
                                name={
                                    dangerActionToConfirm ===
                                        'home'
                                        ? 'home-outline'
                                        : dangerActionToConfirm ===
                                            'reset'
                                            ? 'refresh'
                                            : 'stop-circle-outline'
                                }
                                size={34}
                                color={
                                    dangerActionToConfirm ===
                                        'finish'
                                        ? '#FF7777'
                                        : COLORS.primary
                                }
                            />

                            <Text
                                style={{
                                    color: '#FFFFFF',

                                    fontSize: 18,

                                    fontWeight: '900',

                                    textAlign: 'center',

                                    marginTop: 10,
                                }}
                            >
                                {dangerActionToConfirm ===
                                    'home'
                                    ? 'Carrera en curso'
                                    : dangerActionToConfirm ===
                                        'reset'
                                        ? '¿Reiniciar carrera?'
                                        : '¿Finalizar carrera?'}
                            </Text>

                            <Text
                                style={{
                                    color:
                                        COLORS.textMuted,

                                    fontSize: 12,

                                    lineHeight: 18,

                                    textAlign: 'center',

                                    marginTop: 8,
                                }}
                            >
                                {dangerActionToConfirm ===
                                    'home'
                                    ? 'Antes de volver al Home vamos a finalizar y guardar la sesión actual.'
                                    : dangerActionToConfirm ===
                                        'reset'
                                        ? 'Se borrarán el tiempo, la distancia y la ruta actuales. La carrera continuará nuevamente desde cero.'
                                        : 'Se detendrá el registro GPS, se guardará la sesión y aparecerá el resumen final.'}
                            </Text>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',

                                gap: 10,

                                marginTop: 20,
                            }}
                        >
                            <Pressable
                                onPress={
                                    cancelDangerousRunAction
                                }
                                style={{
                                    flex: 1,

                                    backgroundColor:
                                        '#292929',

                                    borderRadius: 14,

                                    paddingVertical: 13,

                                    alignItems:
                                        'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',

                                        fontWeight:
                                            '800',
                                    }}
                                >
                                    Continuar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() =>
                                    void confirmDangerousRunAction()
                                }
                                style={{
                                    flex: 1,

                                    backgroundColor:
                                        dangerActionToConfirm ===
                                            'finish'
                                            ? '#7F1D1D'
                                            : COLORS.primary,

                                    borderRadius: 14,

                                    paddingVertical: 13,

                                    alignItems:
                                        'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            dangerActionToConfirm ===
                                                'finish'
                                                ? '#FFFFFF'
                                                : '#111111',

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    {dangerActionToConfirm ===
                                        'home'
                                        ? 'Finalizar y salir'
                                        : dangerActionToConfirm ===
                                            'reset'
                                            ? 'Reiniciar'
                                            : 'Finalizar'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}