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
    if (accuracy > 35) {
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

            setCurrentPosition(nextPoint);
            setLocationError(null);
            setLoading(false);

            if (isRunningRef.current) {
                const lastPoint =
                    lastAcceptedPointRef.current;

                const decision =
                    shouldAcceptWebPoint(
                        lastPoint,
                        nextPoint
                    );

                if (decision.accept) {
                    if (lastPoint) {
                        setDistanceMeters(
                            (current) =>
                                current + decision.distance
                        );
                    }

                    setRoutePoints(
                        (current) => [
                            ...current,
                            nextPoint,
                        ]
                    );

                    lastAcceptedPointRef.current =
                        nextPoint;
                }
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

        setDistanceMeters(0);

        setRoutePoints([
            currentPosition,
        ]);

        lastAcceptedPointRef.current =
            currentPosition;

        isRunningRef.current = true;
        setIsRunning(true);
    };

    const finishRun = () => {
        isRunningRef.current = false;
        setIsRunning(false);

        lastAcceptedPointRef.current = null;
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
                                </View>
                            </>
                        )}
                </View>

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
                        disabled={!currentPosition}
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
                                currentPosition
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
                                : 'Iniciar'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}