import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react';
import { Image, Text, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import type { Feature, LineString, Point } from 'geojson';
import { COLORS } from '../constants/colors';
import { FontAwesome6 } from '@expo/vector-icons';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
    accuracy?: number | null;
};

type MapPoint = {
    latitude: number;
    longitude: number;
};

type Props = {
    currentPosition: RunPoint | null;
    routePoints: RunPoint[];
    shouldFollowUser: boolean;
    zoomLevel: number;
    profileImageUrl: string | null;
    recenterTick?: number;

    onMapPress?: (point: MapPoint) => void;
    pendingFinishPoint?: MapPoint | null;
    finishPoint?: MapPoint | null;
    showFinishRoute?: boolean;

    plannedRouteGeometry?: LineString | null;
};

export type LiveRunMapHandle = {
    fitBounds: (
        ne: [number, number],
        sw: [number, number],
        padding: number,
        duration?: number
    ) => void;
    recenterOnUser: (
        coordinate: [number, number],
        zoom: number
    ) => void;
};

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const LiveRunMap = forwardRef<LiveRunMapHandle, Props>(
    (
        {
            currentPosition,
            routePoints,
            shouldFollowUser,
            zoomLevel,
            profileImageUrl,
            recenterTick,
            onMapPress,
            pendingFinishPoint,
            finishPoint,
            showFinishRoute,
            plannedRouteGeometry,
        },
        ref
    ) => {
        const cameraRef = useRef<any>(null);

        const liveRouteFeature: Feature<LineString> | null = useMemo(() => {
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

        const plannedRouteFeature: Feature<LineString> | null = useMemo(() => {
            if (!plannedRouteGeometry) return null;

            return {
                type: 'Feature',
                geometry: plannedRouteGeometry,
                properties: {},
            };
        }, [plannedRouteGeometry]);

        const startPoint = routePoints.length > 0 ? routePoints[0] : null;
        const endPoint =
            routePoints.length > 1 ? routePoints[routePoints.length - 1] : null;

        const fallbackFinishRouteFeature: Feature<LineString> | null = useMemo(() => {
            if (!currentPosition || !finishPoint || !showFinishRoute || plannedRouteGeometry) {
                return null;
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [currentPosition.longitude, currentPosition.latitude],
                        [finishPoint.longitude, finishPoint.latitude],
                    ],
                },
                properties: {},
            };
        }, [currentPosition, finishPoint, showFinishRoute, plannedRouteGeometry]);

        useEffect(() => {
            if (!currentPosition || !cameraRef.current) return;
            if (!shouldFollowUser) return;

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
        }, [
            currentPosition?.latitude,
            currentPosition?.longitude,
            zoomLevel,
            shouldFollowUser,
        ]);

        useEffect(() => {
            if (!currentPosition || !cameraRef.current) return;
            if (!recenterTick) return;

            cameraRef.current.setCamera({
                centerCoordinate: [
                    currentPosition.longitude,
                    currentPosition.latitude,
                ],
                zoomLevel: shouldFollowUser ? zoomLevel : 15,
                heading: 0,
                animationMode: 'easeTo',
                animationDuration: 700,
            });
        }, [recenterTick, currentPosition, shouldFollowUser, zoomLevel]);

        useImperativeHandle(ref, () => ({
            fitBounds: (
                ne: [number, number],
                sw: [number, number],
                padding: number,
                duration?: number
            ) => {
                if (cameraRef.current?.fitBounds) {
                    cameraRef.current.fitBounds(
                        ne,
                        sw,
                        [padding, padding, padding, padding],
                        duration ?? 800
                    );
                }
            },

            recenterOnUser: (coordinate: [number, number], zoom: number) => {
                if (cameraRef.current?.setCamera) {
                    cameraRef.current.setCamera({
                        centerCoordinate: coordinate,
                        zoomLevel: zoom,
                        heading: 0,
                        animationMode: 'easeTo',
                        animationDuration: 700,
                    });
                }
            },
        }));

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
                onPress={(event) => {
                    if (!onMapPress) return;

                    const geometry = event.geometry as Point | undefined;
                    if (!geometry || geometry.type !== 'Point') return;

                    const coords = geometry.coordinates;
                    if (!Array.isArray(coords) || coords.length < 2) return;

                    onMapPress({
                        latitude: coords[1],
                        longitude: coords[0],
                    });
                }}
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

                {liveRouteFeature && (
                    <MapLibreGL.ShapeSource id="run-route-source" shape={liveRouteFeature}>
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

                {plannedRouteFeature && (
                    <MapLibreGL.ShapeSource id="planned-route-source" shape={plannedRouteFeature}>
                        <MapLibreGL.LineLayer
                            id="planned-route-line"
                            style={{
                                lineColor: '#3A3A3A',
                                lineWidth: 4,
                                lineOpacity: 0.95,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    </MapLibreGL.ShapeSource>
                )}

                {fallbackFinishRouteFeature && (
                    <MapLibreGL.ShapeSource
                        id="fallback-finish-route-source"
                        shape={fallbackFinishRouteFeature}
                    >
                        <MapLibreGL.LineLayer
                            id="fallback-finish-route-line"
                            style={{
                                lineColor: '#3A3A3A',
                                lineWidth: 4,
                                lineOpacity: 0.95,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    </MapLibreGL.ShapeSource>
                )}

                {pendingFinishPoint && (
                    <MapLibreGL.PointAnnotation
                        id="pending-finish-point"
                        coordinate={[
                            pendingFinishPoint.longitude,
                            pendingFinishPoint.latitude,
                        ]}
                    >
                        <View
                            style={{
                                backgroundColor: 'rgba(17,17,17,0.92)',
                                borderRadius: 14,
                                padding: 6,
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        >
                            <FontAwesome6
                                name="flag-checkered"
                                size={20}
                                color="#222222"
                            />
                        </View>
                    </MapLibreGL.PointAnnotation>
                )}

                {finishPoint && (
                    <MapLibreGL.PointAnnotation
                        id="finish-point"
                        coordinate={[finishPoint.longitude, finishPoint.latitude]}
                    >
                        <View
                            style={{
                                backgroundColor: 'rgba(17,17,17,0.92)',
                                borderRadius: 14,
                                padding: 6,
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        >
                            <FontAwesome6
                                name="flag-checkered"
                                size={16}
                                color="#222222"
                            />
                        </View>
                    </MapLibreGL.PointAnnotation>
                )}
            </MapLibreGL.MapView>
        );
    }
);

LiveRunMap.displayName = 'LiveRunMap';

export default LiveRunMap;