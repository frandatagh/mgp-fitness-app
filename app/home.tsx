// app/home.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoutines, Routine, deleteRoutine } from '../lib/routines';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile } from '../lib/profile';
import AppHeader from '../components/AppHeader';
import AppLoading from '../components/AppLoading';
import { SlideInLeft } from 'react-native-reanimated';

function getLastActivityTime(routine: Routine): number {
    const dateStr =
        routine.lastDoneAt ??
        routine.updatedAt ??
        routine.createdAt ??
        '';

    return dateStr ? new Date(dateStr).getTime() : 0;
}

function getInitials(nameOrEmail: string) {
    const clean = nameOrEmail.trim();

    if (!clean) return 'U';

    if (clean.includes('@')) {
        return clean.charAt(0).toUpperCase();
    }

    const parts = clean.split(' ').filter(Boolean);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function MenuItem({
    icon,
    label,
    onPress,
    danger = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: pressed
                    ? danger
                        ? 'rgba(255,120,120,0.10)'
                        : 'rgba(198,255,0,0.08)'
                    : 'transparent',
                marginBottom: 2,
            })}
        >
            <Ionicons
                name={icon}
                size={20}
                color={danger ? '#FFBABA' : COLORS.textMuted}
                style={{ marginRight: 11 }}
            />

            <Text
                style={{
                    color: danger ? '#FFBABA' : COLORS.textLight,
                    fontSize: 14,
                    fontWeight: danger ? '800' : '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}


export default function HomeScreen() {
    const { user, isAuthenticated, logout } = useAuth();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loadingRoutines, setLoadingRoutines] = useState(true);
    const [routinesError, setRoutinesError] = useState<string | null>(null);

    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

    const displayName =
        profileDisplayName ??
        user?.name ??
        user?.email ??
        'usuario';

    const userInitials = getInitials(displayName);

    useEffect(() => {
        const loadProfileImage = async () => {
            try {
                if (!isAuthenticated) return;

                const data = await getMyProfile();

                setProfileImageUrl(data.profile.profileImageUrl);
                setProfileDisplayName(data.user.name ?? data.user.email);
            } catch (error) {
                console.log('Error cargando imagen de perfil en Home:', error);
            }
        };

        loadProfileImage();
    }, [isAuthenticated]);

    const insets = useSafeAreaInsets();

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
                <AppHeader />

                {/* SALUDO */}
                <View className="self-start px-3 mb-1">
                    <Text className="text-md text-gray-500">
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

                    <Pressable
                        className="items-center"
                        onPress={() => router.push('/suggestions')}
                    >
                        <Text style={{ color: COLORS.textMuted }}>Sugerencias</Text>
                    </Pressable>

                    <Pressable
                        className="items-center"
                        onPress={() => router.push('/statistics')}
                    >
                        <Text style={{ color: COLORS.textMuted }}>Estadísticas</Text>
                    </Pressable>

                    <Pressable
                        className="items-center"
                        onPress={() => router.push('/statistics-history')}
                    >
                        <Text style={{ color: COLORS.textMuted }}>Historial</Text>
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


                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-2 mb-2">
                    {/* Crear rutina */}
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/routine/new')}
                    >
                        <View className="flex-center text-center items-center justify-center">
                            <Ionicons
                                name="add"
                                size={25}
                                color={COLORS.textLight}
                            />
                        </View>
                    </Pressable>

                    {/* Liverun Mode*/}
                    <Pressable
                        onPress={() => router.push('/liverun')}
                        className="flex-1 px-4 py-3 rounded-xl items-center justify-center"
                        style={{
                            backgroundColor: COLORS.primary,
                            borderWidth: 2,
                            borderColor: '#C6FF00',
                        }}
                    >
                        <Text
                            className="text-[14px] font-semibold text-center"
                            style={{ color: '#111111' }}
                        >
                            RUN ALIVE
                        </Text>
                    </Pressable>

                    {/* Tus estadísticas */}
                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.push('/statistics')}
                    >
                        <View className="flex-center text-center items-center justify-center">
                            <Ionicons
                                name="stats-chart-outline"
                                size={20}
                                color={COLORS.textLight}
                            />
                        </View>
                    </Pressable>
                </View>



            </View >

        </SafeAreaView >
    );
}

