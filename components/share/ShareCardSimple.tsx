import React from 'react';
import { Image, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

type Props = {
    durationText: string;
    distanceText: string;
    paceText: string;
    maxSpeedText: string;
};

export default function ShareCardSimple({
    durationText,
    distanceText,
    paceText,
    maxSpeedText,
}: Props) {
    return (
        <View
            style={{
                width: 1080,
                height: 1920,
                backgroundColor: 'transparent',
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: 120,
                paddingHorizontal: 70,
            }}
        >
            {/* fila de métricas */}
            <View
                style={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 120,
                }}
            >
                <MetricBlock label="Tiempo" value={durationText} />
                <MetricBlock label="Distancia" value={distanceText} />
                <MetricBlock label="Ritmo" value={paceText} />
                <MetricBlock label="Vel. Máxima" value={maxSpeedText} />
            </View>

            {/* logo centrado */}
            <View
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                }}
            >
                <Image
                    source={require('../../assets/img/icontwist.png')}
                    style={{
                        width: 210,
                        height: 210,
                    }}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}

function MetricBlock({
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
                justifyContent: 'flex-start',
            }}
        >
            <Text
                style={{
                    color: '#BDBDBD',
                    fontSize: 38,
                    fontWeight: '700',
                    marginBottom: 8,
                    textAlign: 'center',
                }}
            >
                {label}
            </Text>

            <Text
                style={{
                    color: '#FFFFFF',
                    fontSize: 42,
                    fontWeight: '800',
                    textAlign: 'center',
                }}
            >
                {value}
            </Text>
        </View>
    );
}