import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../constants/colors';

export default function LiveRunWebFallback() {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: COLORS.background,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            <Image
                source={require('../assets/img/icontwist.png')}
                style={{ width: 180, height: 100, marginBottom: 20 }}
                resizeMode="contain"
            />

            <Text
                style={{
                    color: COLORS.textLight,
                    fontSize: 22,
                    fontWeight: '800',
                    textAlign: 'center',
                    marginBottom: 10,
                }}
            >
                Running en vivo
            </Text>

            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 14,
                    textAlign: 'center',
                    lineHeight: 21,
                    marginBottom: 24,
                }}
            >
                Esta función usa GPS, mapa nativo y tracking en segundo plano.
                Está disponible en Android/iOS, no en la versión web.
            </Text>

            <Pressable
                onPress={() => router.replace('/home')}
                style={{
                    backgroundColor: COLORS.primary,
                    paddingHorizontal: 22,
                    paddingVertical: 13,
                    borderRadius: 14,
                }}
            >
                <Text
                    style={{
                        color: '#111',
                        fontWeight: '800',
                        fontSize: 15,
                    }}
                >
                    Volver al home
                </Text>
            </Pressable>
        </View>
    );
}