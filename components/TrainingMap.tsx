// components/TrainingMap.tsx
import React from 'react';
import { Platform, View, StyleSheet, Image } from 'react-native';
import MapView, {
    Marker,
    PROVIDER_GOOGLE,
    Polyline,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { TrainingPoint } from '../constants/trainingPoints';

export type MapRegion = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

// Solo nombres de plazas (parks), sin bares/colegios/etc.
const CLEAN_MAP_STYLE = [
    {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
];

type Props = {
    region: MapRegion;
    points: TrainingPoint[];
    onPointPress?: (point: TrainingPoint) => void;
    routeFrom?: { latitude: number; longitude: number } | null;
    routeTo?: { latitude: number; longitude: number } | null;
};


const outdoorMarker = require('../assets/img/runblackicon.png');


export default function TrainingMap({
    region,
    points,
    onPointPress,
    routeFrom,
    routeTo,
}: Props) {
    return (
        <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton={Platform.OS === 'android'}
            customMapStyle={CLEAN_MAP_STYLE}
            showsPointsOfInterest
        >
            {points.map((point) => (
                <Marker
                    key={point.id}
                    coordinate={{
                        latitude: point.latitude,
                        longitude: point.longitude,
                    }}
                    onPress={() => onPointPress?.(point)}
                >
                    {/* Contenedor circular verde (igual que antes) */}
                    <View style={styles.markerContainer}>
                        {point.type === 'outdoor' ? (
                            // 👉 Outdoor: usar tu PNG
                            <Image
                                source={outdoorMarker}
                                style={styles.markerIcon}
                            />
                        ) : (
                            // 👉 Otros tipos (gym / activities): seguimos con Ionicons
                            <Ionicons
                                name={
                                    point.type === 'gym'
                                        ? 'fitness'
                                        : 'football'
                                }
                                size={16}
                                color="#111111"
                            />
                        )}
                    </View>
                </Marker>
            ))}



            {/* 👇 Línea recta entre ubicación del usuario y punto fijado */}
            {routeFrom && routeTo && (
                <Polyline
                    coordinates={[routeFrom, routeTo]}
                    strokeColor="#C6FF00" // o COLORS.primary
                    strokeWidth={3}
                />
            )}
        </MapView>
    );
}

const styles = StyleSheet.create({
    markerContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#C6FF00', // verde lima MGP
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#111111',
    },
    markerIcon: {
        width: 23,
        height: 23,
        resizeMode: 'contain',
    },
});

