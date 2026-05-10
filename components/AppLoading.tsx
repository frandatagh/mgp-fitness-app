import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

type AppLoadingProps = {
    text?: string;
};

export default function AppLoading({ text = 'Cargando...' }: AppLoadingProps) {
    return (
        <View
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: COLORS.background }}
        >
            <Image
                source={require('../assets/img/iconhome.png')}
                style={{ width: 130, height: 130, marginBottom: 18 }}
                resizeMode="contain"
            />

            <ActivityIndicator size="large" color={COLORS.primary} />

            <Text
                className="text-base font-semibold mt-4 text-center"
                style={{ color: COLORS.textLight }}
            >
                {text}
            </Text>
        </View>
    );
}