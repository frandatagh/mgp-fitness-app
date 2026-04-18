import React from 'react';
import { Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

type RunPoint = {
    latitude: number;
    longitude: number;
    timestamp: number;
    speed?: number | null;
};

type Props = {
    currentPosition: RunPoint | null;
    routePoints: RunPoint[];
    shouldFollowUser: boolean;
};

export default function LiveRunMap({
    currentPosition,
    routePoints,
}: Props) {
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f0f0f',
                paddingHorizontal: 24,
            }}
        >
            <Text
                style={{
                    color: COLORS.textLight,
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 8,
                }}
            >
                Mapa en vivo disponible en móvil
            </Text>

            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    textAlign: 'center',
                    marginBottom: 16,
                }}
            >
                La versión web muestra métricas, pero el mapa nativo se renderiza en tu development build.
            </Text>

            <Text style={{ color: COLORS.textLight, fontSize: 13 }}>
                Lat: {currentPosition?.latitude?.toFixed(6) ?? '--'}
            </Text>
            <Text style={{ color: COLORS.textLight, fontSize: 13, marginTop: 4 }}>
                Lng: {currentPosition?.longitude?.toFixed(6) ?? '--'}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 10 }}>
                Puntos acumulados: {routePoints.length}
            </Text>
        </View>
    );
}