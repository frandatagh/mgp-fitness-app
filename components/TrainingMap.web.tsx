// components/TrainingMap.web.tsx
import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../constants/colors';
import type { TrainingPoint } from '../constants/trainingPoints';
import type { MapRegion } from './TrainingMap';

type Props = {
    region: MapRegion;
    points: TrainingPoint[];
    onPointPress?: (point: TrainingPoint) => void;
    routeFrom?: { latitude: number; longitude: number } | null;
    routeTo?: { latitude: number; longitude: number } | null;
};


export default function TrainingMapWeb({ region, points }: Props) {
    const centerLat = points[0]?.latitude ?? region.latitude;
    const centerLng = points[0]?.longitude ?? region.longitude;

    const url = `https://maps.google.com/maps?q=${centerLat},${centerLng}&z=14&output=embed`;

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            {React.createElement('iframe', {
                src: url,
                style: { border: 0, width: '100%', height: '100%' },
                loading: 'lazy',
            })}
        </View>
    );
}
