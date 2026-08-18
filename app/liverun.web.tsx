import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Image,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { COLORS } from '../constants/colors';
import LiveRunMap from '../components/LiveRunMap.web';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
    accuracy?: number | null;
    segmentId?: number;
};

const MAX_DISPLAY_ACCURACY_METERS = 120;
const MAX_START_ACCURACY_METERS = 120;
const MAX_ROUTE_ACCURACY_METERS = 35;

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

export default function LiveRunWeb() {
    const { height } = useWindowDimensions();

    const [loading, setLoading] = useState(true);

    const [locationError, setLocationError] =
        useState<string | null>(null);

    const [currentPosition, setCurrentPosition] =
        useState<RunPoint | null>(null);

    const [recenterTick, setRecenterTick] =
        useState(0);

    const watchIdRef = useRef<number | null>(null);

    const hasReliablePositionRef = useRef(false);

    const mapHeight = Math.max(
        360,
        Math.min(height - 230, 650)
    );

    const [isRunning, setIsRunning] =
        useState(false);

    const isRunningRef =
        useRef(false);

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

            if (isRunningRef.current) {
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
                    return;
                }

                const acceptedPoint: RunPoint = {
                    ...nextPoint,
                    segmentId:
                        currentSegmentIdRef.current,
                };

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

        /*
         * Si el GPS ya está preciso,
         * comenzamos la ruta inmediatamente.
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
            /*
             * Podemos iniciar la carrera,
             * pero esperamos una posición
             * precisa antes de comenzar
             * a calcular ruta/distancia.
             */
            setRoutePoints([]);

            lastAcceptedPointRef.current =
                null;
        }

        isRunningRef.current = true;
        setIsRunning(true);
    };

    const finishRun = async () => {
        screenLockModeRef.current = false;
        setScreenLockMode(false);

        await releaseScreenWakeLock();

        isRunningRef.current = false;
        setIsRunning(false);

        lastAcceptedPointRef.current = null;
        forceSegmentBreakRef.current = false;
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
                    paddingTop: 6,
                }}
            >
                {/* Logo */}

                <View
                    style={{
                        alignItems: 'center',
                    }}
                >
                    <Image
                        source={require(
                            '../assets/img/icontwist.png'
                        )}
                        style={{
                            width: 150,
                            height: 75,
                        }}
                        resizeMode="contain"
                    />
                </View>

                {/* Mapa */}

                <View
                    style={{
                        height: mapHeight,
                        borderRadius: 24,
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
                                    shouldFollowUser={isRunning}
                                    zoomLevel={16}
                                    recenterTick={recenterTick}
                                />

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

                {isRunning && !screenLockMode && (
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
                        gap: 10,
                        marginTop: 12,
                    }}
                >
                    <Pressable
                        onPress={() =>
                            router.replace('/home')
                        }
                        style={{
                            flex: 1,
                            backgroundColor: '#444444',
                            paddingVertical: 13,
                            borderRadius: 14,
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontWeight: '700',
                            }}
                        >
                            Volver
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() =>
                            setRecenterTick(
                                (value) => value + 1
                            )
                        }
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
                                fontWeight: '800',
                            }}
                        >
                            Recentrar
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={
                            isRunning
                                ? finishRun
                                : startRun
                        }
                        disabled={
                            !isRunning &&
                            !canStartRun
                        }
                        style={{
                            flex: 1,
                            backgroundColor:
                                isRunning
                                    ? '#444444'
                                    : COLORS.primary,
                            paddingVertical: 13,
                            borderRadius: 14,
                            alignItems: 'center',
                            opacity:
                                isRunning || canStartRun
                                    ? 1
                                    : 0.5,
                        }}
                    >
                        <Text
                            style={{
                                color:
                                    isRunning
                                        ? '#FFFFFF'
                                        : '#111111',
                                fontWeight: '800',
                            }}
                        >
                            {isRunning
                                ? 'Finalizar'
                                : canStartRun
                                    ? 'Iniciar'
                                    : 'Esperando GPS'}
                        </Text>
                    </Pressable>
                </View>
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
                            fontSize: 34,
                            fontWeight: '900',
                        }}
                    >
                        {formatDistance(
                            distanceMeters
                        )}
                    </Text>

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
        </SafeAreaView>
    );
}