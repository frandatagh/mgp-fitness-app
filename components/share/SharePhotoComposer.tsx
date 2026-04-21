import React, { useEffect } from 'react';
import { ImageBackground, Text, View } from 'react-native';
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

type Props = {
    photoUri: string;
    durationText: string;
    distanceText: string;
    paceText: string;
    maxSpeedText: string;
    showSessionSticker: boolean;
    mode?: 'preview' | 'export';
    stickerTransform: StickerTransform;
    stickerStyleIndex: 0 | 1 | 2;
    onStickerTransformChange?: (next: StickerTransform) => void;
};

function clamp(value: number, min: number, max: number) {
    'worklet';
    return Math.max(min, Math.min(value, max));
}

export default function SharePhotoComposer({
    photoUri,
    durationText,
    distanceText,
    paceText,
    maxSpeedText,
    showSessionSticker,
    mode = 'preview',
    stickerTransform,
    stickerStyleIndex,
    onStickerTransformChange,
}: Props) {
    const isPreview = mode === 'preview';

    const width = isPreview ? 320 : 1080;
    const height = isPreview ? 570 : 1920;

    const boxWidth = isPreview ? 250 : 860;
    const boxHeight = isPreview ? 95 : 320;

    const borderRadius = isPreview ? 18 : 30;
    const titleSize = isPreview ? 16 : 42;
    const labelSize = isPreview ? 10 : 24;
    const valueSize = isPreview ? 12 : 28;

    const stylePresets = [
        {
            backgroundColor: 'rgba(10,10,10,0.82)',
            borderColor: COLORS.primary,
            titleColor: '#FFFFFF',
            labelColor: '#C7C7C7',
            valueColor: '#FFFFFF',
        },
        {
            backgroundColor: 'rgba(20,20,20,0.88)',
            borderColor: '#FFFFFF',
            titleColor: '#C6FF00',
            labelColor: '#D1D5DB',
            valueColor: '#FFFFFF',
        },
        {
            backgroundColor: 'rgba(0,0,0,0.72)',
            borderColor: '#65A30D',
            titleColor: '#FFFFFF',
            labelColor: '#BDBDBD',
            valueColor: '#C6FF00',
        },
    ] as const;

    const currentStyle = stylePresets[stickerStyleIndex];

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
        translateX,
        translateY,
        scale,
        rotation,
    ]);

    const commitTransform = () => {
        if (!onStickerTransformChange) return;

        onStickerTransformChange({
            x: translateX.value,
            y: translateY.value,
            scale: scale.value,
            rotation: rotation.value,
        });
    };

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            const scaledWidth = boxWidth * scale.value;
            const scaledHeight = boxHeight * scale.value;

            const maxX = Math.max(0, width - scaledWidth);
            const maxY = Math.max(0, height - scaledHeight);

            translateX.value = clamp(startX.value + event.translationX, 0, maxX);
            translateY.value = clamp(startY.value + event.translationY, 0, maxY);
        })
        .onFinalize(() => {
            runOnJS(commitTransform)();
        });

    const pinchGesture = Gesture.Pinch()
        .onBegin(() => {
            startScale.value = scale.value;
        })
        .onUpdate((event) => {
            const nextScale = clamp(startScale.value * event.scale, 0.6, 2.2);

            const scaledWidth = (boxWidth + interactionPadding * 2) * nextScale;
            const scaledHeight = (boxHeight + interactionPadding * 2) * nextScale;

            const maxX = Math.max(0, width - scaledWidth);
            const maxY = Math.max(0, height - scaledHeight);

            scale.value = nextScale;
            translateX.value = clamp(translateX.value, 0, maxX);
            translateY.value = clamp(translateY.value, 0, maxY);
        })
        .onFinalize(() => {
            runOnJS(commitTransform)();
        });

    const rotationGesture = Gesture.Rotation()
        .onBegin(() => {
            startRotation.value = rotation.value;
        })
        .onUpdate((event) => {
            rotation.value = startRotation.value + event.rotation;
        })
        .onFinalize(() => {
            runOnJS(commitTransform)();
        });

    const composedGesture = Gesture.Simultaneous(
        panGesture,
        pinchGesture,
        rotationGesture
    );

    const animatedStickerStyle = useAnimatedStyle(
        () =>
            ({
                transform: [
                    { translateX: translateX.value },
                    { translateY: translateY.value },
                    { scale: scale.value },
                    { rotateZ: `${rotation.value}rad` },
                ],
            }) as any
    );

    const interactionPadding = isPreview ? 28 : 60;

    const stickerContent = (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: boxWidth + interactionPadding * 2,
                    height: boxHeight + interactionPadding * 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                },
                animatedStickerStyle,
            ]}
        >
            <View
                style={{
                    width: boxWidth,
                    backgroundColor: currentStyle.backgroundColor,
                    borderWidth: isPreview ? 1.5 : 2,
                    borderColor: currentStyle.borderColor,
                    borderRadius,
                    paddingHorizontal: isPreview ? 14 : 30,
                    paddingVertical: isPreview ? 14 : 26,
                }}
            >
                <Text
                    style={{
                        color: currentStyle.titleColor,
                        fontSize: titleSize,
                        fontWeight: '800',
                        marginBottom: isPreview ? 10 : 18,
                    }}
                >
                    Sesión completada
                </Text>

                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: isPreview ? 6 : 10,
                    }}
                >
                    <Metric
                        label="Tiempo"
                        value={durationText}
                        labelSize={labelSize}
                        valueSize={valueSize}
                        labelColor={currentStyle.labelColor}
                        valueColor={currentStyle.valueColor}
                    />
                    <Metric
                        label="Distancia"
                        value={distanceText}
                        labelSize={labelSize}
                        valueSize={valueSize}
                        labelColor={currentStyle.labelColor}
                        valueColor={currentStyle.valueColor}
                    />
                    <Metric
                        label="Ritmo"
                        value={paceText}
                        labelSize={labelSize}
                        valueSize={valueSize}
                        labelColor={currentStyle.labelColor}
                        valueColor={currentStyle.valueColor}
                    />
                    <Metric
                        label="Vel. Máx."
                        value={maxSpeedText}
                        labelSize={labelSize}
                        valueSize={valueSize}
                        labelColor={currentStyle.labelColor}
                        valueColor={currentStyle.valueColor}
                    />
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View
            style={{
                width,
                height,
                borderRadius: isPreview ? 18 : 0,
                overflow: 'hidden',
            }}
        >
            <ImageBackground
                source={{ uri: photoUri }}
                resizeMode="cover"
                style={{
                    width: '100%',
                    height: '100%',
                }}
            >
                {showSessionSticker &&
                    (isPreview && onStickerTransformChange ? (
                        <GestureDetector gesture={composedGesture}>
                            {stickerContent}
                        </GestureDetector>
                    ) : (
                        stickerContent
                    ))}
            </ImageBackground>
        </View>
    );
}

function Metric({
    label,
    value,
    labelSize,
    valueSize,
    labelColor,
    valueColor,
}: {
    label: string;
    value: string;
    labelSize: number;
    valueSize: number;
    labelColor: string;
    valueColor: string;
}) {
    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
                style={{
                    color: labelColor,
                    fontSize: labelSize,
                    fontWeight: '700',
                    marginBottom: 4,
                    textAlign: 'center',
                }}
                numberOfLines={1}
            >
                {label}
            </Text>
            <Text
                style={{
                    color: valueColor,
                    fontSize: valueSize,
                    fontWeight: '800',
                    textAlign: 'center',
                }}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}