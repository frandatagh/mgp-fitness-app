import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Text, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import type { Feature, LineString } from 'geojson';
import { COLORS } from '../constants/colors';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
    accuracy?: number | null;
};

type Props = {
    currentPosition: RunPoint | null;
    routePoints: RunPoint[];
    shouldFollowUser: boolean;
    zoomLevel: number;
    profileImageUrl?: string | null;
    recenterTick: number;
};

// Estilo oscuro
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export default function LiveRunMap({
    currentPosition,
    routePoints,
    shouldFollowUser,
    zoomLevel,
    profileImageUrl,
    recenterTick,
}: Props) {
    const cameraRef = useRef<any>(null);

    const lineFeature: Feature<LineString> | null = useMemo(() => {
        if (routePoints.length < 2) return null;

        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: routePoints.map((p) => [p.longitude, p.latitude]),
            },
            properties: {},
        };
    }, [routePoints]);

    const startPoint = routePoints.length > 0 ? routePoints[0] : null;
    const endPoint = routePoints.length > 1 ? routePoints[routePoints.length - 1] : null;

    useEffect(() => {
        if (!currentPosition || !cameraRef.current) return;

        if (shouldFollowUser) {
            cameraRef.current.setCamera({
                centerCoordinate: [
                    currentPosition.longitude,
                    currentPosition.latitude,
                ],
                zoomLevel,
                heading: 0,
                animationMode: 'easeTo',
                animationDuration: 700,
            });
        }
    }, [
        currentPosition?.latitude,
        currentPosition?.longitude,
        zoomLevel,
        shouldFollowUser,
        recenterTick,
    ]);

    if (!currentPosition) return null;

    return (
        <MapLibreGL.MapView
            style={{ flex: 1 }}
            mapStyle={MAP_STYLE}
            logoEnabled={false}
            compassEnabled
            rotateEnabled
            scrollEnabled
            zoomEnabled
        >
            <MapLibreGL.Camera
                ref={cameraRef}
                defaultSettings={{
                    centerCoordinate: [
                        currentPosition.longitude,
                        currentPosition.latitude,
                    ],
                    zoomLevel: 15,
                }}
            />

            {/* Marcador personalizado del usuario */}
            <MapLibreGL.MarkerView
                coordinate={[currentPosition.longitude, currentPosition.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
            >
                <View
                    style={{
                        width: 35,
                        height: 35,
                        borderRadius: 24,
                        backgroundColor: '#C6FF00',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                        shadowColor: '#000',
                        shadowOpacity: 0.28,
                        shadowRadius: 6,
                        elevation: 6,
                        overflow: 'hidden',
                    }}
                >
                    {profileImageUrl ? (
                        <Image
                            source={{ uri: profileImageUrl }}
                            style={{
                                width: 35,
                                height: 35,
                                borderRadius: 22,
                            }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Image
                            source={require('../assets/img/icontwist.png')}
                            style={{
                                width: 28,
                                height: 28,
                            }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </MapLibreGL.MarkerView>

            {/* Marcador de inicio */}
            {startPoint && (
                <MapLibreGL.MarkerView
                    coordinate={[startPoint.longitude, startPoint.latitude]}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View
                        style={{
                            minWidth: 26,
                            height: 26,
                            borderRadius: 13,
                            paddingHorizontal: 8,
                            backgroundColor: '#22C55E',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#0B0B0B',
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                            INI
                        </Text>
                    </View>
                </MapLibreGL.MarkerView>
            )}

            {/* Marcador de fin */}
            {endPoint && (
                <MapLibreGL.MarkerView
                    coordinate={[endPoint.longitude, endPoint.latitude]}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View
                        style={{
                            minWidth: 26,
                            height: 26,
                            borderRadius: 13,
                            paddingHorizontal: 8,
                            backgroundColor: '#EF4444',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: '#0B0B0B',
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                            FIN
                        </Text>
                    </View>
                </MapLibreGL.MarkerView>
            )}

            {lineFeature && (
                <MapLibreGL.ShapeSource id="run-route-source" shape={lineFeature}>
                    <MapLibreGL.LineLayer
                        id="run-route-line-shadow"
                        style={{
                            lineColor: '#65A30D',
                            lineWidth: 9,
                            lineOpacity: 0.35,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                    <MapLibreGL.LineLayer
                        id="run-route-line-main"
                        style={{
                            lineColor: '#C6FF00',
                            lineWidth: 5,
                            lineOpacity: 0.98,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                </MapLibreGL.ShapeSource>
            )}
        </MapLibreGL.MapView>
    );
}