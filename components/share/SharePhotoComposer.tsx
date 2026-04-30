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
    x: number;
    y: number;
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
};

function routePointsToSvgPoints(
    routePoints: RoutePoint[],
    width: number,
    height: number,
    padding = 18
) {
    if (!routePoints || routePoints.length < 2) return '';

    const lats = routePoints.map((p) => p.latitude);
    const lngs = routePoints.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.00001;
    const lngRange = maxLng - minLng || 0.00001;

    return routePoints
        .map((p) => {
            const x =
                padding + ((p.longitude - minLng) / lngRange) * (width - padding * 2);

            const y =
                padding +
                (1 - (p.latitude - minLat) / latRange) * (height - padding * 2);

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
        <View style={{ alignItems: 'center', flex: 1 }}>
            <Text
                style={{
                    color: '#B8B8B8',
                    fontSize: isPreview ? 12 : 38,
                    fontWeight: '800',
                }}
            >
                {label}
            </Text>

            <Text
                style={{
                    color: '#FFFFFF',
                    fontSize: isPreview ? 11 : 34,
                    fontWeight: '900',
                    marginTop: isPreview ? 1 : 4,
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
}: Props) {
    const isPreview = mode === 'preview';

    const photoWidth = isPreview ? 320 : 1080;
    const photoHeight = isPreview ? 570 : 1920;

    const stickerWidth = isPreview ? 300 : 900;
    const stickerPadding = isPreview ? 10 : 34;
    const interactionPadding = isPreview ? 34 : 90;

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

    const estimatedStickerHeight =
        stickerStyleIndex === 0
            ? isPreview
                ? 96
                : 285
            : stickerStyleIndex === 1
                ? isPreview
                    ? 225
                    : 690
                : isPreview
                    ? 220
                    : 650;

    const hitWidth = stickerWidth + interactionPadding * 2;
    const hitHeight = estimatedStickerHeight + interactionPadding * 2;

    const translateX = useSharedValue(stickerTransform.x);
    const translateY = useSharedValue(stickerTransform.y);
    const scale = useSharedValue(stickerTransform.scale);
    const rotation = useSharedValue(stickerTransform.rotation);

    const startX = useSharedValue(stickerTransform.x);
    const startY = useSharedValue(stickerTransform.y);
    const startScale = useSharedValue(stickerTransform.scale);
    const startRotation = useSharedValue(stickerTransform.rotation);

    useEffect(() => {
        translateX.value = stickerTransform.x;
        translateY.value = stickerTransform.y;
        scale.value = stickerTransform.scale;
        rotation.value = stickerTransform.rotation;
    }, [
        stickerTransform.x,
        stickerTransform.y,
        stickerTransform.scale,
        stickerTransform.rotation,
    ]);

    const commitTransform = (x: number, y: number, s: number, r: number) => {
        onStickerTransformChange?.({
            x,
            y,
            scale: s,
            rotation: r,
        });
    };

    const minX = -interactionPadding;
    const minY = -interactionPadding;
    const maxX = photoWidth - hitWidth + interactionPadding;
    const maxY = photoHeight - hitHeight + interactionPadding;

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            const nextX = startX.value + event.translationX;
            const nextY = startY.value + event.translationY;

            translateX.value = Math.min(Math.max(nextX, minX), maxX);
            translateY.value = Math.min(Math.max(nextY, minY), maxY);
        })
        .onEnd(() => {
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

    const composedGesture = Gesture.Race(
        panGesture,
        Gesture.Simultaneous(pinchGesture, rotationGesture)
    );

    const animatedStickerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
                { rotate: `${rotation.value}rad` },
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
            <Metric label="Vel. Máxima" value={maxSpeedText} isPreview={isPreview} />
        </View>
    );

    const logo = (
        <Image
            source={require('../../assets/img/icontwist.png')}
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
            <Svg width={routeBoxWidth} height={routeBoxHeight}>
                {hasRoute && (
                    <Polyline
                        points={svgRoutePoints}
                        fill="none"
                        stroke={routeLineColor}
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
                backgroundColor: '#55C9C7',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Svg width={routeBoxWidth} height={routeBoxHeight}>
                <Line
                    x1={routeBoxWidth * 0.05}
                    y1={routeBoxHeight * 0.25}
                    x2={routeBoxWidth * 0.95}
                    y2={routeBoxHeight * 0.15}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth={isPreview ? 2 : 5}
                />
                <Line
                    x1={routeBoxWidth * 0.1}
                    y1={routeBoxHeight * 0.78}
                    x2={routeBoxWidth * 0.9}
                    y2={routeBoxHeight * 0.62}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth={isPreview ? 2 : 5}
                />
                <Line
                    x1={routeBoxWidth * 0.28}
                    y1={0}
                    x2={routeBoxWidth * 0.2}
                    y2={routeBoxHeight}
                    stroke="rgba(255,255,255,0.20)"
                    strokeWidth={isPreview ? 2 : 5}
                />
                <Line
                    x1={routeBoxWidth * 0.72}
                    y1={0}
                    x2={routeBoxWidth * 0.82}
                    y2={routeBoxHeight}
                    stroke="rgba(255,255,255,0.20)"
                    strokeWidth={isPreview ? 2 : 5}
                />

                {hasRoute && (
                    <Polyline
                        points={svgRoutePoints}
                        fill="none"
                        stroke={routeLineColor}
                        strokeWidth={isPreview ? 5 : 15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </Svg>
        </View>
    );

    const stickerBody =
        stickerStyleIndex === 0 ? (
            <View
                style={{
                    width: stickerWidth,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                }}
            >
                {metricsRow}
                <View style={{ marginTop: isPreview ? 4 : 16 }}>{logo}</View>
            </View>
        ) : stickerStyleIndex === 1 ? (
            <View
                style={{
                    width: stickerWidth,
                    backgroundColor: 'rgba(17,17,17,0.88)',
                    borderWidth: isPreview ? 2 : 6,
                    borderColor: COLORS.primary,
                    borderRadius: isPreview ? 16 : 42,
                    padding: stickerPadding,
                    alignItems: 'center',
                }}
            >
                {logo}
                <View style={{ marginTop: isPreview ? 2 : 10, width: '100%' }}>
                    {metricsRow}
                </View>
                {routeWithMap}
            </View>
        ) : (
            <View
                style={{
                    width: stickerWidth,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                }}
            >
                {logo}
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
                <GestureDetector gesture={composedGesture}>
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: hitWidth,
                                height: hitHeight,
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
            )}
        </View>
    );
}