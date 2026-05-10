// app/account.tsx
import React from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

type AccountOptionProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
};

function AccountOption({
    icon,
    title,
    subtitle,
    onPress,
}: AccountOptionProps) {
    return (
        <Pressable
            className="flex-row items-center rounded-2xl p-3 mb-3"
            style={{
                backgroundColor: '#1A1A1A',
                borderWidth: 1,
                borderColor: '#2F2F2F',
            }}
            onPress={onPress}
        >
            <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: '#222222' }}
            >
                <Ionicons name={icon} size={22} color={COLORS.primary} />
            </View>

            <View className="flex-1">
                <Text
                    className="text-base font-semibold"
                    style={{ color: COLORS.textLight }}
                >
                    {title}
                </Text>

                <Text
                    className="text-xs mt-1"
                    style={{ color: COLORS.textMuted }}
                >
                    {subtitle}
                </Text>
            </View>

            <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textMuted}
            />
        </Pressable>
    );
}

export default function AccountScreen() {
    const { user, isAuthenticated, logout } = useAuth();

    const displayName = user?.name ?? 'Usuario';
    const displayEmail = user?.email ?? 'Email no disponible';

    const appVersion =
        Constants.expoConfig?.version ??
        Constants.manifest2?.extra?.expoClient?.version ??
        'Beta';

    const handleLogout = async () => {
        await logout();
        router.replace('/');
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text style={{ color: COLORS.textLight }}>
                    Redirigiendo al inicio de sesión...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 w-full px-4"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* LOGO */}
                <View className="items-center">
                    <Image
                        source={require('../assets/img/iconhome.png')}
                        style={{ width: 110, height: 110 }}
                        resizeMode="contain"
                    />
                </View>

                {/* TÍTULO */}
                <View className="self-start px-3 mb-3">
                    <Text
                        className="text-[22px] font-semibold"
                        style={{ color: COLORS.textLight }}
                    >
                        Tu cuenta
                    </Text>

                    <Text
                        className="text-sm mt-1"
                        style={{ color: COLORS.textMuted }}
                    >
                        Información general de tu usuario y accesos rápidos.
                    </Text>
                </View>

                {/* CONTENEDOR PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-4 py-5"
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* CARD USUARIO */}
                        <View
                            className="rounded-3xl p-4 mb-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: '#2F2F2F',
                            }}
                        >
                            <View className="flex-row items-center">
                                <View
                                    className="w-14 h-14 rounded-full items-center justify-center mr-3"
                                    style={{
                                        backgroundColor: COLORS.primary,
                                    }}
                                >
                                    <Ionicons
                                        name="person"
                                        size={28}
                                        color="#111111"
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text
                                        className="text-lg font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        {displayName}
                                    </Text>

                                    <Text
                                        className="text-sm mt-1"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        {displayEmail}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* DATOS DE CUENTA */}
                        <View
                            className="rounded-3xl p-4 mb-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: '#2F2F2F',
                            }}
                        >
                            <Text
                                className="text-lg font-semibold mb-3"
                                style={{ color: COLORS.textLight }}
                            >
                                Datos de la cuenta
                            </Text>

                            <View className="mb-3">
                                <Text
                                    className="text-xs font-semibold"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Nombre
                                </Text>
                                <Text
                                    className="text-base mt-1"
                                    style={{ color: COLORS.textLight }}
                                >
                                    {displayName}
                                </Text>
                            </View>

                            <View className="mb-3">
                                <Text
                                    className="text-xs font-semibold"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Email
                                </Text>
                                <Text
                                    className="text-base mt-1"
                                    style={{ color: COLORS.textLight }}
                                >
                                    {displayEmail}
                                </Text>
                            </View>

                            <View>
                                <Text
                                    className="text-xs font-semibold"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Versión de la app
                                </Text>
                                <Text
                                    className="text-base mt-1"
                                    style={{ color: COLORS.textLight }}
                                >
                                    {appVersion}
                                </Text>
                            </View>
                        </View>

                        {/* ACCESOS RÁPIDOS */}
                        <View
                            className="rounded-3xl p-4 mb-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: '#2F2F2F',
                            }}
                        >
                            <Text
                                className="text-lg font-semibold mb-3"
                                style={{ color: COLORS.textLight }}
                            >
                                Accesos rápidos
                            </Text>

                            <AccountOption
                                icon="person-circle-outline"
                                title="Editar perfil"
                                subtitle="Actualizar datos físicos, objetivo e imagen."
                                onPress={() => router.push('/profile')}
                            />

                            <AccountOption
                                icon="bar-chart-outline"
                                title="Tus estadísticas"
                                subtitle="Ver rendimiento, running y esfuerzo."
                                onPress={() => router.push('/statistics')}
                            />

                            <AccountOption
                                icon="time-outline"
                                title="Historial de registros"
                                subtitle="Revisar sesiones, rutinas y valoraciones."
                                onPress={() => router.push('/statistics-history')}
                            />

                            <AccountOption
                                icon="help-circle-outline"
                                title="Soporte & Ayuda"
                                subtitle="Resolver dudas o reportar problemas."
                                onPress={() => router.push('/support')}
                            />
                        </View>

                        {/* SEGURIDAD */}
                        <View
                            className="rounded-3xl p-4 mb-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: '#2F2F2F',
                            }}
                        >
                            <Text
                                className="text-lg font-semibold mb-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Seguridad
                            </Text>

                            <Text
                                className="text-sm leading-5 mb-4"
                                style={{ color: COLORS.textMuted }}
                            >
                                Tu sesión se mantiene activa de forma segura en este dispositivo.
                                Si usás un celular compartido, podés cerrar sesión desde esta sección.
                            </Text>

                            <Pressable
                                className="rounded-2xl px-4 py-3 items-center"
                                style={{
                                    backgroundColor: '#3A0D0D',
                                    borderWidth: 1,
                                    borderColor: '#FF6B6B',
                                }}
                                onPress={handleLogout}
                            >
                                <Text
                                    className="font-semibold"
                                    style={{ color: '#FFBABA' }}
                                >
                                    Cerrar sesión
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-2 mb-2">
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.back()}
                    >
                        <Text
                            className="text-[16px] font-semibold"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver
                        </Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{
                            backgroundColor: COLORS.primary,
                            borderWidth: 2,
                            borderColor: '#C6FF00',
                        }}
                        onPress={() => router.push('/home')}
                    >
                        <Text
                            className="text-[16px] font-semibold"
                            style={{ color: '#111111' }}
                        >
                            Ir al home
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

