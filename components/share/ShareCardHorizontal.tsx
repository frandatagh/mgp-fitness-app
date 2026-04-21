import React from 'react';
import { Image, ImageBackground, Text, View } from 'react-native';

type Props = {
    durationText: string;
    distanceText: string;
    paceText: string;
    maxSpeedText: string;
};

export default function ShareCardHorizontal({
    durationText,
    distanceText,
    paceText,
    maxSpeedText,
}: Props) {
    return (
        <ImageBackground
            source={require('../../assets/img/iconhome.png')}
            resizeMode="cover"
            style={{
                width: 1920,
                height: 1080,
                paddingTop: 70,
                paddingHorizontal: 70,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >
                <Metric label="Tiempo" value={durationText} />
                <Metric label="Distancia" value={distanceText} />
                <Metric label="Ritmo" value={paceText} />
                <Metric label="Vel. Máx." value={maxSpeedText} />
            </View>

            <View
                style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingBottom: 60,
                }}
            >
                <Image
                    source={require('../../assets/img/icontwist.png')}
                    style={{ width: 170, height: 170 }}
                    resizeMode="contain"
                />
            </View>
        </ImageBackground>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
                style={{
                    color: '#C7C7C7',
                    fontSize: 30,
                    fontWeight: '700',
                    marginBottom: 6,
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    color: '#FFFFFF',
                    fontSize: 34,
                    fontWeight: '800',
                }}
            >
                {value}
            </Text>
        </View>
    );
}