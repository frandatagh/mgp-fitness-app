import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const MOCK_ROUTINES = [
    {
        id: '1',
        title: 'Rutina de prueba',
        description:
            'Rutina de prueba. Ejercicios de calentamiento 15 minutos. Tres veces a la semana. Volver a evaluar en tres meses.',
        highlighted: true,
        tag: 'Visto recientemente',
    },
    {
        id: '2',
        title: 'Calentamiento para correr',
        description:
            'Rutina de ejercicios para correr. Rodillas arriba 2x2. Trote lateral 3x2. Fondos por loma x4. Descansos intermedios. Estiramientos varios.',
        highlighted: false,
    },
];

export default function HomeScreen() {
    const { user, isAuthenticated, logout } = useAuth();
    const [settingsOpen, setSettingsOpen] = useState(false);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const displayName = user?.name ?? user?.email ?? 'usuario';

    const handleLogout = async () => {
        setSettingsOpen(false);
        await logout();
        router.replace('/');
    };

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 px-4 pt-6 pb-4">
                {/* LOGO SUPERIOR */}
                <View className="items-center mb-1">
                    <Text
                        className="text-3xl font-extrabold tracking-tight text-center"
                        style={{ color: COLORS.accent }}
                    >
                        MGP <Text style={{ color: COLORS.primary }}>RUTINA FITNESS</Text>
                    </Text>
                    <Text
                        className="text-xs mt-1"
                        style={{ color: COLORS.textLight }}
                    >
                        Hola, {displayName}
                    </Text>
                </View>

                {/* TABS SUPERIORES */}
                <View className="flex-row justify-around mb-2 mt-2">
                    <View className="items-center">
                        <Text style={{ color: COLORS.accent }}>Mis rutinas</Text>
                        <View
                            className="mt-1 h-1 w-14 rounded-full"
                            style={{ backgroundColor: COLORS.primary }}
                        />
                    </View>

                    <View className="items-center">
                        <Text style={{ color: COLORS.textMuted }}>Sugerencias</Text>
                    </View>

                    <View className="items-center">
                        <Text style={{ color: COLORS.textMuted }}>Personalizar IA</Text>
                    </View>

                    {/* AJUSTES como botón */}
                    <Pressable
                        className="items-center"
                        onPress={() => setSettingsOpen((prev) => !prev)}
                    >
                        <Text style={{ color: COLORS.textMuted }}>Ajustes</Text>
                    </Pressable>
                </View>

                {/* MARCO PRINCIPAL */}
                <View
                    className="flex-1 mt-2 rounded-3xl px-3 py-4 relative"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    {/* LISTA DE RUTINAS */}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {MOCK_ROUTINES.map((routine) => (
                            <RoutineCard
                                key={routine.id}
                                title={routine.title}
                                description={routine.description}
                                highlighted={routine.highlighted}
                                tag={routine.tag}
                            />
                        ))}
                    </ScrollView>

                    {/* MENÚ DESPLEGABLE DE AJUSTES */}
                    {settingsOpen && (
                        <View
                            className="absolute rounded-2xl p-3"
                            style={{
                                top: 10,
                                right: 10,
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        >
                            <Pressable
                                className="py-1"
                                onPress={() => {
                                    // Más adelante podemos navegar a una pantalla de información
                                    setSettingsOpen(false);
                                }}
                            >
                                <Text
                                    className="text-sm"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Información
                                </Text>
                            </Pressable>

                            <Pressable
                                className="py-1"
                                onPress={() => {
                                    // Más adelante: pantalla "Acerca de nosotros"
                                    setSettingsOpen(false);
                                }}
                            >
                                <Text
                                    className="text-sm"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Acerca de nosotros
                                </Text>
                            </Pressable>

                            <Pressable
                                className="py-1"
                                onPress={() => {
                                    // Más adelante: pantalla "Términos y condiciones"
                                    setSettingsOpen(false);
                                }}
                            >
                                <Text
                                    className="text-sm"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Términos y condiciones
                                </Text>
                            </Pressable>

                            <View
                                className="h-px my-2"
                                style={{ backgroundColor: COLORS.textMuted }}
                            />

                            <Pressable className="py-1" onPress={handleLogout}>
                                <Text
                                    className="text-sm font-semibold"
                                    style={{ color: '#FFBABA' }}
                                >
                                    Cerrar sesión
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-4">
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/routine/new')}
                    >
                        <Text style={{ color: COLORS.textLight }}>+ Crear rutina</Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 mx-1 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text style={{ color: COLORS.textLight }}>Subir archivo</Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text style={{ color: COLORS.textLight }}>Puntos cercanos</Text>
                    </Pressable>
                </View>

                {/* FOOTER */}
                <View className="items-center mt-4">
                    <Text className="font-bold" style={{ color: COLORS.accent }}>
                        MGP <Text style={{ color: COLORS.primary }}>RUTINA FITNESS</Text>
                    </Text>
                    <Text style={{ color: COLORS.textLight }}>
                        ¡Tu entrenamiento al instante!
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
