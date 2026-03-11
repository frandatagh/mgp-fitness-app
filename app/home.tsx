// app/home.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoutines, Routine, deleteRoutine } from '../lib/routines';
import { Ionicons } from '@expo/vector-icons';

function getLastActivityTime(routine: Routine): number {
    const dateStr =
        routine.lastDoneAt ??
        routine.updatedAt ??
        routine.createdAt ??
        '';

    return dateStr ? new Date(dateStr).getTime() : 0;
}


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
    const handleDeleteRoutine = async (id: string) => {
        try {
            setRoutinesError(null);
            await deleteRoutine(id); // 🔥 borra en el backend
            // y ahora actualizamos el listado en memoria
            setRoutines((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error al borrar la rutina';
            setRoutinesError(message);
        }
    };




    const sortedRoutines = useMemo(() => {
        if (!routines.length) return [];

        return [...routines].sort((a, b) => {
            return getLastActivityTime(b) - getLastActivityTime(a);
        });
    }, [routines]);


    const latestRoutineId = sortedRoutines[0]?.id ?? null;







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
            <View className="flex-1 w-full px-4"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* LOGO SUPERIOR */}
                <View className="items-center">
                    <Image
                        source={require('../assets/img/iconhome.png')}
                        style={{ width: 110, height: 110 }}
                        resizeMode="contain"
                    />
                </View>

                {/* SALUDO IZQUIERDO */}
                <View className="self-start px-3">
                    <Text
                        className="text-md text-gray-500"
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

                    <Pressable className="items-center" onPress={() => router.push("/suggestions")}>
                        <Text style={{ color: COLORS.textMuted }}>Sugerencias</Text>
                    </Pressable>


                    <Pressable className="items-center" onPress={() => router.push("/profile")}>

                        <Text style={{ color: COLORS.textMuted }}>Perfil</Text>
                    </Pressable>

                    <Pressable
                        className="items-center"
                        onPress={() => setSettingsOpen(prev => !prev)}
                    >
                        <Text
                            style={{
                                color: settingsOpen ? COLORS.accent : COLORS.textMuted,
                            }}
                        >
                            Ajustes
                        </Text>

                        {settingsOpen && (
                            <View
                                className="mt-1 h-1 w-8 rounded-full"
                                style={{ backgroundColor: COLORS.primary }}
                            />
                        )}
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
                                Aún no tienes rutinas guardadas. Crea tu primera rutina con el botón de abajo "Crear rutina".
                                {'\n\n'}
                                <Text className="underline font-semibold">
                                    Subir archivo:
                                </Text>{' '}
                                Carga tu rutina de entrenamiento desde un archivo ya existente.
                                {'\n\n'}
                                <Text className="underline font-semibold">
                                    Puntos cercanos:
                                </Text>{' '}
                                Ubica puntos de entrenamiento al aire libre cercanos a tu zona, además de gimnasios y clubes disponibles cerca de tu ubicación.
                                {'\n\n'}
                                <Text className="underline font-semibold">
                                    Sugerencias:
                                </Text>{' '}
                                Conoce nuestras recomendaciones de entrenamiento, consejos de uso de la aplicación y elige entre rutinas de prueba para comenzar con intensidad baja, media o alta.
                                {'\n\n'}
                                <Text className="underline font-semibold">
                                    Personalizar IA:
                                </Text>{' '}
                                Sección para crear tu rutina con un entrenador de Inteligencia Artificial que se ajuste a tus necesidades y objetivos.
                            </Text>
                        )}


                        {sortedRoutines.map((routine) => (
                            <RoutineCard
                                key={routine.id}
                                title={routine.title}
                                description={routine.notes}
                                highlighted={routine.id === latestRoutineId}
                                isRecent={routine.id === latestRoutineId}
                                exercisesPreview={routine.exercises ?? []}
                                onOpen={() => {
                                    router.push({
                                        pathname: '/routine/[id]',
                                        params: { id: routine.id },
                                    });
                                }}
                                onEdit={() => {
                                    router.push({
                                        pathname: '/routine/edit/[id]',
                                        params: { id: routine.id },
                                    });
                                }}
                                onDelete={() => handleDeleteRoutine(routine.id)}
                                onShare={() => {
                                    console.log('Compartir / exportar rutina', routine.id);
                                }}
                            />
                        ))}

                    </ScrollView>

                    {/* MENÚ AJUSTES */}
                    {settingsOpen && (
                        <>
                            {/* Fondo táctil para cerrar al tocar fuera */}
                            <Pressable
                                className="absolute inset-0"
                                onPress={() => setSettingsOpen(false)}
                                style={{ backgroundColor: 'transparent' }}
                            />

                            {/* Tarjeta del menú */}
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
                                        setSettingsOpen(false);
                                        router.push('/info');
                                    }}
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
                                        Soporte & Ayuda
                                    </Text>
                                </Pressable>

                                <Pressable
                                    className="py-1"
                                    onPress={() => setSettingsOpen(false)}
                                >
                                    <Text className="text-sm" style={{ color: COLORS.textLight }}>
                                        Contacto
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
                        </>
                    )}
                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-2 mb-2">
                    {/* Crear rutina */}
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/routine/new')}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons
                                name="add"
                                size={18}
                                color={COLORS.textLight}
                            />
                            <Text
                                className="ml-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Crear rutina
                            </Text>
                        </View>
                    </Pressable>

                    {/* Subir archivo*/}
                    <Pressable
                        className="flex-1 mx-1 px-4 py-3 rounded-xl "
                        style={{ backgroundColor: '#444444' }}
                    >
                        <View className="flex-row pl-1 items-center justify-center">
                            <Ionicons
                                name="cloud-upload-outline"
                                size={18}
                                color={COLORS.textLight}
                            />
                            <Text
                                className="ml-2 "
                                style={{ color: COLORS.textLight }}
                            >
                                Subir archivo
                            </Text>
                        </View>
                    </Pressable>

                    {/* Puntos cercanos */}
                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl "
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/nearby')}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons
                                name="location-outline"
                                size={18}
                                color={COLORS.textLight}
                            />
                            <Text
                                className="ml-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Puntos cercanos
                            </Text>
                        </View>
                    </Pressable>
                </View>



            </View >
        </SafeAreaView >
    );
}

