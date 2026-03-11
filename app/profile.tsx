// app/profile.tsx
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const displayName = user?.name ?? 'Tu nombre';
    const email = user?.email ?? 'correo@ejemplo.com';

    // Iniciales para el “avatar”
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(word => word[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'U';

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-4"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* LOGO SUPERIOR */}
                <View className="items-center mb-2">
                    <Image
                        source={require('../assets/img/iconhome.png')}
                        style={{ width: 130, height: 70, resizeMode: 'contain' }}
                    />
                </View>

                {/* TÍTULO */}
                <View className="mb-2 px-1">
                    <Text
                        className="text-[18px] font-semibold"
                        style={{ color: COLORS.textLight }}
                    >
                        Perfil de usuario
                    </Text>
                    <Text
                        className="text-[13px] mt-1"
                        style={{ color: COLORS.textMuted }}
                    >
                        Revisa tus datos y un resumen básico de tu actividad. Próximamente
                        verás estadísticas más completas.
                    </Text>
                </View>

                {/* PANEL PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* BLOQUE: DATOS DE CUENTA */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Tus datos
                            </Text>

                            <View className="flex-row items-center">
                                {/* Avatar simple con iniciales */}
                                <View
                                    className="w-14 h-14 rounded-full items-center justify-center mr-3"
                                    style={{ backgroundColor: COLORS.primary }}
                                >
                                    <Text
                                        className="text-[18px] font-bold"
                                        style={{ color: '#111111' }}
                                    >
                                        {initials}
                                    </Text>
                                </View>

                                <View className="flex-1">
                                    <Text
                                        className="text-[15px] font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        {displayName}
                                    </Text>
                                    <Text
                                        className="text-[13px]"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        {email}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* BLOQUE: RESUMEN RÁPIDO (placeholder) */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Resumen rápido
                            </Text>

                            <View className="flex-row mb-2">
                                <View className="flex-1 mr-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#111111' }}>
                                    <Text
                                        className="text-[12px] font-semibold mb-1"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Rutinas creadas
                                    </Text>
                                    <Text
                                        className="text-[16px] font-bold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Próximamente
                                    </Text>
                                </View>

                                <View className="flex-1 ml-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#111111' }}>
                                    <Text
                                        className="text-[12px] font-semibold mb-1"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Sesiones completadas
                                    </Text>
                                    <Text
                                        className="text-[16px] font-bold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Próximamente
                                    </Text>
                                </View>
                            </View>

                            <View className="rounded-xl px-3 py-2" style={{ backgroundColor: '#111111' }}>
                                <Text
                                    className="text-[12px] font-semibold mb-1"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Días activos esta semana
                                </Text>
                                <Text
                                    className="text-[16px] font-bold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Próximamente
                                </Text>
                            </View>
                        </View>

                        {/* BLOQUE: CÓMO SE USARÁ ESTE PERFIL */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                ¿Para qué sirve tu perfil?
                            </Text>
                            <Text
                                className="text-[13px] leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Esta sección está pensada para concentrar la información más importante
                                sobre tu cuenta y tu actividad en MGP Rutina Fitness. Aquí podrás ver:
                                {'\n\n'}
                                • Tus datos básicos (nombre y correo).
                                {'\n'}
                                • Un resumen de tus rutinas y entrenamientos.
                                {'\n'}
                                • En versiones futuras, estadísticas de tus semanas más activas, rachas
                                de entrenamiento y objetivos alcanzados.
                                {'\n\n'}
                                La idea es que este espacio funcione como tu panel personal, donde
                                puedas ver de un vistazo cómo vas avanzando con tus entrenamientos.
                            </Text>
                        </View>

                        {/* BLOQUE: PRÓXIMAMENTE */}
                        <View className="mb-2">
                            <Text
                                className="text-[15px] font-semibold mb-2"
                                style={{ color: COLORS.accent }}
                            >
                                Próximamente
                            </Text>
                            <Text
                                className="text-[13px] leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                En futuras actualizaciones, este perfil incluirá:
                                {'\n\n'}
                                • Estadísticas detalladas de tus rutinas marcadas como “realizadas”.
                                {'\n'}
                                • Gráficos simples de actividad semanal y mensual.
                                {'\n'}
                                • Preferencias personales de entrenamiento (objetivo, nivel, equipamiento).
                                {'\n'}
                                • Opciones para ajustar tu experiencia dentro de la app.
                            </Text>
                        </View>
                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="mt-3 flex-row justify-between px-2 pb-2">
                    {/* Volver al home */}
                    <Pressable
                        onPress={() => router.replace('/home')}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver al home
                        </Text>
                    </Pressable>

                    {/* Editar perfil (futuro) */}
                    <Pressable
                        onPress={() => {
                            // Más adelante: navegar a /profile/edit
                            console.log('Editar perfil (próximamente)');
                        }}
                        className="flex-1 ml-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: COLORS.primary }}
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: '#111111' }}
                        >
                            Editar perfil
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
