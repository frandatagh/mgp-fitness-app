import React, { useEffect, useMemo } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

type StickerTransform = {
    centerX: number;
    centerY: number;
    scale: number;
    rotation: number;
};

type RoutePoint = {
    latitude: number;
    longitude: number;
};

type Props = {
    photoUri: string;
    durationText: string;
    distanceText: string;
    paceText: string;
    maxSpeedText: string;
    showSessionSticker: boolean;
    stickerTransform: StickerTransform;
    stickerStyleIndex: 0 | 1 | 2;
    onStickerTransformChange?: (transform: StickerTransform) => void;
    mode: 'preview' | 'export';
    routePoints?: RoutePoint[];
    mapSnapshotUri?: string | null;
};

function routePointsToSvgPoints(
    routePoints: RoutePoint[],
    width: number,
    height: number,
    padding = 18
) {
    if (!routePoints || routePoints.length < 2) return '';

    const validPoints = routePoints.filter(
        (p) =>
            Number.isFinite(p.latitude) &&
            Number.isFinite(p.longitude)
    );

    if (validPoints.length < 2) return '';

    const lats = validPoints.map((p) => p.latitude);
    const lngs = validPoints.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latToMeters = 111_320;
    const lngToMeters = 111_320 * Math.cos((centerLat * Math.PI) / 180);

    const projectedPoints = validPoints.map((p) => ({
        x: (p.longitude - centerLng) * lngToMeters,
        y: (centerLat - p.latitude) * latToMeters,
    }));

    const xs = projectedPoints.map((p) => p.x);
    const ys = projectedPoints.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const routeWidth = maxX - minX || 1;
    const routeHeight = maxY - minY || 1;

    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scale = Math.min(
        availableWidth / routeWidth,
        availableHeight / routeHeight
    );

    const offsetX = padding + (availableWidth - routeWidth * scale) / 2;
    const offsetY = padding + (availableHeight - routeHeight * scale) / 2;

    return projectedPoints
        .map((p) => {
            const x = offsetX + (p.x - minX) * scale;
            const y = offsetY + (p.y - minY) * scale;

            return `${x},${y}`;
        })
        .join(' ');
}

function Metric({
    label,
    value,
    isPreview,
}: {
    label: string;
    value: string;
    isPreview: boolean;
}) {
    return (
        <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                    color: '#B8B8B8',
                    fontSize: isPreview ? 12 : 38,
                    fontWeight: '800',
                    textAlign: 'center',
                    includeFontPadding: false,
                }}
            >
                {label}
            </Text>

            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                    color: '#FFFFFF',
                    fontSize: isPreview ? 11 : 34,
                    fontWeight: '900',
                    marginTop: isPreview ? 1 : 4,
                    textAlign: 'center',
                    includeFontPadding: false,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

export default function SharePhotoComposer({
    photoUri,
    durationText,
    distanceText,
    paceText,
    maxSpeedText,
    showSessionSticker,
    stickerTransform,
    stickerStyleIndex,
    onStickerTransformChange,
    mode,
    routePoints = [],
    mapSnapshotUri,
}: Props) {
    const isPreview = mode === 'preview';

    const PREVIEW_WIDTH = 320;
    const PREVIEW_HEIGHT = 570;

    const EXPORT_WIDTH = 1080;
    const EXPORT_HEIGHT = 1920;

    const photoWidth = isPreview ? PREVIEW_WIDTH : EXPORT_WIDTH;
    const photoHeight = isPreview ? PREVIEW_HEIGHT : EXPORT_HEIGHT;

    const stickerWidth = isPreview ? 280 : 840;
    const stickerPadding = isPreview ? 10 : 34;

    const logoWidth = isPreview ? 62 : 220;
    const logoHeight = isPreview ? 42 : 145;

    const routeBoxWidth = stickerWidth - stickerPadding * 2;
    const routeBoxHeight = isPreview ? 105 : 330;

    const routeLineColor = '#FF2E35';

    const svgRoutePoints = useMemo(
        () =>
            routePointsToSvgPoints(
                routePoints,
                routeBoxWidth,
                routeBoxHeight,
                isPreview ? 18 : 48
            ),
        [routePoints, routeBoxWidth, routeBoxHeight, isPreview]
    );

    const hasRoute = svgRoutePoints.length > 0;

    const stickerHeight =
        stickerStyleIndex === 0
            ? isPreview
                ? 96
                : 288
            : stickerStyleIndex === 1
                ? isPreview
                    ? 175
                    : 615
                : isPreview
                    ? 230
                    : 690;

    const visualStickerWidth = stickerWidth;
    const visualStickerHeight = stickerHeight;

    const clamp = (value: number, min: number, max: number) => {
        return Math.max(min, Math.min(max, value));
    };

    const safeCenterX = clamp(
        stickerTransform.centerX ?? 0.5,
        visualStickerWidth / 2 / photoWidth,
        1 - visualStickerWidth / 2 / photoWidth
    );

    const safeCenterY = clamp(
        stickerTransform.centerY ?? 0.68,
        visualStickerHeight / 2 / photoHeight,
        1 - visualStickerHeight / 2 / photoHeight
    );

    const initialTranslateX = safeCenterX * photoWidth - visualStickerWidth / 2;
    const initialTranslateY = safeCenterY * photoHeight - visualStickerHeight / 2;




    const translateX = useSharedValue(initialTranslateX);
    const translateY = useSharedValue(initialTranslateY);

    const scale = useSharedValue(stickerTransform.scale);
    const rotation = useSharedValue(stickerTransform.rotation);

    const startX = useSharedValue(initialTranslateX);
    const startY = useSharedValue(initialTranslateY);

    const startScale = useSharedValue(stickerTransform.scale);
    const startRotation = useSharedValue(stickerTransform.rotation);

    useEffect(() => {
        translateX.value = initialTranslateX;
        translateY.value = initialTranslateY;
        scale.value = stickerTransform.scale;
        rotation.value = stickerTransform.rotation;
    }, [
        initialTranslateX,
        initialTranslateY,
        stickerTransform.scale,
        stickerTransform.rotation,
    ]);

    const commitTransform = (x: number, y: number, s: number, r: number) => {
        if (!isPreview) return;

        const centerX = (x + visualStickerWidth / 2) / photoWidth;
        const centerY = (y + visualStickerHeight / 2) / photoHeight;

        onStickerTransformChange?.({
            centerX: clamp(centerX, 0, 1),
            centerY: clamp(centerY, 0, 1),
            scale: s,
            rotation: r,
        });
    };



    const panGesture = Gesture.Pan()
        .onBegin(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            const nextX = startX.value + event.translationX;
            const nextY = startY.value + event.translationY;

            const horizontalOverflow = visualStickerWidth * 0.28;
            const verticalOverflow = visualStickerHeight * 0.10;

            translateX.value = Math.max(
                -horizontalOverflow,
                Math.min(photoWidth - visualStickerWidth + horizontalOverflow, nextX)
            );

            translateY.value = Math.max(
                -verticalOverflow,
                Math.min(photoHeight - visualStickerHeight + verticalOverflow, nextY)
            );
        })
        .onEnd(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;

            runOnJS(commitTransform)(
                translateX.value,
                translateY.value,
                scale.value,
                rotation.value
            );
        });

    const pinchGesture = Gesture.Pinch()
        .onBegin(() => {
            startScale.value = scale.value;
        })
        .onUpdate((event) => {
            const nextScale = startScale.value * event.scale;
            scale.value = Math.min(Math.max(nextScale, 0.55), 2.4);
        })
        .onEnd(() => {
            runOnJS(commitTransform)(
                translateX.value,
                translateY.value,
                scale.value,
                rotation.value
            );
        });

    const rotationGesture = Gesture.Rotation()
        .onBegin(() => {
            startRotation.value = rotation.value;
        })
        .onUpdate((event) => {
            rotation.value = startRotation.value + event.rotation;
        })
        .onEnd(() => {
            runOnJS(commitTransform)(
                translateX.value,
                translateY.value,
                scale.value,
                rotation.value
            );
        });

    const composedGesture = Gesture.Simultaneous(
        panGesture,
        pinchGesture,
        rotationGesture
    );

    const animatedStickerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotation.value}rad` },
                { scale: scale.value },
            ],
        } as any;
    });

    const metricsRow = (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                width: '100%',
            }}
        >
            <Metric label="Tiempo" value={durationText} isPreview={isPreview} />
            <Metric label="Distancia" value={distanceText} isPreview={isPreview} />
            <Metric label="Ritmo" value={paceText} isPreview={isPreview} />
            <Metric label="Vel. Máx" value={maxSpeedText} isPreview={isPreview} />
        </View>
    );

    const logoSource = require('../../assets/img/icontwist.png');

    const logo = (
        <Image
            source={logoSource}
            style={{
                width: logoWidth,
                height: logoHeight,
                alignSelf: 'center',
            }}
            resizeMode="contain"
        />
    );

    const routeOnly = (
        <View
            style={{
                width: routeBoxWidth,
                height: routeBoxHeight,
                marginTop: isPreview ? 10 : 32,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Svg
                width={routeBoxWidth}
                height={routeBoxHeight}
                viewBox={`0 0 ${routeBoxWidth} ${routeBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {hasRoute && (
                    <Polyline
                        points={svgRoutePoints}
                        fill="none"
                        stroke={COLORS.primary}
                        strokeWidth={isPreview ? 5 : 15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </Svg>
        </View>
    );

    const routeWithMap = (
        <View
            style={{
                width: routeBoxWidth,
                height: routeBoxHeight,
                marginTop: isPreview ? 10 : 32,
                borderRadius: isPreview ? 12 : 34,
                backgroundColor: '#111111',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {mapSnapshotUri ? (
                <Image
                    source={{ uri: mapSnapshotUri }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: routeBoxWidth,
                        height: routeBoxHeight,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: routeBoxWidth,
                        height: routeBoxHeight,
                        backgroundColor: '#55C9C7',
                    }}
                />
            )}

            {!mapSnapshotUri && hasRoute && (
                <View
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: routeBoxWidth,
                        height: routeBoxHeight,
                    }}
                >
                    <Svg
                        width={routeBoxWidth}
                        height={routeBoxHeight}
                        viewBox={`0 0 ${routeBoxWidth} ${routeBoxHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <Polyline
                            points={svgRoutePoints}
                            fill="none"
                            stroke={routeLineColor}
                            strokeWidth={isPreview ? 5 : 15}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </View>
            )}

            <View
                style={{
                    position: 'absolute',
                    right: isPreview ? 6 : 18,
                    bottom: isPreview ? 6 : 18,
                    backgroundColor: 'rgba(0,0,0,0.28)',
                    borderRadius: isPreview ? 8 : 18,
                    padding: isPreview ? 3 : 8,
                }}
            >
                <Image
                    source={logoSource}
                    style={{
                        width: isPreview ? 32 : 96,
                        height: isPreview ? 24 : 72,
                    }}
                    resizeMode="contain"
                />
            </View>
        </View>
    );

    const stickerBody =
        stickerStyleIndex === 0 ? (
            <View
                style={{
                    width: stickerWidth,
                    height: stickerHeight,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {metricsRow}
                <View style={{ marginTop: isPreview ? 4 : 16 }}>{logo}</View>
            </View>
        ) : stickerStyleIndex === 1 ? (
            <View
                style={{
                    width: stickerWidth,
                    height: stickerHeight,
                    backgroundColor: 'rgba(17,17,17,0.88)',
                    borderWidth: isPreview ? 2 : 6,
                    borderColor: COLORS.primary,
                    borderRadius: isPreview ? 16 : 42,
                    padding: stickerPadding,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View style={{ marginTop: isPreview ? 2 : 10, width: '100%' }}>
                    {metricsRow}
                </View>
                {routeWithMap}
            </View>
        ) : (
            <View
                style={{
                    width: stickerWidth,
                    height: stickerHeight,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >

                <View style={{ marginTop: isPreview ? 2 : 12, width: '100%' }}>
                    {metricsRow}
                </View>
                {routeOnly}
            </View>
        );

    return (
        <View
            style={{
                width: photoWidth,
                height: photoHeight,
                borderRadius: isPreview ? 18 : 0,
                overflow: 'hidden',
                backgroundColor: '#111',
            }}
        >
            <Image
                source={{ uri: photoUri }}
                style={{
                    width: photoWidth,
                    height: photoHeight,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                }}
                resizeMode="cover"
            />

            {showSessionSticker && (
                isPreview ? (
                    <GestureDetector gesture={composedGesture}>
                        <Animated.View
                            style={[
                                {
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: visualStickerWidth,
                                    height: visualStickerHeight,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'transparent',
                                },
                                animatedStickerStyle,
                            ]}
                        >
                            {stickerBody}
                        </Animated.View>
                    </GestureDetector>
                ) : (
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: visualStickerWidth,
                                height: visualStickerHeight,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'transparent',
                            },
                            animatedStickerStyle,
                        ]}
                    >
                        {stickerBody}
                    </Animated.View>
                )
            )}
        </View>
    );
}