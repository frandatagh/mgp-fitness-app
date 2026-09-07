// app/home.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, Pressable, ScrollView, Image, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RoutineCard } from '../components/RoutineCard';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getRoutines, getRoutine, Routine, deleteRoutine } from '../lib/routines';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile, type MyProfileResponse, type UserProfile } from '../lib/profile';
import { getMyStatistics, getMyAdvice, type AdviceItem, type MyStatisticsResponse } from '../lib/statistics';
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

function CreateRoutineOption({
    icon,
    title,
    description,
    onPress,
    disabled = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed
                    ? 'rgba(198,255,0,0.08)'
                    : '#1A1A1A',
                borderWidth: 1,
                borderColor: disabled
                    ? '#2A2A2A'
                    : 'rgba(198,255,0,0.22)',
                borderRadius: 18,
                padding: 13,
                marginBottom: 10,
                opacity: disabled ? 0.55 : 1,
            })}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: '#333333',
                }}
            >
                <Ionicons
                    name={icon}
                    size={24}
                    color={disabled ? COLORS.textMuted : COLORS.primary}
                />
            </View>

            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        color: COLORS.textLight,
                        fontSize: 14,
                        fontWeight: '900',
                        marginBottom: 3,
                    }}
                >
                    {title}
                </Text>

                <Text
                    style={{
                        color: COLORS.textMuted,
                        fontSize: 12,
                        lineHeight: 17,
                    }}
                >
                    {description}
                </Text>
            </View>

            <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textMuted}
            />
        </Pressable>
    );
}

function HomeHelpCard({
    icon,
    title,
    description,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',

                backgroundColor:
                    pressed
                        ? 'rgba(198,255,0,0.07)'
                        : '#181818',

                borderWidth: 1,

                borderColor:
                    pressed
                        ? 'rgba(198,255,0,0.55)'
                        : '#303030',

                borderRadius: 18,

                padding: 14,

                marginBottom: 10,
            })}
        >
            <View
                style={{
                    width: 45,
                    height: 45,

                    borderRadius: 15,

                    backgroundColor:
                        'rgba(198,255,0,0.08)',

                    borderWidth: 1,

                    borderColor:
                        'rgba(198,255,0,0.25)',

                    alignItems: 'center',
                    justifyContent: 'center',

                    marginRight: 12,
                }}
            >
                <Ionicons
                    name={icon}
                    size={23}
                    color={COLORS.primary}
                />
            </View>

            <View
                style={{
                    flex: 1,
                    minWidth: 0,
                }}
            >
                <Text
                    style={{
                        color:
                            COLORS.textLight,

                        fontSize: 14,

                        fontWeight: '900',
                    }}
                >
                    {title}
                </Text>

                <Text
                    numberOfLines={3}
                    ellipsizeMode="tail"
                    style={{
                        color:
                            COLORS.textMuted,

                        fontSize: 10,

                        lineHeight: 15,

                        marginTop: 3,
                    }}
                >
                    {description}
                </Text>
            </View>

            <Ionicons
                name="chevron-forward"
                size={18}
                color="#666666"
            />
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

    const [createRoutineModalVisible, setCreateRoutineModalVisible] = useState(false);

    const [
        routineToDelete,
        setRoutineToDelete,
    ] = useState<Routine | null>(null);

    const [
        deleteHistory,
        setDeleteHistory,
    ] = useState(false);

    const [
        deleteSaving,
        setDeleteSaving,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState<string | null>(null);

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
    const [
        activeHomeTab,
        setActiveHomeTab,
    ] = useState<0 | 1 | 2>(0);

    const [
        homePanelWidth,
        setHomePanelWidth,
    ] = useState(0);

    const homePagerRef =
        useRef<ScrollView | null>(null);

    const homeScrollX =
        useRef(
            new Animated.Value(0)
        ).current;


    // PRECAUCIONES

    const [
        precautionsVisible,
        setPrecautionsVisible,
    ] = useState(false);


    // CONSEJOS

    const [
        adviceItems,
        setAdviceItems,
    ] = useState<AdviceItem[]>([]);

    const [
        adviceLoading,
        setAdviceLoading,
    ] = useState(false);

    const [
        adviceModalVisible,
        setAdviceModalVisible,
    ] = useState(false);


    // TÉCNICA

    const [
        techniqueVisible,
        setTechniqueVisible,
    ] = useState(false);

    const [
        techniqueRoutine,
        setTechniqueRoutine,
    ] = useState<Routine | null>(null);

    const [
        techniqueLoading,
        setTechniqueLoading,
    ] = useState(false);

    const [
        techniqueError,
        setTechniqueError,
    ] = useState<string | null>(null);

    const [
        expandedExerciseId,
        setExpandedExerciseId,
    ] = useState<string | null>(null);

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

    useEffect(() => {
        if (!isAuthenticated) {
            setAdviceItems([]);
            return;
        }

        let active = true;

        const loadAdvice =
            async () => {
                try {
                    setAdviceLoading(true);

                    const result =
                        await getMyAdvice();

                    if (!active) {
                        return;
                    }

                    setAdviceItems(
                        result.items ?? []
                    );
                } catch (error) {
                    console.log(
                        'No se pudieron cargar consejos en Home:',
                        error
                    );

                    if (active) {
                        setAdviceItems([]);
                    }
                } finally {
                    if (active) {
                        setAdviceLoading(false);
                    }
                }
            };

        void loadAdvice();

        return () => {
            active = false;
        };
    }, [isAuthenticated]);



    const handleLogout = async () => {
        setSettingsOpen(false);
        await logout();
        // el efecto de arriba se encargará de mandarte a "/"
    };

    const handleRequestDeleteRoutine = (
        routine: Routine
    ) => {
        setRoutineToDelete(
            routine
        );

        /*
         * Por seguridad el borrado
         * de historial siempre comienza
         * destildado.
         */
        setDeleteHistory(false);

        setDeleteError(null);
    };

    const closeDeleteRoutineModal =
        () => {
            if (deleteSaving) {
                return;
            }

            setRoutineToDelete(null);

            setDeleteHistory(false);

            setDeleteError(null);
        };

    const handleDeleteRoutine =
        async () => {
            if (!routineToDelete?.id) {
                return;
            }

            const routineId =
                routineToDelete.id;

            try {
                setDeleteSaving(true);

                setDeleteError(null);

                const result =
                    await deleteRoutine(
                        routineId,
                        deleteHistory
                    );

                console.log(
                    'Resultado borrado rutina:',
                    result
                );

                /*
                 * La quitamos inmediatamente
                 * del Home sin necesidad
                 * de volver a consultar.
                 */
                setRoutines(
                    (current) =>
                        current.filter(
                            (routine) =>
                                routine.id !==
                                routineId
                        )
                );

                setRoutineToDelete(
                    null
                );

                setDeleteHistory(
                    false
                );

            } catch (error) {
                console.error(
                    'Error borrando rutina:',
                    error
                );

                setDeleteError(
                    'No se pudo eliminar la rutina. Intenta nuevamente.'
                );
            } finally {
                setDeleteSaving(false);
            }
        };




    const sortedRoutines = useMemo(() => {
        if (!routines.length) return [];

        return [...routines].sort((a, b) => {
            return getLastActivityTime(b) - getLastActivityTime(a);
        });
    }, [routines]);


    const latestRoutineId = sortedRoutines[0]?.id ?? null;

    const primaryRoutine =
        sortedRoutines[0] ?? null;

    const homeAdvice =
        adviceItems[0] ?? null;



    useEffect(() => {
        if (
            homePanelWidth <= 0
        ) {
            return;
        }

        homePagerRef.current?.scrollTo({
            x:
                homePanelWidth *
                activeHomeTab,

            animated: false,
        });
    }, [homePanelWidth]); 0.

    const handleOpenTechnique =
        async () => {
            setTechniqueVisible(
                true
            );

            setTechniqueRoutine(
                null
            );

            setTechniqueError(
                null
            );

            setExpandedExerciseId(
                null
            );

            if (!primaryRoutine?.id) {
                setTechniqueError(
                    'Todavía no tienes una rutina activa.'
                );

                return;
            }

            try {
                setTechniqueLoading(
                    true
                );

                const data =
                    await getRoutine(
                        primaryRoutine.id
                    );

                setTechniqueRoutine(
                    data
                );
            } catch (error) {
                console.error(
                    'Error cargando rutina para técnica:',
                    error
                );

                setTechniqueError(
                    'No pudimos cargar los ejercicios de tu rutina.'
                );
            } finally {
                setTechniqueLoading(
                    false
                );
            }
        };

    const handleExerciseYoutube =
        async (
            exerciseName: string
        ) => {
            try {
                const query =
                    encodeURIComponent(
                        `${exerciseName} técnica correcta ejercicio`
                    );

                const url =
                    `https://www.youtube.com/results?search_query=${query}`;

                await Linking.openURL(
                    url
                );
            } catch (error) {
                console.error(
                    'No se pudo abrir YouTube:',
                    error
                );
            }
        };







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

    const goToHomeTab = (
        index: 0 | 1 | 2
    ) => {
        setActiveHomeTab(index);

        if (
            homePanelWidth <= 0
        ) {
            return;
        }

        homePagerRef.current?.scrollTo({
            x:
                homePanelWidth *
                index,

            animated: true,
        });
    };

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 w-full px-4"
                style={{
                    maxWidth: 800,
                    alignSelf: 'center',
                    width: '100%',
                    minHeight: 0,
                }}
            >
                <AppHeader profileGreeting={`Nivel 6.8`} />



                {/* TABS SUPERIORES */}
                <View
                    style={{
                        marginTop: 12,
                        marginBottom: 7,

                        position: 'relative',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                        }}
                    >
                        {[
                            'Mis rutinas',
                            'Ayuda & Sugerencias',
                            'Notificaciones',
                        ].map(
                            (
                                label,
                                index
                            ) => {
                                const active =
                                    activeHomeTab ===
                                    index;

                                return (
                                    <Pressable
                                        key={label}
                                        onPress={() =>
                                            goToHomeTab(
                                                index as
                                                | 0
                                                | 1
                                                | 2
                                            )
                                        }
                                        style={{
                                            flex: 1,

                                            minWidth: 0,

                                            height: 38,

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',
                                        }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={
                                                0.78
                                            }
                                            style={{
                                                color:
                                                    active
                                                        ? COLORS.textLight
                                                        : '#777777',

                                                fontSize:
                                                    12,

                                                fontWeight:
                                                    active
                                                        ? '900'
                                                        : '700',
                                            }}
                                        >
                                            {label}
                                        </Text>
                                    </Pressable>
                                );
                            }
                        )}
                    </View>

                    {/* INDICADOR MÓVIL */}

                    {homePanelWidth > 0 && (
                        <Animated.View
                            style={{
                                position:
                                    'absolute',

                                bottom: 0,

                                left:
                                    (
                                        homePanelWidth /
                                        3
                                    ) *
                                    0.2,

                                width:
                                    (
                                        homePanelWidth /
                                        3
                                    ) *
                                    0.6,

                                height: 3,

                                borderRadius: 99,

                                backgroundColor:
                                    COLORS.primary,

                                transform: [
                                    {
                                        translateX:
                                            homeScrollX.interpolate({
                                                inputRange: [
                                                    0,

                                                    homePanelWidth,

                                                    homePanelWidth *
                                                    2,
                                                ],

                                                outputRange: [
                                                    0,

                                                    homePanelWidth /
                                                    3,

                                                    (
                                                        homePanelWidth /
                                                        3
                                                    ) *
                                                    2,
                                                ],

                                                extrapolate:
                                                    'clamp',
                                            }),
                                    },
                                ],
                            }}
                        />
                    )}
                </View>

                {/* MARCO PRINCIPAL */}
                {/* ===================================================== */}
                {/* PANEL PRINCIPAL CON 3 PESTAÑAS DESLIZABLES            */}
                {/* ===================================================== */}

                <View
                    style={{
                        flex: 1,

                        borderWidth: 2,
                        borderColor: COLORS.primary,

                        borderRadius: 24,

                        overflow: 'hidden',

                        minHeight: 0,

                        marginTop: 2,
                        marginBottom: 8,
                    }}
                >
                    {/*
     * Este View mide el ancho real
     * disponible dentro del panel.
     */}
                    <View
                        style={{
                            flex: 1,
                            minHeight: 0,
                        }}
                        onLayout={(event) => {
                            const width =
                                event.nativeEvent.layout.width;

                            if (
                                width > 0 &&
                                width !== homePanelWidth
                            ) {
                                setHomePanelWidth(width);
                            }
                        }}
                    >
                        {homePanelWidth > 0 && (
                            <Animated.ScrollView
                                ref={homePagerRef}

                                horizontal

                                pagingEnabled

                                directionalLockEnabled

                                showsHorizontalScrollIndicator={
                                    false
                                }

                                scrollEventThrottle={16}

                                style={{
                                    flex: 1,
                                }}

                                contentContainerStyle={{
                                    flexGrow: 1,
                                }}

                                onScroll={Animated.event(
                                    [
                                        {
                                            nativeEvent: {
                                                contentOffset: {
                                                    x: homeScrollX,
                                                },
                                            },
                                        },
                                    ],

                                    {
                                        useNativeDriver: false,
                                    }
                                )}

                                onMomentumScrollEnd={(
                                    event
                                ) => {
                                    const index =
                                        Math.round(
                                            event.nativeEvent
                                                .contentOffset.x /
                                            homePanelWidth
                                        );

                                    const safeIndex =
                                        Math.max(
                                            0,
                                            Math.min(
                                                2,
                                                index
                                            )
                                        ) as
                                        | 0
                                        | 1
                                        | 2;

                                    setActiveHomeTab(
                                        safeIndex
                                    );
                                }}
                            >

                                {/* ================================= */}
                                {/* PÁGINA 1 — MIS RUTINAS           */}
                                {/* ================================= */}

                                <View
                                    style={{
                                        width:
                                            homePanelWidth,

                                        flex: 1,

                                        minHeight: 0,

                                        position:
                                            'relative',
                                    }}
                                >
                                    <ScrollView
                                        style={{
                                            flex: 1,
                                        }}

                                        showsVerticalScrollIndicator={
                                            false
                                        }

                                        contentContainerStyle={{
                                            padding: 12,

                                            paddingBottom:
                                                routines.length >
                                                    0
                                                    ? 145
                                                    : 14,
                                        }}
                                    >
                                        {/* CARGANDO */}

                                        {loadingRoutines && (
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize: 13,

                                                    marginBottom: 8,
                                                }}
                                            >
                                                Cargando tus rutinas...
                                            </Text>
                                        )}

                                        {/* ERROR */}

                                        {routinesError && (
                                            <Text
                                                style={{
                                                    color:
                                                        '#FFBABA',

                                                    fontSize: 13,

                                                    marginBottom: 8,
                                                }}
                                            >
                                                {routinesError}
                                            </Text>
                                        )}

                                        {/* SIN RUTINAS */}

                                        {!loadingRoutines &&
                                            routines.length ===
                                            0 &&
                                            !routinesError && (
                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textMuted,

                                                        fontSize: 13,

                                                        lineHeight: 20,
                                                    }}
                                                >
                                                    Aún no tienes rutinas guardadas.
                                                    {'\n\n'}

                                                    Crea tu primera rutina utilizando el botón + ubicado debajo de este panel.
                                                    {'\n\n'}

                                                    También puedes elegir una rutina predeterminada desde Ayuda & Sugerencias.
                                                </Text>
                                            )}

                                        {/* RUTINAS */}

                                        {sortedRoutines.map(
                                            (routine) => (
                                                <RoutineCard
                                                    key={
                                                        routine.id
                                                    }

                                                    title={
                                                        routine.title
                                                    }

                                                    description={
                                                        routine.notes
                                                    }

                                                    highlighted={
                                                        routine.id ===
                                                        latestRoutineId
                                                    }

                                                    isRecent={
                                                        routine.id ===
                                                        latestRoutineId
                                                    }

                                                    exercisesPreview={
                                                        routine.exercises ??
                                                        []
                                                    }

                                                    onOpen={() => {
                                                        router.push({
                                                            pathname:
                                                                '/routine/[id]',

                                                            params: {
                                                                id:
                                                                    routine.id,
                                                            },
                                                        });
                                                    }}

                                                    onEdit={() => {
                                                        router.push({
                                                            pathname:
                                                                '/routine/edit/[id]',

                                                            params: {
                                                                id:
                                                                    routine.id,
                                                            },
                                                        });
                                                    }}

                                                    onDelete={() =>
                                                        handleRequestDeleteRoutine(
                                                            routine
                                                        )
                                                    }

                                                    onShare={() => {
                                                        console.log(
                                                            'Compartir / exportar rutina',
                                                            routine.id
                                                        );
                                                    }}
                                                />
                                            )
                                        )}
                                    </ScrollView>

                                    {/* PROGRESO SEMANAL */}

                                    {!loadingRoutines &&
                                        routines.length >
                                        0 &&
                                        goalProgress && (
                                            <>
                                                <LinearGradient
                                                    pointerEvents="none"

                                                    colors={[
                                                        'rgba(17,17,17,0)',
                                                        'rgba(17,17,17,0.35)',
                                                        'rgba(17,17,17,0.75)',
                                                        '#111111',
                                                    ]}

                                                    locations={[
                                                        0,
                                                        0.35,
                                                        0.72,
                                                        1,
                                                    ]}

                                                    style={{
                                                        position:
                                                            'absolute',

                                                        left: 0,
                                                        right: 0,

                                                        bottom:
                                                            125,

                                                        height: 70,

                                                        zIndex: 20,
                                                    }}
                                                />

                                                <View
                                                    pointerEvents="none"

                                                    style={{
                                                        position:
                                                            'absolute',

                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,

                                                        height: 125,

                                                        backgroundColor:
                                                            '#111111',

                                                        zIndex: 28,
                                                    }}
                                                />

                                                <WeeklyProgressCard
                                                    currentLabel={
                                                        goalProgress.currentLabel
                                                    }

                                                    progressPercent={
                                                        goalProgress.progressPercent
                                                    }

                                                    onPress={() =>
                                                        setProgressModalVisible(
                                                            true
                                                        )
                                                    }
                                                />
                                            </>
                                        )}
                                </View>


                                {/* ================================= */}
                                {/* PÁGINA 2 — AYUDA & SUGERENCIAS  */}
                                {/* ================================= */}

                                <View
                                    style={{
                                        width:
                                            homePanelWidth,

                                        flex: 1,

                                        minHeight: 0,
                                    }}
                                >
                                    <ScrollView
                                        style={{
                                            flex: 1,
                                        }}

                                        showsVerticalScrollIndicator={
                                            false
                                        }

                                        contentContainerStyle={{
                                            padding: 14,
                                            paddingBottom: 24,
                                        }}
                                    >
                                        {/* TÍTULO */}

                                        <View
                                            style={{
                                                marginBottom: 14,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textLight,

                                                    fontSize: 18,

                                                    fontWeight:
                                                        '900',
                                                }}
                                            >
                                                Ayuda & Sugerencias
                                            </Text>

                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize: 10,

                                                    lineHeight: 15,

                                                    marginTop: 4,
                                                }}
                                            >
                                                Recursos para entrenar mejor y aprovechar tus registros.
                                            </Text>
                                        </View>


                                        {/* PRECAUCIONES */}

                                        <HomeHelpCard
                                            icon="shield-checkmark-outline"

                                            title="Precauciones"

                                            description="Cuidados importantes para entrenamiento en gimnasio, running y ejercicios en casa."

                                            onPress={() =>
                                                setPrecautionsVisible(
                                                    true
                                                )
                                            }
                                        />


                                        {/* RUTINA PREDETERMINADA */}

                                        <HomeHelpCard
                                            icon="barbell-outline"

                                            title="Elegir rutina predeterminada"

                                            description="Explora las rutinas preparadas por la aplicación y guarda la que mejor se adapte a ti."

                                            onPress={() =>
                                                router.push(
                                                    '/suggestions'
                                                )
                                            }
                                        />


                                        {/* CONSEJOS */}

                                        <HomeHelpCard
                                            icon="sparkles-outline"

                                            title={
                                                homeAdvice?.title ??
                                                'Consejos personalizados'
                                            }

                                            description={
                                                adviceLoading
                                                    ? 'Analizando tus registros...'

                                                    : homeAdvice
                                                        ? homeAdvice.description

                                                        : 'Registra entrenamientos para recibir recomendaciones personalizadas.'
                                            }

                                            onPress={() =>
                                                setAdviceModalVisible(true)
                                            }
                                        />


                                        {/* MEJORAR TÉCNICA */}

                                        <HomeHelpCard
                                            icon="videocam-outline"

                                            title="Mejorar técnica"

                                            description={
                                                primaryRoutine
                                                    ? `Consulta los ejercicios de "${primaryRoutine.title}" y busca demostraciones para mejorar tu técnica.`

                                                    : 'Necesitas una rutina activa para utilizar esta función.'
                                            }

                                            onPress={
                                                handleOpenTechnique
                                            }
                                        />
                                    </ScrollView>
                                </View>


                                {/* ================================= */}
                                {/* PÁGINA 3 — NOTIFICACIONES        */}
                                {/* ================================= */}

                                <View
                                    style={{
                                        width:
                                            homePanelWidth,

                                        flex: 1,

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',

                                        padding: 28,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 72,
                                            height: 72,

                                            borderRadius: 36,

                                            backgroundColor:
                                                'rgba(198,255,0,0.08)',

                                            borderWidth: 1,

                                            borderColor:
                                                'rgba(198,255,0,0.30)',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',
                                        }}
                                    >
                                        <Ionicons
                                            name="notifications-outline"

                                            size={34}

                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    </View>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontSize: 20,

                                            fontWeight:
                                                '900',

                                            marginTop: 15,

                                            textAlign:
                                                'center',
                                        }}
                                    >
                                        Notificaciones
                                    </Text>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textMuted,

                                            fontSize: 11,

                                            lineHeight: 17,

                                            textAlign:
                                                'center',

                                            maxWidth: 290,

                                            marginTop: 7,
                                        }}
                                    >
                                        Próximamente podrás recibir recordatorios de entrenamiento, objetivos y novedades importantes.
                                    </Text>

                                    <View
                                        style={{
                                            marginTop: 16,

                                            paddingHorizontal:
                                                12,

                                            paddingVertical:
                                                6,

                                            borderRadius: 999,

                                            backgroundColor:
                                                'rgba(198,255,0,0.08)',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    COLORS.primary,

                                                fontSize: 10,

                                                fontWeight:
                                                    '900',
                                            }}
                                        >
                                            FUNCIÓN EN DESARROLLO
                                        </Text>
                                    </View>
                                </View>

                            </Animated.ScrollView>
                        )}
                    </View>
                </View>

                {/* BOTONES INFERIORES */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',

                        gap: 10,

                        paddingTop: 2,
                        paddingBottom: 6,

                        backgroundColor:
                            COLORS.background,

                        flexShrink: 0,
                    }}
                >
                    {/* Crear rutina */}
                    <Pressable
                        onPress={() => setCreateRoutineModalVisible(true)}
                        style={({ pressed }) => ({
                            width: 78,
                            height: 65,
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
                            height: 65,
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
                            RUNNING
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
                            height: 65,
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
            <Modal
                visible={createRoutineModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCreateRoutineModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.72)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 18,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 390,
                            backgroundColor: '#111111',
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: 'rgba(198,255,0,0.35)',
                            padding: 18,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 14,
                            }}
                        >
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 20,
                                        fontWeight: '900',
                                    }}
                                >
                                    Crea tu rutina
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => setCreateRoutineModalVisible(false)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: '#1A1A1A',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons
                                    name="close"
                                    size={20}
                                    color={COLORS.textLight}
                                />
                            </Pressable>
                        </View>



                        <CreateRoutineOption
                            icon="create-outline"
                            title="Crear rutina de cero"
                            description="Cargá ejercicios manualmente, uno por uno."
                            onPress={() => {
                                setCreateRoutineModalVisible(false);
                                router.push('/routine/new');
                            }}
                        />

                        <CreateRoutineOption
                            icon="camera-outline"
                            title="Escanear rutina con foto"
                            description="Sacá una foto a una rutina en papel para detectar ejercicios."
                            onPress={() => {
                                setCreateRoutineModalVisible(false);
                                router.push('/routine/scan-photo');
                            }}
                        />

                        <CreateRoutineOption
                            icon="document-attach-outline"
                            title="Subir archivo"
                            description="Importá una imagen o PDF con tu rutina."
                            onPress={() => {
                                setCreateRoutineModalVisible(false);
                                router.push('/routine/import-file');
                            }}
                        />

                        <CreateRoutineOption
                            icon="bulb-outline"
                            title="Elegir sugerencias"
                            description="Guardá una rutina recomendada desde nuestras sugerencias."
                            onPress={() => {
                                setCreateRoutineModalVisible(false);
                                router.push('/suggestions');
                            }}
                        />

                        <View
                            style={{
                                backgroundColor: 'rgba(255,193,7,0.08)',
                                borderWidth: 1,
                                borderColor: 'rgba(255,193,7,0.25)',
                                borderRadius: 16,
                                padding: 12,
                                marginTop: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#FFD36A',
                                    fontSize: 12,
                                    fontWeight: '900',
                                    marginBottom: 3,
                                }}
                            >
                                Importante
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 11,
                                    lineHeight: 16,
                                }}
                            >
                                El escaneo funcionará mejor con texto impreso, buena iluminación y papel claro. En la primera versión no se garantizará lectura correcta de manuscritos.
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={
                    routineToDelete !== null
                }
                transparent
                animationType="fade"
                onRequestClose={
                    closeDeleteRoutineModal
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.76)',

                        justifyContent:
                            'center',

                        alignItems:
                            'center',

                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 390,

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#3A3A3A',

                            padding: 18,
                        }}
                    >
                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                alignItems:
                                    'center',
                            }}
                        >
                            <View
                                style={{
                                    width: 46,
                                    height: 46,

                                    borderRadius: 23,

                                    backgroundColor:
                                        'rgba(255,80,80,0.08)',

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(255,100,100,0.35)',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={23}
                                    color="#FF8A8A"
                                />
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 18,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Eliminar rutina
                                </Text>

                                <Text
                                    numberOfLines={2}
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 3,
                                    }}
                                >
                                    {
                                        routineToDelete
                                            ?.title
                                    }
                                </Text>
                            </View>
                        </View>

                        {/* BORRADO SEGURO */}

                        <View
                            style={{
                                backgroundColor:
                                    '#181818',

                                borderRadius: 15,

                                borderWidth: 1,

                                borderColor:
                                    '#303030',

                                padding: 12,

                                marginTop: 16,
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        COLORS.textLight,

                                    fontSize: 12,

                                    fontWeight:
                                        '800',
                                }}
                            >
                                La rutina dejará de aparecer en tus rutinas.
                            </Text>

                            <Text
                                style={{
                                    color:
                                        COLORS.textMuted,

                                    fontSize: 10,

                                    lineHeight: 16,

                                    marginTop: 5,
                                }}
                            >
                                Si no seleccionas la opción inferior, tus valoraciones y registros históricos se conservarán.
                            </Text>
                        </View>

                        {/* CHECK */}

                        <Pressable
                            disabled={
                                deleteSaving
                            }
                            onPress={() =>
                                setDeleteHistory(
                                    (current) =>
                                        !current
                                )
                            }
                            style={({ pressed }) => ({
                                flexDirection:
                                    'row',

                                alignItems:
                                    'flex-start',

                                backgroundColor:
                                    deleteHistory
                                        ? 'rgba(255,80,80,0.07)'
                                        : '#181818',

                                borderRadius: 15,

                                borderWidth: 1,

                                borderColor:
                                    deleteHistory
                                        ? '#9F4747'
                                        : '#303030',

                                padding: 12,

                                marginTop: 10,

                                opacity:
                                    pressed
                                        ? 0.8
                                        : 1,
                            })}
                        >
                            <Ionicons
                                name={
                                    deleteHistory
                                        ? 'checkbox'
                                        : 'square-outline'
                                }
                                size={22}
                                color={
                                    deleteHistory
                                        ? '#FF8A8A'
                                        : '#8A8A8A'
                                }
                            />

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 9,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            deleteHistory
                                                ? '#FFAAAA'
                                                : '#CCCCCC',

                                        fontSize: 11,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Eliminar también historial y valoraciones
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            '#888888',

                                        fontSize: 9,

                                        lineHeight: 14,

                                        marginTop: 4,
                                    }}
                                >
                                    Se eliminarán en cascada los ejercicios y registros detallados asociados a esta rutina. Esta acción no se puede deshacer.
                                </Text>
                            </View>
                        </Pressable>

                        {/* ADVERTENCIA */}

                        {deleteHistory && (
                            <View
                                style={{
                                    flexDirection:
                                        'row',

                                    marginTop: 10,

                                    padding: 10,

                                    borderRadius: 12,

                                    backgroundColor:
                                        'rgba(255,80,80,0.06)',
                                }}
                            >
                                <Ionicons
                                    name="warning-outline"
                                    size={17}
                                    color="#FF8A8A"
                                />

                                <Text
                                    style={{
                                        flex: 1,

                                        color:
                                            '#C98D8D',

                                        fontSize: 9,

                                        lineHeight: 14,

                                        marginLeft: 7,
                                    }}
                                >
                                    Atención: se realizará un borrado permanente en modo Cascade. Los resúmenes históricos ya consolidados pueden conservar información agregada.
                                </Text>
                            </View>
                        )}

                        {/* ERROR */}

                        {deleteError && (
                            <Text
                                style={{
                                    color:
                                        '#FF8A8A',

                                    fontSize: 10,

                                    textAlign:
                                        'center',

                                    marginTop: 10,
                                }}
                            >
                                {deleteError}
                            </Text>
                        )}

                        {/* BOTONES */}

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                gap: 8,

                                marginTop: 16,
                            }}
                        >
                            <Pressable
                                disabled={
                                    deleteSaving
                                }
                                onPress={
                                    closeDeleteRoutineModal
                                }
                                style={({ pressed }) => ({
                                    flex: 1,

                                    height: 45,

                                    borderRadius: 13,

                                    backgroundColor:
                                        pressed
                                            ? '#303030'
                                            : '#222222',

                                    borderWidth: 1,

                                    borderColor:
                                        '#343434',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    opacity:
                                        deleteSaving
                                            ? 0.5
                                            : 1,
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            '#C7C7C7',

                                        fontSize: 11,

                                        fontWeight:
                                            '800',
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={
                                    deleteSaving
                                }
                                onPress={
                                    handleDeleteRoutine
                                }
                                style={({ pressed }) => ({
                                    flex: 1.25,

                                    height: 45,

                                    borderRadius: 13,

                                    backgroundColor:
                                        pressed
                                            ? '#E36060'
                                            : '#C84F4F',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    opacity:
                                        deleteSaving
                                            ? 0.7
                                            : 1,
                                })}
                            >
                                {deleteSaving ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Text
                                        style={{
                                            color:
                                                '#FFFFFF',

                                            fontSize: 11,

                                            fontWeight:
                                                '900',
                                        }}
                                    >
                                        {deleteHistory
                                            ? 'Eliminar todo'
                                            : 'Eliminar rutina'}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* ===================================================== */}
            {/* MODAL — PRECAUCIONES DE ENTRENAMIENTO                 */}
            {/* ===================================================== */}

            <Modal
                visible={precautionsVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setPrecautionsVisible(false)
                }
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.78)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 410,
                            maxHeight: '88%',

                            backgroundColor: '#101010',

                            borderRadius: 24,

                            borderWidth: 1,
                            borderColor: '#343434',

                            padding: 18,
                        }}
                    >
                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 15,
                            }}
                        >
                            <View
                                style={{
                                    width: 46,
                                    height: 46,

                                    borderRadius: 23,

                                    backgroundColor:
                                        'rgba(198,255,0,0.08)',

                                    borderWidth: 1,
                                    borderColor:
                                        'rgba(198,255,0,0.30)',

                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons
                                    name="shield-checkmark-outline"
                                    size={24}
                                    color={COLORS.primary}
                                />
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 19,
                                        fontWeight: '900',
                                    }}
                                >
                                    Entrena con seguridad
                                </Text>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 10,
                                        lineHeight: 14,
                                        marginTop: 3,
                                    }}
                                >
                                    Recomendaciones básicas antes y durante tu entrenamiento.
                                </Text>
                            </View>
                        </View>

                        {/* CONTENIDO */}

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingBottom: 4,
                            }}
                        >
                            {/* GIMNASIO */}

                            <View
                                style={{
                                    backgroundColor: '#181818',
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#303030',
                                    padding: 13,
                                    marginBottom: 9,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="barbell-outline"
                                        size={19}
                                        color={COLORS.primary}
                                    />

                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontSize: 13,
                                            fontWeight: '900',
                                            marginLeft: 8,
                                        }}
                                    >
                                        Entrenamiento en gimnasio
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        color: '#AAAAAA',
                                        fontSize: 10,
                                        lineHeight: 16,
                                    }}
                                >
                                    • Realiza un calentamiento progresivo antes de aumentar las cargas.
                                    {'\n\n'}
                                    • Prioriza una ejecución correcta antes de intentar levantar más peso.
                                    {'\n\n'}
                                    • Comprueba que barras, discos, bancos y máquinas estén correctamente asegurados.
                                    {'\n\n'}
                                    • Evita continuar un ejercicio si aparece dolor agudo o una sensación anormal.
                                </Text>
                            </View>

                            {/* RUNNING */}

                            <View
                                style={{
                                    backgroundColor: '#181818',
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#303030',
                                    padding: 13,
                                    marginBottom: 9,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="walk-outline"
                                        size={19}
                                        color={COLORS.primary}
                                    />

                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontSize: 13,
                                            fontWeight: '900',
                                            marginLeft: 8,
                                        }}
                                    >
                                        Running
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        color: '#AAAAAA',
                                        fontSize: 10,
                                        lineHeight: 16,
                                    }}
                                >
                                    • Aumenta distancia y ritmo de forma progresiva.
                                    {'\n\n'}
                                    • Utiliza calzado adecuado y presta atención al estado del terreno.
                                    {'\n\n'}
                                    • Considera temperatura, hidratación, tránsito y visibilidad antes de salir.
                                    {'\n\n'}
                                    • Evita zonas inseguras y procura llevar el teléfono disponible durante recorridos largos.
                                </Text>
                            </View>

                            {/* CASA */}

                            <View
                                style={{
                                    backgroundColor: '#181818',
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#303030',
                                    padding: 13,
                                    marginBottom: 9,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Ionicons
                                        name="home-outline"
                                        size={19}
                                        color={COLORS.primary}
                                    />

                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontSize: 13,
                                            fontWeight: '900',
                                            marginLeft: 8,
                                        }}
                                    >
                                        Ejercicio en casa
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        color: '#AAAAAA',
                                        fontSize: 10,
                                        lineHeight: 16,
                                    }}
                                >
                                    • Mantén suficiente espacio libre alrededor de tu cuerpo.
                                    {'\n\n'}
                                    • Evita superficies resbaladizas o elementos que puedan provocar una caída.
                                    {'\n\n'}
                                    • Revisa bandas, mancuernas, bancos y soportes antes de utilizarlos.
                                    {'\n\n'}
                                    • Si entrenas solo, evita movimientos o cargas que requieran asistencia.
                                </Text>
                            </View>

                            {/* ALERTAS */}

                            <View
                                style={{
                                    backgroundColor:
                                        'rgba(255,170,80,0.07)',

                                    borderRadius: 16,

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(255,170,80,0.25)',

                                    padding: 13,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 7,
                                    }}
                                >
                                    <Ionicons
                                        name="warning-outline"
                                        size={19}
                                        color="#FFD36A"
                                    />

                                    <Text
                                        style={{
                                            color: '#FFD36A',
                                            fontSize: 12,
                                            fontWeight: '900',
                                            marginLeft: 7,
                                        }}
                                    >
                                        Presta atención a tu cuerpo
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        color: '#B8B8B8',
                                        fontSize: 10,
                                        lineHeight: 16,
                                    }}
                                >
                                    Interrumpe el entrenamiento ante dolor intenso, mareos, desorientación, dificultad respiratoria inusual, desmayo o malestar importante.
                                </Text>
                            </View>

                            <Text
                                style={{
                                    color: '#666666',
                                    fontSize: 9,
                                    lineHeight: 14,
                                    textAlign: 'center',
                                    marginTop: 12,
                                }}
                            >
                                Estas recomendaciones son generales y no sustituyen una evaluación médica o profesional individual.
                            </Text>
                        </ScrollView>

                        {/* CERRAR */}

                        <Pressable
                            onPress={() =>
                                setPrecautionsVisible(false)
                            }
                            style={({ pressed }) => ({
                                height: 45,
                                borderRadius: 14,
                                marginTop: 14,

                                alignItems: 'center',
                                justifyContent: 'center',

                                backgroundColor:
                                    pressed
                                        ? '#B4E800'
                                        : COLORS.primary,
                            })}
                        >
                            <Text
                                style={{
                                    color: '#111111',
                                    fontSize: 12,
                                    fontWeight: '900',
                                }}
                            >
                                Entendido
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            {/* ===================================================== */}
            {/* MODAL — MEJORAR TÉCNICA                              */}
            {/* ===================================================== */}

            <Modal
                visible={techniqueVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setTechniqueVisible(false)
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.78)',

                        justifyContent:
                            'center',

                        alignItems:
                            'center',

                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 410,

                            maxHeight: '88%',

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#343434',

                            padding: 18,
                        }}
                    >
                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                alignItems:
                                    'center',

                                marginBottom: 14,
                            }}
                        >
                            <View
                                style={{
                                    width: 46,
                                    height: 46,

                                    borderRadius: 23,

                                    backgroundColor:
                                        'rgba(198,255,0,0.08)',

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(198,255,0,0.30)',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <Ionicons
                                    name="videocam-outline"
                                    size={23}
                                    color={COLORS.primary}
                                />
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 11,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 18,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Mejorar técnica
                                </Text>

                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 3,
                                    }}
                                >
                                    {techniqueRoutine?.title ??
                                        primaryRoutine?.title ??
                                        'Rutina principal'}
                                </Text>
                            </View>

                            <Pressable
                                disabled={
                                    techniqueLoading
                                }
                                onPress={() =>
                                    setTechniqueVisible(
                                        false
                                    )
                                }
                                style={({ pressed }) => ({
                                    width: 34,
                                    height: 34,

                                    borderRadius: 17,

                                    backgroundColor:
                                        pressed
                                            ? '#303030'
                                            : '#1B1B1B',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                })}
                            >
                                <Ionicons
                                    name="close"
                                    size={19}
                                    color="#AAAAAA"
                                />
                            </Pressable>
                        </View>

                        {/* TEXTO INTRODUCTORIO */}

                        <Text
                            style={{
                                color: '#888888',

                                fontSize: 10,

                                lineHeight: 15,

                                marginBottom: 12,
                            }}
                        >
                            Selecciona un ejercicio para consultar sus datos y buscar demostraciones de técnica.
                        </Text>

                        {/* CARGANDO */}

                        {techniqueLoading && (
                            <View
                                style={{
                                    paddingVertical: 38,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={COLORS.primary}
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 9,
                                    }}
                                >
                                    Cargando ejercicios...
                                </Text>
                            </View>
                        )}

                        {/* ERROR */}

                        {!techniqueLoading &&
                            techniqueError && (
                                <View
                                    style={{
                                        backgroundColor:
                                            '#181818',

                                        borderRadius: 15,

                                        borderWidth: 1,

                                        borderColor:
                                            '#303030',

                                        padding: 16,

                                        alignItems:
                                            'center',
                                    }}
                                >
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={27}
                                        color="#777777"
                                    />

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textMuted,

                                            fontSize: 11,

                                            lineHeight: 17,

                                            textAlign:
                                                'center',

                                            marginTop: 7,
                                        }}
                                    >
                                        {techniqueError}
                                    </Text>
                                </View>
                            )}

                        {/* EJERCICIOS */}

                        {!techniqueLoading &&
                            !techniqueError && (
                                <ScrollView
                                    showsVerticalScrollIndicator={
                                        false
                                    }
                                >
                                    {(
                                        techniqueRoutine
                                            ?.exercises ??
                                        []
                                    ).map(
                                        (
                                            exercise,
                                            index
                                        ) => {
                                            const exerciseKey =
                                                exercise.id ??
                                                `${exercise.name}-${index}`;

                                            const expanded =
                                                expandedExerciseId ===
                                                exerciseKey;

                                            return (
                                                <View
                                                    key={
                                                        exerciseKey
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            '#181818',

                                                        borderWidth:
                                                            1,

                                                        borderColor:
                                                            expanded
                                                                ? 'rgba(198,255,0,0.38)'
                                                                : '#303030',

                                                        borderRadius:
                                                            16,

                                                        marginBottom:
                                                            9,

                                                        overflow:
                                                            'hidden',
                                                    }}
                                                >
                                                    {/* FILA DEL EJERCICIO */}

                                                    <Pressable
                                                        onPress={() =>
                                                            setExpandedExerciseId(
                                                                expanded
                                                                    ? null
                                                                    : exerciseKey
                                                            )
                                                        }
                                                        style={({ pressed }) => ({
                                                            flexDirection:
                                                                'row',

                                                            alignItems:
                                                                'center',

                                                            paddingVertical:
                                                                12,

                                                            paddingHorizontal:
                                                                12,

                                                            backgroundColor:
                                                                pressed
                                                                    ? '#202020'
                                                                    : 'transparent',
                                                        })}
                                                    >
                                                        {/* NUMERO */}

                                                        <View
                                                            style={{
                                                                width: 30,
                                                                height: 30,

                                                                borderRadius:
                                                                    15,

                                                                backgroundColor:
                                                                    '#222222',

                                                                alignItems:
                                                                    'center',

                                                                justifyContent:
                                                                    'center',

                                                                marginRight:
                                                                    9,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color:
                                                                        COLORS.primary,

                                                                    fontSize:
                                                                        10,

                                                                    fontWeight:
                                                                        '900',
                                                                }}
                                                            >
                                                                {String(
                                                                    index +
                                                                    1
                                                                ).padStart(
                                                                    2,
                                                                    '0'
                                                                )}
                                                            </Text>
                                                        </View>

                                                        {/* NOMBRE */}

                                                        <View
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Text
                                                                numberOfLines={
                                                                    1
                                                                }
                                                                ellipsizeMode="tail"
                                                                style={{
                                                                    color:
                                                                        COLORS.textLight,

                                                                    fontSize:
                                                                        12,

                                                                    fontWeight:
                                                                        '900',
                                                                }}
                                                            >
                                                                {
                                                                    exercise.name
                                                                }
                                                            </Text>

                                                            <Text
                                                                style={{
                                                                    color:
                                                                        '#777777',

                                                                    fontSize:
                                                                        9,

                                                                    marginTop:
                                                                        2,
                                                                }}
                                                            >
                                                                {exercise.day ??
                                                                    'Sin día asignado'}
                                                            </Text>
                                                        </View>

                                                        {/* VALORACIÓN RÁPIDA */}

                                                        <Text
                                                            style={{
                                                                color:
                                                                    exercise.lastRating !=
                                                                        null
                                                                        ? COLORS.primary
                                                                        : '#666666',

                                                                fontSize:
                                                                    10,

                                                                fontWeight:
                                                                    '900',

                                                                marginRight:
                                                                    7,
                                                            }}
                                                        >
                                                            {exercise.lastRating !=
                                                                null
                                                                ? `${exercise.lastRating}/10`
                                                                : '--'}
                                                        </Text>

                                                        <Ionicons
                                                            name={
                                                                expanded
                                                                    ? 'chevron-up'
                                                                    : 'chevron-down'
                                                            }
                                                            size={17}
                                                            color="#777777"
                                                        />
                                                    </Pressable>

                                                    {/* DETALLE DESPLEGADO */}

                                                    {expanded && (
                                                        <View
                                                            style={{
                                                                borderTopWidth:
                                                                    1,

                                                                borderTopColor:
                                                                    '#292929',

                                                                padding:
                                                                    12,
                                                            }}
                                                        >
                                                            {/* SERIES + REPS */}

                                                            <View
                                                                style={{
                                                                    flexDirection:
                                                                        'row',

                                                                    gap: 8,
                                                                }}
                                                            >
                                                                <View
                                                                    style={{
                                                                        flex: 1,

                                                                        backgroundColor:
                                                                            '#111111',

                                                                        borderRadius:
                                                                            12,

                                                                        padding:
                                                                            9,

                                                                        borderWidth:
                                                                            1,

                                                                        borderColor:
                                                                            '#292929',
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                '#777777',

                                                                            fontSize:
                                                                                8,

                                                                            fontWeight:
                                                                                '900',
                                                                        }}
                                                                    >
                                                                        SERIES
                                                                    </Text>

                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                COLORS.textLight,

                                                                            fontSize:
                                                                                14,

                                                                            fontWeight:
                                                                                '900',

                                                                            marginTop:
                                                                                3,
                                                                        }}
                                                                    >
                                                                        {exercise.sets ??
                                                                            '-'}
                                                                    </Text>
                                                                </View>

                                                                <View
                                                                    style={{
                                                                        flex: 1,

                                                                        backgroundColor:
                                                                            '#111111',

                                                                        borderRadius:
                                                                            12,

                                                                        padding:
                                                                            9,

                                                                        borderWidth:
                                                                            1,

                                                                        borderColor:
                                                                            '#292929',
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                '#777777',

                                                                            fontSize:
                                                                                8,

                                                                            fontWeight:
                                                                                '900',
                                                                        }}
                                                                    >
                                                                        REPETICIONES
                                                                    </Text>

                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                COLORS.textLight,

                                                                            fontSize:
                                                                                14,

                                                                            fontWeight:
                                                                                '900',

                                                                            marginTop:
                                                                                3,
                                                                        }}
                                                                    >
                                                                        {exercise.reps ??
                                                                            '-'}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            {/* VALORACIÓN */}

                                                            <View
                                                                style={{
                                                                    flexDirection:
                                                                        'row',

                                                                    alignItems:
                                                                        'center',

                                                                    marginTop:
                                                                        11,
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="star-outline"
                                                                    size={15}
                                                                    color={
                                                                        exercise.lastRating !=
                                                                            null
                                                                            ? COLORS.primary
                                                                            : '#666666'
                                                                    }
                                                                />

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#999999',

                                                                        fontSize:
                                                                            10,

                                                                        marginLeft:
                                                                            6,
                                                                    }}
                                                                >
                                                                    Última valoración:{' '}

                                                                    <Text
                                                                        style={{
                                                                            color:
                                                                                exercise.lastRating !=
                                                                                    null
                                                                                    ? COLORS.primary
                                                                                    : '#777777',

                                                                            fontWeight:
                                                                                '900',
                                                                        }}
                                                                    >
                                                                        {exercise.lastRating !=
                                                                            null
                                                                            ? `${exercise.lastRating}/10`
                                                                            : '--'}
                                                                    </Text>
                                                                </Text>
                                                            </View>

                                                            {/* NOTAS */}

                                                            <View
                                                                style={{
                                                                    marginTop:
                                                                        10,

                                                                    paddingTop:
                                                                        9,

                                                                    borderTopWidth:
                                                                        1,

                                                                    borderTopColor:
                                                                        '#292929',
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#777777',

                                                                        fontSize:
                                                                            8,

                                                                        fontWeight:
                                                                            '900',

                                                                        marginBottom:
                                                                            4,
                                                                    }}
                                                                >
                                                                    NOTAS
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#A7A7A7',

                                                                        fontSize:
                                                                            10,

                                                                        lineHeight:
                                                                            15,
                                                                    }}
                                                                >
                                                                    {exercise.notes &&
                                                                        exercise.notes.trim()
                                                                            .length >
                                                                        0
                                                                        ? exercise.notes
                                                                        : 'Sin notas para este ejercicio.'}
                                                                </Text>
                                                            </View>

                                                            {/* YOUTUBE */}

                                                            <Pressable
                                                                onPress={() =>
                                                                    handleExerciseYoutube(
                                                                        exercise.name
                                                                    )
                                                                }
                                                                style={({ pressed }) => ({
                                                                    height:
                                                                        42,

                                                                    borderRadius:
                                                                        13,

                                                                    marginTop:
                                                                        11,

                                                                    borderWidth:
                                                                        1,

                                                                    borderColor:
                                                                        pressed
                                                                            ? COLORS.primary
                                                                            : '#343434',

                                                                    backgroundColor:
                                                                        pressed
                                                                            ? 'rgba(198,255,0,0.07)'
                                                                            : '#222222',

                                                                    flexDirection:
                                                                        'row',

                                                                    alignItems:
                                                                        'center',

                                                                    justifyContent:
                                                                        'center',
                                                                })}
                                                            >
                                                                <Ionicons
                                                                    name="logo-youtube"
                                                                    size={19}
                                                                    color="#E5E5E5"
                                                                />

                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            '#E5E5E5',

                                                                        fontSize:
                                                                            10,

                                                                        fontWeight:
                                                                            '900',

                                                                        marginLeft:
                                                                            7,
                                                                    }}
                                                                >
                                                                    Buscar videos de técnica
                                                                </Text>
                                                            </Pressable>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        }
                                    )}

                                    {(
                                        techniqueRoutine
                                            ?.exercises
                                            ?.length ??
                                        0
                                    ) === 0 && (
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize:
                                                        11,

                                                    textAlign:
                                                        'center',

                                                    paddingVertical:
                                                        24,
                                                }}
                                            >
                                                Esta rutina no tiene ejercicios cargados.
                                            </Text>
                                        )}
                                </ScrollView>
                            )}
                    </View>
                </View>
            </Modal>
            {/* ===================================================== */}
            {/* MODAL — CONSEJOS PERSONALIZADOS                      */}
            {/* ===================================================== */}

            <Modal
                visible={adviceModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setAdviceModalVisible(false)
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.78)',

                        justifyContent:
                            'center',

                        alignItems:
                            'center',

                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 410,

                            maxHeight: '88%',

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#343434',

                            padding: 18,
                        }}
                    >
                        {/* HEADER */}

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                alignItems:
                                    'center',

                                marginBottom: 14,
                            }}
                        >
                            <View
                                style={{
                                    width: 46,
                                    height: 46,

                                    borderRadius: 23,

                                    backgroundColor:
                                        'rgba(198,255,0,0.08)',

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(198,255,0,0.30)',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <Ionicons
                                    name="sparkles-outline"
                                    size={24}
                                    color={
                                        COLORS.primary
                                    }
                                />
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 11,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 18,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Consejos personalizados
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        lineHeight: 14,

                                        marginTop: 3,
                                    }}
                                >
                                    Recomendaciones basadas en tus registros y estadísticas.
                                </Text>
                            </View>
                        </View>


                        {/* CONTENIDO */}

                        {adviceLoading ? (
                            <View
                                style={{
                                    paddingVertical: 40,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={
                                        COLORS.primary
                                    }
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 9,
                                    }}
                                >
                                    Analizando tus registros...
                                </Text>
                            </View>
                        ) : adviceItems.length === 0 ? (
                            /*
                             * SIN CONSEJOS
                             */
                            <View
                                style={{
                                    backgroundColor:
                                        '#181818',

                                    borderRadius: 16,

                                    borderWidth: 1,

                                    borderColor:
                                        '#303030',

                                    padding: 18,

                                    alignItems:
                                        'center',
                                }}
                            >
                                <Ionicons
                                    name="analytics-outline"
                                    size={30}
                                    color="#777777"
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 13,

                                        fontWeight:
                                            '900',

                                        textAlign:
                                            'center',

                                        marginTop: 9,
                                    }}
                                >
                                    Todavía no hay suficientes datos
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        lineHeight: 16,

                                        textAlign:
                                            'center',

                                        marginTop: 5,
                                    }}
                                >
                                    Continúa registrando entrenamientos y valoraciones para recibir recomendaciones más personalizadas.
                                </Text>
                            </View>
                        ) : (
                            /*
                             * LISTA DE CONSEJOS
                             */
                            <ScrollView
                                showsVerticalScrollIndicator={
                                    false
                                }

                                contentContainerStyle={{
                                    paddingBottom: 4,
                                }}
                            >
                                {adviceItems.map(
                                    (
                                        advice,
                                        index
                                    ) => (
                                        <View
                                            key={
                                                `${advice.type ?? 'advice'}-${index}`
                                            }
                                            style={{
                                                backgroundColor:
                                                    '#181818',

                                                borderRadius: 16,

                                                borderWidth: 1,

                                                borderColor:
                                                    '#303030',

                                                padding: 13,

                                                marginBottom: 9,
                                            }}
                                        >
                                            {/* CABECERA CONSEJO */}

                                            <View
                                                style={{
                                                    flexDirection:
                                                        'row',

                                                    alignItems:
                                                        'flex-start',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 30,
                                                        height: 30,

                                                        borderRadius: 15,

                                                        backgroundColor:
                                                            'rgba(198,255,0,0.08)',

                                                        borderWidth: 1,

                                                        borderColor:
                                                            'rgba(198,255,0,0.22)',

                                                        alignItems:
                                                            'center',

                                                        justifyContent:
                                                            'center',

                                                        marginRight: 9,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                COLORS.primary,

                                                            fontSize: 10,

                                                            fontWeight:
                                                                '900',
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                COLORS.textLight,

                                                            fontSize: 13,

                                                            fontWeight:
                                                                '900',

                                                            lineHeight: 17,
                                                        }}
                                                    >
                                                        {advice.title}
                                                    </Text>

                                                    {advice.type && (
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.primary,

                                                                fontSize: 8,

                                                                fontWeight:
                                                                    '800',

                                                                marginTop: 3,

                                                                textTransform:
                                                                    'uppercase',

                                                                letterSpacing:
                                                                    0.5,
                                                            }}
                                                        >
                                                            {advice.type}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>

                                            {/* DESCRIPCIÓN */}

                                            <Text
                                                style={{
                                                    color:
                                                        '#A7A7A7',

                                                    fontSize: 10,

                                                    lineHeight: 16,

                                                    marginTop: 9,
                                                }}
                                            >
                                                {advice.description}
                                            </Text>
                                        </View>
                                    )
                                )}
                            </ScrollView>
                        )}


                        {/* BOTONES INFERIORES */}

                        <View
                            style={{
                                flexDirection: 'row',

                                gap: 8,

                                marginTop: 14,
                            }}
                        >
                            {/* ESTADÍSTICAS */}

                            <Pressable
                                onPress={() => {
                                    setAdviceModalVisible(
                                        false
                                    );

                                    router.push(
                                        '/statistics'
                                    );
                                }}
                                style={({ pressed }) => ({
                                    flex: 1.3,

                                    minHeight: 46,

                                    borderRadius: 14,

                                    backgroundColor:
                                        pressed
                                            ? '#B4E800'
                                            : COLORS.primary,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    paddingHorizontal:
                                        8,
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            '#111111',

                                        fontSize: 10,

                                        fontWeight:
                                            '900',

                                        textAlign:
                                            'center',
                                    }}
                                >
                                    Ver más estadísticas
                                </Text>
                            </Pressable>


                            {/* VOLVER HOME */}

                            <Pressable
                                onPress={() => {
                                    setAdviceModalVisible(
                                        false
                                    );

                                    /*
                                     * Volvemos a la primera
                                     * pestaña de Home.
                                     */
                                    goToHomeTab(0);
                                }}
                                style={({ pressed }) => ({
                                    flex: 1,

                                    minHeight: 46,

                                    borderRadius: 14,

                                    backgroundColor:
                                        pressed
                                            ? '#303030'
                                            : '#222222',

                                    borderWidth: 1,

                                    borderColor:
                                        '#343434',

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    paddingHorizontal:
                                        8,
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            '#C7C7C7',

                                        fontSize: 10,

                                        fontWeight:
                                            '800',

                                        textAlign:
                                            'center',
                                    }}
                                >
                                    Volver al Home
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

