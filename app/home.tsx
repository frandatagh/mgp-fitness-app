// app/home.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, Pressable, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoutines, Routine, deleteRoutine } from '../lib/routines';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile, type MyProfileResponse, type UserProfile } from '../lib/profile';
import { getMyStatistics, type MyStatisticsResponse } from '../lib/statistics';
import AppHeader from '../components/AppHeader';
import AppLoading from '../components/AppLoading';
import { SlideInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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

function WeeklyProgressCard({
    currentLabel,
    progressPercent,
    onPress,
}: {
    currentLabel: string;
    progressPercent: number;
    onPress: () => void;
}) {
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const [displayPercent, setDisplayPercent] = useState(0);

    const safePercent = Math.max(0, Math.min(progressPercent, 100));

    useEffect(() => {
        animatedProgress.setValue(0);
        setDisplayPercent(0);

        const listenerId = animatedProgress.addListener(({ value }) => {
            setDisplayPercent(Math.round(value));
        });

        Animated.timing(animatedProgress, {
            toValue: safePercent,
            duration: 3000,
            useNativeDriver: false,
        }).start();

        return () => {
            animatedProgress.removeListener(listenerId);
        };
    }, [safePercent, animatedProgress]);

    const animatedBarWidth = animatedProgress.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const animatedProgressColor = animatedProgress.interpolate({
        inputRange: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        outputRange: [
            '#DC2626', // 0% rojo fuerte
            '#E11D48', // 10% rojo/rosado
            '#EA580C', // 20% naranja oscuro
            '#F97316', // 30% naranja
            '#F59E0B', // 40% ámbar
            '#FACC15', // 50% amarillo
            '#D9F99D', // 60% amarillo lima
            '#BEF264', // 70% lima suave
            '#A3E635', // 80% lima
            '#84CC16', // 90% verde lima
            '#9DFF00', // 100% verde app
        ],
        extrapolate: 'clamp',
    });

    return (
        <Pressable
            onPress={onPress}
            style={{
                position: 'absolute',
                left: 10,
                right: 10,
                bottom: 12,
                minHeight: 104,
                backgroundColor: 'rgb(26, 26, 26)',
                borderRadius: 20,
                borderWidth: 3,
                borderColor: 'rgb(68, 68, 68)',
                paddingLeft: 14,
                paddingRight: 104,
                paddingTop: 10,
                paddingBottom: 10,
                zIndex: 30,
                elevation: 30,
                overflow: 'hidden',
            }}
        >
            <Text
                style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '500',
                    marginBottom: 5,
                    marginTop: 5,
                }}
                numberOfLines={1}
            >
                {currentLabel}
            </Text>

            <View
                style={{
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: '#111111',
                    overflow: 'hidden',
                    marginBottom: 10,
                    padding: 4,
                }}
            >
                <Animated.View
                    style={{
                        height: '100%',
                        width: animatedBarWidth,
                        backgroundColor: animatedProgressColor,
                        borderRadius: 999,
                    }}
                />
            </View>

            <Text
                style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '200',
                    textAlign: 'left',
                }}
                numberOfLines={1}
            >
                Presiona para ver más de tu progreso
            </Text>

            {/* Círculo de porcentaje */}
            <Animated.View
                style={{
                    position: 'absolute',
                    right: 12,
                    top: 10,
                    width: 84,
                    height: 80,
                    borderRadius: 20,
                    backgroundColor: animatedProgressColor,
                    borderWidth: 5,
                    borderColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View
                    style={{
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 32,
                    }}
                >
                    {/* Contorno suave */}
                    <Text
                        style={{
                            position: 'absolute',
                            color: 'rgba(0,0,0,0.75)',
                            fontSize: 26,
                            fontWeight: '900',
                            lineHeight: 29,
                            transform: [{ translateX: -1 }],
                        }}
                    >
                        {displayPercent}%
                    </Text>

                    <Text
                        style={{
                            position: 'absolute',
                            color: 'rgba(0,0,0,0.75)',
                            fontSize: 26,
                            fontWeight: '900',
                            lineHeight: 29,
                            transform: [{ translateX: 1 }],
                        }}
                    >
                        {displayPercent}%
                    </Text>

                    <Text
                        style={{
                            position: 'absolute',
                            color: 'rgba(0,0,0,0.75)',
                            fontSize: 26,
                            fontWeight: '900',
                            lineHeight: 29,
                            transform: [{ translateY: -1 }],
                        }}
                    >
                        {displayPercent}%
                    </Text>

                    <Text
                        style={{
                            position: 'absolute',
                            color: 'rgba(0,0,0,0.75)',
                            fontSize: 26,
                            fontWeight: '900',
                            lineHeight: 29,
                            transform: [{ translateY: 1 }],
                        }}
                    >
                        {displayPercent}%
                    </Text>

                    {/* Texto principal */}
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontSize: 26,
                            fontWeight: '900',
                            lineHeight: 29,
                        }}
                    >
                        {displayPercent}%
                    </Text>
                </View>

                <Text
                    style={{
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: '900',
                        textAlign: 'center',
                        lineHeight: 12,
                        textShadowColor: 'rgba(0,0,0,0.75)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                    }}
                >
                    Objetivo{'\n'}cumplido
                </Text>
            </Animated.View>
        </Pressable>
    );
}

type HomeGoalProgress = {
    currentLabel: string;
    targetLabel: string;
    currentValueLabel: string;
    remainingLabel: string;
    progressPercent: number;
};

function formatGoalNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildHomeGoalProgress(
    profile?: UserProfile | null,
    stats?: MyStatisticsResponse | null
): HomeGoalProgress | null {
    if (
        !profile?.mainGoalType ||
        !profile?.mainGoalPeriod ||
        !profile?.mainGoalMetric ||
        typeof profile.mainGoalTarget !== 'number' ||
        profile.mainGoalTarget <= 0
    ) {
        return null;
    }

    const period = profile.mainGoalPeriod;
    const target = profile.mainGoalTarget;

    let currentValue: number | null = 0;
    let currentLabel = '';
    let targetLabel = '';
    let currentValueLabel = '';
    let remainingLabel = '';

    if (profile.mainGoalType === 'running') {
        if (profile.mainGoalMetric === 'distance_km') {
            currentValue =
                period === 'monthly'
                    ? (stats?.running.monthlyDistanceMeters ?? 0) / 1000
                    : (stats?.running.weeklyDistanceMeters ?? 0) / 1000;

            currentLabel = `Total kilómetros recorridos: ${currentValue.toFixed(1)}km`;
            targetLabel = `Objetivo: ${formatGoalNumber(target)}km`;
            currentValueLabel = `Recorrido: ${currentValue.toFixed(1)}km`;
            remainingLabel = `Restante: ${Math.max(target - currentValue, 0).toFixed(1)}km`;
        }

        if (profile.mainGoalMetric === 'minutes') {
            currentValue =
                period === 'monthly'
                    ? Math.round((stats?.running.monthlyDurationSeconds ?? 0) / 60)
                    : Math.round((stats?.running.weeklyDurationSeconds ?? 0) / 60);

            currentLabel = `Total minutos de running: ${currentValue}min`;
            targetLabel = `Objetivo: ${formatGoalNumber(target)}min`;
            currentValueLabel = `Acumulado: ${currentValue}min`;
            remainingLabel = `Restante: ${Math.max(target - currentValue, 0)}min`;
        }

        if (profile.mainGoalMetric === 'sessions') {
            // Temporal: usamos weeklySessions hasta separar salidas de running en backend.
            if (period === 'monthly') {
                currentValue = null;
                currentLabel = 'Total salidas de running: próximamente';
                targetLabel = `Objetivo: ${formatGoalNumber(target)} salidas`;
                currentValueLabel = 'Acumulado: No disponible todavía';
                remainingLabel = 'Restante: No disponible todavía';
            } else {
                currentValue = stats?.summary.weeklySessions ?? 0;
                currentLabel = `Total salidas de running: ${currentValue}`;
                targetLabel = `Objetivo: ${formatGoalNumber(target)} salidas`;
                currentValueLabel = `Acumulado: ${currentValue} salidas`;
                remainingLabel = `Restante: ${Math.max(target - currentValue, 0)} salidas`;
            }
        }
    }

    if (profile.mainGoalType === 'routine') {
        // Temporal: usamos weeklySessions hasta separar rutinas reales en backend.
        if (period === 'monthly') {
            currentValue = null;
            currentLabel = 'Total entrenamientos: próximamente';
            targetLabel = `Objetivo: ${formatGoalNumber(target)} entrenamientos`;
            currentValueLabel = 'Acumulado: No disponible todavía';
            remainingLabel = 'Restante: No disponible todavía';
        } else {
            currentValue = stats?.summary.weeklySessions ?? 0;
            currentLabel = `Total entrenamientos: ${currentValue}`;
            targetLabel = `Objetivo: ${formatGoalNumber(target)} entrenamientos`;
            currentValueLabel = `Acumulado: ${currentValue} entrenamientos`;
            remainingLabel = `Restante: ${Math.max(target - currentValue, 0)} entrenamientos`;
        }
    }

    const progressPercent =
        typeof currentValue === 'number'
            ? Math.min(Math.round((currentValue / target) * 100), 100)
            : 0;

    return {
        currentLabel,
        targetLabel,
        currentValueLabel,
        remainingLabel,
        progressPercent,
    };
}

export default function HomeScreen() {
    const { user, isAuthenticated, logout } = useAuth();

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loadingRoutines, setLoadingRoutines] = useState(true);
    const [routinesError, setRoutinesError] = useState<string | null>(null);

    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

    const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
    const [statsData, setStatsData] = useState<MyStatisticsResponse | null>(null);

    const displayName =
        profileDisplayName ??
        user?.name ??
        user?.email ??
        'usuario';

    const userInitials = getInitials(displayName);

    const [progressModalVisible, setProgressModalVisible] = useState(false);

    const goalProgress = useMemo(
        () => buildHomeGoalProgress(profileData?.profile, statsData),
        [profileData, statsData]
    );


    useEffect(() => {
        const loadHomeProfileAndStats = async () => {
            try {
                if (!isAuthenticated) {
                    setProfileData(null);
                    setStatsData(null);
                    setProfileImageUrl(null);
                    setProfileDisplayName(null);
                    return;
                }

                const [profile, stats] = await Promise.all([
                    getMyProfile(),
                    getMyStatistics(),
                ]);

                setProfileData(profile);
                setStatsData(stats);

                setProfileImageUrl(profile.profile.profileImageUrl);
                setProfileDisplayName(profile.user.name ?? profile.user.email);
            } catch (error) {
                console.log('Error cargando perfil/estadísticas en Home:', error);
            }
        };

        loadHomeProfileAndStats();
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
                <AppHeader profileGreeting={`Hola, ${displayName}`} />



                {/* TABS SUPERIORES */}
                <View className="flex-row justify-around mb-1 mt-4">
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
                    className="flex-1 mt-2 rounded-3xl px-3 py-3 relative"
                    style={{ borderWidth: 2, borderColor: COLORS.primary, position: 'relative', overflow: 'hidden' }}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingBottom: routines.length > 0 ? 135 : 0,
                        }}
                    >
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

                    {!loadingRoutines && routines.length > 0 && goalProgress && (
                        <>
                            <LinearGradient
                                pointerEvents="none"
                                colors={[
                                    'rgba(17,17,17,0)',
                                    'rgba(17,17,17,0.35)',
                                    'rgba(17,17,17,0.75)',
                                    '#111111',
                                ]}
                                locations={[0, 0.35, 0.72, 1]}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: 125, // queda justo arriba del panel
                                    height: 70,
                                    zIndex: 20,
                                }}
                            />

                            <View
                                pointerEvents="none"
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    height: 125,
                                    backgroundColor: '#111111',
                                    zIndex: 28,
                                }}
                            />

                            <WeeklyProgressCard
                                currentLabel={goalProgress.currentLabel}
                                progressPercent={goalProgress.progressPercent}
                                onPress={() => setProgressModalVisible(true)}
                            />
                        </>
                    )}
                </View>

                {/* BOTONES INFERIORES */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 8,
                        marginBottom: 8,
                        gap: 10,
                    }}
                >
                    {/* Crear rutina */}
                    <Pressable
                        onPress={() => router.push('/routine/new')}
                        style={({ pressed }) => ({
                            width: 78,
                            height: 55,
                            borderRadius: 16,
                            backgroundColor: 'rgb(26, 26, 26)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            borderWidth: 3,
                            borderColor: '#444444',
                        })}
                    >
                        <Ionicons
                            name="add"
                            size={40}
                            color="#FFFFFF"
                        />
                    </Pressable>

                    {/* LiveRun Mode */}
                    <Pressable
                        onPress={() => router.push('/liverun')}
                        style={({ pressed }) => ({
                            flex: 1,
                            height: 55,
                            borderRadius: 18,
                            backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            overflow: 'hidden',
                            borderWidth: 3,
                            borderColor: '#444444',
                        })}
                    >
                        <Text
                            style={{
                                color: '#111111',
                                fontSize: 16,
                                fontWeight: '700',
                                marginLeft: 2,
                                marginRight: 2,
                                marginTop: -2,
                            }}
                            numberOfLines={1}
                        >
                            Empezar carrera
                        </Text>

                        <Ionicons
                            name="play"
                            size={30}
                            color="rgb(26, 26, 26)"
                            style={{ marginTop: 2 }}
                        />
                    </Pressable>

                    {/* Estadísticas */}
                    <Pressable
                        onPress={() => router.push('/statistics')}
                        style={({ pressed }) => ({
                            width: 78,
                            height: 55,
                            borderRadius: 16,
                            borderWidth: 3,
                            borderColor: '#444444',
                            backgroundColor: 'rgb(26, 26, 26)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        })}
                    >
                        <Ionicons
                            name="stats-chart-outline"
                            size={30}
                            color="#FFFFFF"
                        />
                    </Pressable>
                </View>



            </View >
            <Modal
                visible={progressModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setProgressModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            backgroundColor: '#111111',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 19,
                                fontWeight: '900',
                                marginBottom: 8,
                            }}
                        >
                            Progreso de tu objetivo
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 19,
                                marginBottom: 14,
                            }}
                        >
                            Este progreso se calcula según el objetivo principal que definiste en tu perfil y tus registros actuales.
                        </Text>

                        {goalProgress ? (
                            <View style={{ gap: 10 }}>
                                <Text style={{ color: '#FFFFFF' }}>
                                    {goalProgress.targetLabel}
                                </Text>

                                <Text style={{ color: '#FFFFFF' }}>
                                    {goalProgress.currentValueLabel}
                                </Text>

                                <Text style={{ color: '#FFFFFF' }}>
                                    {goalProgress.remainingLabel}
                                </Text>

                                <Text style={{ color: COLORS.primary, fontWeight: '900' }}>
                                    Cumplido: {goalProgress.progressPercent}%
                                </Text>
                            </View>
                        ) : (
                            <Text style={{ color: COLORS.textMuted }}>
                                Todavía no definiste un objetivo principal en tu perfil.
                            </Text>
                        )}

                        <View
                            style={{
                                height: 16,
                                borderRadius: 999,
                                backgroundColor: '#252525',
                                overflow: 'hidden',
                                marginTop: 16,
                            }}
                        >
                            <View
                                style={{
                                    height: '100%',
                                    width: `${goalProgress?.progressPercent ?? 0}%`,
                                    backgroundColor: COLORS.primary,
                                    borderRadius: 999,
                                }}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            <Pressable
                                onPress={() => {
                                    setProgressModalVisible(false);
                                    router.push('/profile');
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: COLORS.primary,
                                    borderRadius: 14,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontWeight: '900',
                                    }}
                                >
                                    Ver perfil
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setProgressModalVisible(false)}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: 14,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontWeight: '800',
                                    }}
                                >
                                    Cerrar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

