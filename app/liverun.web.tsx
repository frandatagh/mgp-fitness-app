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
    type RunSession,
} from '../lib/runSessions';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
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
}: {
    session: RunSession;
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
                    height: 200,
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
                height: 240,
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
            if (created?.item) {
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
            }

            Alert.alert(
                'Sesión guardada',
                'La carrera fue guardada correctamente.'
            );
        } catch (error) {
            console.error(
                'Error guardando sesión web:',
                error
            );

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
    };

    const toggleHistory =
        async () => {
            if (historyVisible) {
                setHistoryVisible(false);
                setSelectedHistorySession(
                    null
                );
                return;
            }

            try {
                setHistoryLoading(true);

                const data =
                    await getMyRunSessions();

                setRunHistory(
                    data.items ?? []
                );

                setHistoryVisible(true);
            } catch (error) {
                console.error(
                    'Error cargando historial web:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudo cargar el historial.'
                );
            } finally {
                setHistoryLoading(false);
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
    }: {
        icon: IoniconName;
        label: string;
        onPress: () => void;
        primary?: boolean;
        danger?: boolean;
        large?: boolean;
        disabled?: boolean;
    }) {
        return (
            <Pressable
                disabled={disabled}
                onPress={onPress}
                style={({ pressed }) => ({
                    flex:
                        large
                            ? 1.2
                            : 1,

                    minWidth: 0,

                    height:
                        large
                            ? 62
                            : 56,

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

                    borderWidth: 1,

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
                <Ionicons
                    name={icon}
                    size={
                        large
                            ? 25
                            : 21
                    }
                    color={
                        primary
                            ? '#111111'
                            : danger
                                ? '#FF7777'
                                : '#FFFFFF'
                    }
                />

                <Text
                    numberOfLines={1}
                    style={{
                        color:
                            primary
                                ? '#111111'
                                : danger
                                    ? '#FF9999'
                                    : '#DADADA',

                        fontSize: 8,
                        fontWeight: '700',
                        marginTop: 3,
                    }}
                >
                    {label}
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
                    width: '47%',
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

                <AppHeader profileGreeting={`A correr`} />

                {/* Mapa */}



                <View
                    style={{
                        flex: 1,
                        minHeight: 320,
                        borderRadius: 24,
                        marginTop: 15,
                        overflow: 'hidden',
                        borderWidth: 2,
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
                                    currentPosition={currentPosition}
                                    routePoints={routePoints}
                                    shouldFollowUser={isRunning &&
                                        !isPaused}
                                    zoomLevel={16}
                                    recenterTick={recenterTick}
                                />


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
                                            fontSize: 12,
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
                        label="Home"
                        onPress={() =>
                            router.replace('/home')
                        }
                    />

                    {/* 2 — REINICIAR */}
                    <BottomActionButton
                        icon="refresh"
                        label="Reiniciar"
                        onPress={() =>
                            void resetRun()
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
                            label="Estadísticas"
                            onPress={() =>
                                router.push('/statistics')
                            }
                        />
                    ) : (
                        <BottomActionButton
                            icon="stop"
                            label="Finalizar"
                            danger
                            onPress={() =>
                                void finishRun()
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
                <Modal
                    visible={historyVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setHistoryVisible(false);
                        setSelectedHistorySession(
                            null
                        );
                    }}
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
                                maxWidth: 420,
                                maxHeight: '85%',
                                backgroundColor:
                                    '#101010',
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor:
                                    COLORS.primary,
                                padding: 16,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent:
                                        'space-between',
                                    alignItems: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FFFFFF',
                                        fontSize: 18,
                                        fontWeight: '900',
                                    }}
                                >
                                    {selectedHistorySession
                                        ? 'Detalle de carrera'
                                        : 'Últimas carreras'}
                                </Text>

                                <Pressable
                                    onPress={() => {
                                        if (
                                            selectedHistorySession
                                        ) {
                                            setSelectedHistorySession(
                                                null
                                            );
                                        } else {
                                            setHistoryVisible(
                                                false
                                            );
                                        }
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                COLORS.primary,
                                            fontWeight:
                                                '900',
                                        }}
                                    >
                                        {selectedHistorySession
                                            ? 'Volver'
                                            : 'Cerrar'}
                                    </Text>
                                </Pressable>
                            </View>

                            {!selectedHistorySession ? (
                                <ScrollView
                                    showsVerticalScrollIndicator={
                                        false
                                    }
                                >
                                    {runHistory.length ===
                                        0 ? (
                                        <Text
                                            style={{
                                                color:
                                                    '#999999',
                                                textAlign:
                                                    'center',
                                                paddingVertical:
                                                    30,
                                            }}
                                        >
                                            Todavía no hay
                                            carreras guardadas.
                                        </Text>
                                    ) : (
                                        runHistory
                                            .slice(0, 10)
                                            .map(
                                                (session) => (
                                                    <Pressable
                                                        key={
                                                            session.id
                                                        }
                                                        onPress={() =>
                                                            setSelectedHistorySession(
                                                                session
                                                            )
                                                        }
                                                        style={{
                                                            backgroundColor:
                                                                '#181818',
                                                            borderWidth:
                                                                1,
                                                            borderColor:
                                                                '#303030',
                                                            borderRadius:
                                                                16,
                                                            padding: 12,
                                                            marginBottom:
                                                                9,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    '#FFFFFF',
                                                                fontWeight:
                                                                    '800',
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

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.primary,
                                                                marginTop:
                                                                    5,
                                                                fontWeight:
                                                                    '800',
                                                            }}
                                                        >
                                                            {formatDistance(
                                                                session.distanceMeters
                                                            )}
                                                            {' · '}
                                                            {formatDuration(
                                                                session.durationSeconds
                                                            )}
                                                        </Text>
                                                    </Pressable>
                                                )
                                            )
                                    )}
                                </ScrollView>
                            ) : (
                                <ScrollView
                                    showsVerticalScrollIndicator={
                                        false
                                    }
                                >
                                    <HistorySessionMapPreview
                                        session={
                                            selectedHistorySession
                                        }
                                    />

                                    <View
                                        style={{
                                            flexDirection:
                                                'row',
                                            flexWrap:
                                                'wrap',
                                            marginTop: 14,
                                            gap: 10,
                                        }}
                                    >
                                        <HistoryMetric
                                            label="Distancia"
                                            value={formatDistance(
                                                selectedHistorySession.distanceMeters
                                            )}
                                        />

                                        <HistoryMetric
                                            label="Tiempo"
                                            value={formatDuration(
                                                selectedHistorySession.durationSeconds
                                            )}
                                        />

                                        <HistoryMetric
                                            label="Ritmo"
                                            value={
                                                selectedHistorySession.avgPaceSecPerKm !=
                                                    null
                                                    ? formatPace(
                                                        selectedHistorySession.distanceMeters,
                                                        selectedHistorySession.durationSeconds
                                                    )
                                                    : '--'
                                            }
                                        />

                                        <HistoryMetric
                                            label="Vel. máx."
                                            value={formatSpeed(
                                                selectedHistorySession.maxSpeedMps
                                            )}
                                        />
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}