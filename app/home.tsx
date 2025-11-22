// app/home.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoutines, Routine } from '../lib/routines';

export default function HomeScreen() {
    const { user, isAuthenticated, logout } = useAuth();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loadingRoutines, setLoadingRoutines] = useState(true);
    const [routinesError, setRoutinesError] = useState<string | null>(null);

    const displayName = user?.name ?? user?.email ?? 'usuario';

    // 👉 Redirigir a login si NO está autenticado (pero desde un efecto)
    useEffect(() => {
        if (!isAuthenticated) {
            console.log('No autenticado, redirigiendo a /');
            router.replace('/');
        }
    }, [isAuthenticated]);

    // Cargar rutinas SOLO cuando el usuario está autenticado
    useEffect(() => {
        const load = async () => {
            try {
                if (!isAuthenticated) {
                    // si no está logueado, limpiamos estado y salimos
                    setRoutines([]);
                    setLoadingRoutines(false);
                    setRoutinesError(null);
                    return;
                }

                setRoutinesError(null);
                setLoadingRoutines(true);

                const data = await getRoutines();
                console.log('RUTINAS DESDE API:', data);
                setRoutines(data);
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Error al cargar tus rutinas';
                setRoutinesError(message);
            } finally {
                setLoadingRoutines(false);
            }
        };

        load();
    }, [isAuthenticated]);

    const handleLogout = async () => {
        setSettingsOpen(false);
        await logout();
        // el efecto de arriba se encargará de mandarte a "/"
    };

    const latestRoutineId = useMemo(() => {
        if (!routines.length) return null;

        const latest = routines.reduce((currentLatest, routine) => {
            // usamos updatedAt si existe, sino createdAt
            const currentDateStr = currentLatest.updatedAt ?? currentLatest.createdAt ?? '';
            const routineDateStr = routine.updatedAt ?? routine.createdAt ?? '';

            const currentDate = currentDateStr ? new Date(currentDateStr).getTime() : 0;
            const routineDate = routineDateStr ? new Date(routineDateStr).getTime() : 0;

            return routineDate > currentDate ? routine : currentLatest;
        }, routines[0]);

        return latest.id;
    }, [routines]);


    // 👉 Si por algún motivo aún no está autenticado, mostramos un fallback
    if (!isAuthenticated) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
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
            <View className="flex-1 px-4">
                {/* LOGO SUPERIOR */}
                <View className="items-center">
                    <Image
                        source={require('../assets/img/iconhome.png')}
                        style={{ width: 110, height: 110, resizeMode: 'contain' }}
                    />
                </View>

                {/* SALUDO IZQUIERDO */}
                <View className="mb-2 self-start px-1">
                    <Text
                        className="text-md"
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

                    <Pressable
                        className="items-center"
                        onPress={() => setSettingsOpen(prev => !prev)}
                    >
                        <Text style={{ color: COLORS.textMuted }}>Ajustes</Text>
                    </Pressable>
                </View>

                {/* MARCO PRINCIPAL */}
                <View
                    className="flex-1 mt-2 rounded-3xl px-3 py-4 relative"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {loadingRoutines && (
                            <Text
                                className="text-sm mb-2"
                                style={{ color: COLORS.textMuted }}
                            >
                                Cargando tus rutinas...
                            </Text>
                        )}

                        {routinesError && (
                            <Text className="text-sm mb-2" style={{ color: '#FFBABA' }}>
                                {routinesError}
                            </Text>
                        )}

                        {!loadingRoutines && routines.length === 0 && !routinesError && (
                            <Text
                                className="text-sm mb-2"
                                style={{ color: COLORS.textMuted }}
                            >
                                Aún no tienes rutinas guardadas. Crea tu primera rutina con el
                                botón de abajo.
                            </Text>
                        )}

                        {routines.map((routine) => (
                            <RoutineCard
                                key={routine.id}
                                title={routine.title}
                                description={routine.notes}
                                highlighted={routine.id === latestRoutineId}
                                exercisesPreview={routine.exercises ?? []}
                                onOpen={() => {
                                    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
                                }}
                                onEdit={() => {
                                    router.push({ pathname: '/routine/edit/[id]', params: { id: routine.id } });
                                }}
                                onDelete={() => {
                                    // luego podemos agregar un Alert y deleteRoutine(...)
                                    console.log('Borrar rutina', routine.id);
                                }}
                                onShare={() => {
                                    console.log('Compartir / exportar rutina', routine.id);
                                }}
                            />
                        ))}
                    </ScrollView>

                    {/* MENÚ AJUSTES */}
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
                                onPress={() => setSettingsOpen(false)}
                            >
                                <Text className="text-sm" style={{ color: COLORS.textLight }}>
                                    Información
                                </Text>
                            </Pressable>

                            <Pressable
                                className="py-1"
                                onPress={() => setSettingsOpen(false)}
                            >
                                <Text className="text-sm" style={{ color: COLORS.textLight }}>
                                    Acerca de nosotros
                                </Text>
                            </Pressable>

                            <Pressable
                                className="py-1"
                                onPress={() => setSettingsOpen(false)}
                            >
                                <Text className="text-sm" style={{ color: COLORS.textLight }}>
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

