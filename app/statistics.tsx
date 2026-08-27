import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View, ActivityIndicator, Modal, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import {
    getMyStatistics,
    getMyAdvice,
    type MyStatisticsResponse,
    type AdviceItem,
} from '../lib/statistics';
import {
    getMyRunSessions,
    type RunSession,
} from '../lib/runSessions';
import {
    getStatisticsHistory,
    type StatisticsHistoryDay,
} from '../lib/statisticsHistory';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';
import {
    getRoutines,
    type Routine,
} from '../lib/routines';



function StatCard({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#1b1b1b',
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: '#2d2d2d',
            }}
        >
            <View className="flex-row items-center mb-2">
                {icon}
                <Text style={{ color: '#BDBDBD', fontSize: 12, marginLeft: 8 }}>
                    {label}
                </Text>
            </View>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                {value}
            </Text>

            {sub && (
                <Text style={{ color: '#8A8A8A', fontSize: 11, marginTop: 4 }}>
                    {sub}
                </Text>
            )}
        </View>
    );
}

function Section({
    title,
    icon,
    children,
    onLayout,
}: {
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onLayout?: (
        event: LayoutChangeEvent
    ) => void;
}) {
    return (
        <View
            onLayout={onLayout}
            style={{ marginBottom: 10 }}>
            {(title || icon) && (
                <View className="flex-row items-center mb-2">
                    {icon}

                    {title && (
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 17,
                                fontWeight: '800',
                                marginLeft: 8,
                            }}
                        >
                            {title}
                        </Text>
                    )}
                </View>
            )}

            <View
                style={{
                    backgroundColor: 'rgba(20,20,20,0.96)',
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: '#2f2f2f',
                    padding: 10,
                }}
            >
                {children}
            </View>
        </View>
    );
}

function BarRow({
    name,
    value,
}: {
    name: string;
    value: string;
}) {
    return (
        <View className="flex-row items-center mb-3">
            <Text style={{ color: '#E5E5E5', fontSize: 13, flex: 1 }}>
                {name}
            </Text>

            <View
                style={{
                    width: 90,
                    height: 12,
                    borderRadius: 8,
                    backgroundColor: '#2a2a2a',
                    overflow: 'hidden',
                    marginHorizontal: 10,
                }}
            >
                <View
                    style={{
                        width: value as `${number}%`,
                        height: '100%',
                        backgroundColor: COLORS.primary,
                        borderRadius: 8,
                    }}
                />
            </View>

            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', width: 36 }}>
                {value.replace('%', '')}
            </Text>
        </View>
    );
}
function InfoButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            style={{
                width: 22,
                height: 21,
                borderRadius: 13,
                backgroundColor: '#1f1f1f',
                borderWidth: 1,
                borderColor: '#333333',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
            }}
        >
            <Ionicons
                name="information-circle-outline"
                size={20}
                color={'#78DCE8'}
            />
        </Pressable>
    );
}

function ChartTouchOverlay<T>({
    width,
    height,
    items,
    onSelect,
}: {
    width: number;
    height: number;
    items: T[];
    onSelect: (item: T) => void;
}) {
    if (!width || items.length === 0) return null;

    const leftPadding = 42;
    const rightPadding = 22;
    const plotWidth = Math.max(width - leftPadding - rightPadding, 1);

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width,
                height,
                zIndex: 50,
            }}
        >
            {items.map((item, index) => {
                const x =
                    items.length === 1
                        ? leftPadding + plotWidth / 2
                        : leftPadding + (plotWidth * index) / (items.length - 1);

                return (
                    <Pressable
                        key={`chart-touch-${index}`}
                        onPress={() => onSelect(item)}
                        style={[
                            {
                                position: 'absolute',
                                left: x - 22,
                                top: 8,
                                width: 44,
                                height: height - 34,
                                borderRadius: 22,
                                backgroundColor: 'transparent',
                            },
                            {
                                cursor: 'pointer',
                            } as any,
                        ]}
                    />
                );
            })}
        </View>
    );
}

function AdviceCard({
    title,
    description,
    type,
}: {
    title: string;
    description: string;
    type: 'running' | 'training' | 'recovery' | 'nutrition' | 'habit';
}) {
    const config = {
        running: {
            icon: 'person-running' as const,
            color: COLORS.primary,
            badge: 'Running',
        },
        training: {
            icon: 'dumbbell' as const,
            color: '#78DCE8',
            badge: 'Rutinas',
        },
        recovery: {
            icon: 'bed' as const,
            color: '#FACC15',
            badge: 'Descanso',
        },
        nutrition: {
            icon: 'apple-whole' as const,
            color: '#FB923C',
            badge: 'Hábitos',
        },
        habit: {
            icon: 'clipboard-check' as const,
            color: '#A78BFA',
            badge: 'Hábito',
        },
    }[type];

    return (
        <View
            style={{
                backgroundColor: 'rgba(255,255,255,0.045)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                borderRadius: 18,
                padding: 14,
                marginBottom: 10,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <FontAwesome6
                    name={config.icon}
                    size={18}
                    color={config.color}
                    style={{ marginRight: 10, marginTop: 2 }}
                />

                <View style={{ flex: 1 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 5,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 14,
                                fontWeight: '900',
                                flex: 1,
                                paddingRight: 8,
                            }}
                        >
                            {title}
                        </Text>

                        <View
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                            }}
                        >
                            <Text
                                style={{
                                    color: config.color,
                                    fontSize: 9,
                                    fontWeight: '900',
                                }}
                            >
                                {config.badge}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 12,
                            lineHeight: 18,
                        }}
                    >
                        {description}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function getRoutineLastActivityTime(
    routine: Routine
) {
    const dateString =
        routine.lastDoneAt ??
        routine.updatedAt ??
        routine.createdAt ??
        '';

    return dateString
        ? new Date(dateString).getTime()
        : 0;
}

function StatisticsNavButton({
    icon,
    onPress,
    disabled = false,
}: {
    icon: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,

                height: 58,

                borderRadius: 17,

                alignItems: 'center',
                justifyContent: 'center',

                backgroundColor:
                    pressed
                        ? '#333333'
                        : '#242424',

                borderWidth: 2,
                borderColor: '#353535',

                opacity:
                    disabled
                        ? 0.45
                        : pressed
                            ? 0.8
                            : 1,
            })}
        >
            {icon}
        </Pressable>
    );
}

type StatisticsSectionKey =
    | 'insights'
    | 'running'
    | 'times'
    | 'routines'
    | 'exercises'
    | 'advice';

function StatisticsQuickButton({
    icon,
    label,
    onPress,
    active = false,
    twoRows = false,
}: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    active?: boolean;
    twoRows?: boolean;
}) {
    return (
        <View
            style={{
                flexBasis:
                    twoRows
                        ? '31%'
                        : 0,

                flexGrow: 1,

                minWidth:
                    twoRows
                        ? 82
                        : 46,

                alignItems: 'center',

                marginBottom:
                    twoRows
                        ? 8
                        : 0,
            }}
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    width: 46,
                    height: 46,

                    borderRadius: 23,

                    alignItems: 'center',
                    justifyContent: 'center',

                    backgroundColor:
                        active
                            ? 'rgba(198,255,0,0.18)'
                            : pressed
                                ? '#292929'
                                : '#1B1B1B',

                    borderWidth:
                        active
                            ? 2
                            : 1,

                    borderColor:
                        active
                            ? COLORS.primary
                            : '#343434',

                    opacity:
                        pressed
                            ? 0.82
                            : 1,

                    transform: [
                        {
                            scale:
                                active
                                    ? 0.94
                                    : 1,
                        },
                    ],
                })}
            >
                {icon}
            </Pressable>

            {/* LABEL FUERA DEL CÍRCULO */}

            <Text
                numberOfLines={1}
                style={{
                    color:
                        active
                            ? COLORS.primary
                            : '#BDBDBD',

                    fontSize: 10,
                    fontWeight: '700',

                    marginTop: 5,

                    textAlign: 'center',
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function StatisticsScreen() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/');
        }
    }, [isLoading, isAuthenticated, router]);

    const [runningChartWidth, setRunningChartWidth] = React.useState(0);

    const [runSessions, setRunSessions] = React.useState<RunSession[]>([]);
    const [runningPeriod, setRunningPeriod] = React.useState<
        'latest' | 'weekly' | 'monthly' | 'yearly'
    >('latest');

    const [selectedRunSession, setSelectedRunSession] = React.useState<RunSession | null>(null);
    const [runDetailVisible, setRunDetailVisible] = React.useState(false);

    const [historyDays, setHistoryDays] = React.useState<StatisticsHistoryDay[]>([]);
    const [routineChartWidth, setRoutineChartWidth] = React.useState(0);

    const [routinePeriod, setRoutinePeriod] = React.useState<
        'latest' | 'weekly' | 'monthly' | 'yearly'
    >('latest');

    const [adviceItems, setAdviceItems] = React.useState<AdviceItem[]>([]);
    const [adviceError, setAdviceError] = React.useState<string | null>(null);

    type RoutinePerformancePoint = {
        id: string;
        date: string;
        label: string;
        value: number;
        source: 'routine-rating' | 'exercise-average';
        routineName?: string;
        ratedExercisesCount?: number;
    };

    const [selectedRoutinePoint, setSelectedRoutinePoint] =
        React.useState<RoutinePerformancePoint | null>(null);

    const [routineDetailVisible, setRoutineDetailVisible] = React.useState(false);



    const [stats, setStats] = React.useState<MyStatisticsResponse | null>(null);
    const [loadingStats, setLoadingStats] = React.useState(true);
    const [statsError, setStatsError] = React.useState<string | null>(null);

    const [infoModalVisible, setInfoModalVisible] = React.useState(false);
    const [infoModalTitle, setInfoModalTitle] = React.useState('');
    const [infoModalText, setInfoModalText] = React.useState('');

    const statsScrollRef =
        React.useRef<ScrollView | null>(
            null
        );

    const sectionPositionsRef =
        React.useRef<
            Partial<
                Record<
                    StatisticsSectionKey,
                    number
                >
            >
        >({});

    const [
        activeQuickSection,
        setActiveQuickSection,
    ] =
        React.useState<
            StatisticsSectionKey | null
        >(null);

    const quickAccessTimerRef =
        React.useRef<
            ReturnType<typeof setTimeout> | null
        >(null);

    const [
        quickAccessWidth,
        setQuickAccessWidth,
    ] = React.useState(0);

    const [navRoutines, setNavRoutines] =
        React.useState<Routine[]>([]);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        let active = true;

        const loadNavigationRoutines =
            async () => {
                try {
                    const data =
                        await getRoutines();

                    if (!active) return;

                    setNavRoutines(
                        data ?? []
                    );
                } catch (error) {
                    console.log(
                        'No se pudo cargar la rutina reciente:',
                        error
                    );

                    if (active) {
                        setNavRoutines([]);
                    }
                }
            };

        void loadNavigationRoutines();

        return () => {
            active = false;
        };
    }, [isAuthenticated]);



    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated]);


    useEffect(() => {
        const loadStats = async () => {
            try {
                if (!isAuthenticated) return;

                setLoadingStats(true);
                setStatsError(null);

                const [statsResult, sessionsResult, historyResult, adviceResult] =
                    await Promise.allSettled([
                        getMyStatistics(),
                        getMyRunSessions(),
                        getStatisticsHistory(),
                        getMyAdvice(),
                    ]);

                if (statsResult.status === 'rejected') {
                    throw new Error('No se pudieron cargar tus estadísticas.');
                }

                if (sessionsResult.status === 'rejected') {
                    throw new Error('No se pudieron cargar tus sesiones de running.');
                }

                if (historyResult.status === 'rejected') {
                    throw new Error('No se pudo cargar tu historial de registros.');
                }

                setStats(statsResult.value);
                setRunSessions(sessionsResult.value.items ?? []);
                setHistoryDays(historyResult.value.items ?? []);

                if (adviceResult.status === 'fulfilled') {
                    setAdviceItems(adviceResult.value.items ?? []);
                    setAdviceError(null);
                } else {
                    console.log('Error cargando consejos:', adviceResult.reason);
                    setAdviceItems([]);
                    setAdviceError(
                        'No pudimos cargar los consejos en este momento. Tus estadísticas siguen disponibles.'
                    );
                }
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
                setStatsError('No se pudieron cargar tus estadísticas.');
            } finally {
                setLoadingStats(false);
            }
        };

        loadStats();
    }, [isAuthenticated]);

    const handleQuickAccess = (
        key: StatisticsSectionKey
    ) => {
        /*
         * Feedback visual inmediato.
         */
        setActiveQuickSection(key);

        /*
         * Navegamos a la sección.
         */
        scrollToStatisticsSection(key);

        /*
         * Si había otro timer,
         * lo reiniciamos.
         */
        if (
            quickAccessTimerRef.current
        ) {
            clearTimeout(
                quickAccessTimerRef.current
            );
        }

        /*
         * Después de 1 segundo
         * vuelve al color normal.
         */
        quickAccessTimerRef.current =
            setTimeout(() => {
                setActiveQuickSection(null);

                quickAccessTimerRef.current =
                    null;
            }, 1000);
    };

    useEffect(() => {
        return () => {
            if (
                quickAccessTimerRef.current
            ) {
                clearTimeout(
                    quickAccessTimerRef.current
                );
            }
        };
    }, []);

    const quickAccessTwoRows =
        quickAccessWidth > 0 &&
        quickAccessWidth < 330;

    const latestRoutineId =
        React.useMemo(() => {
            if (
                navRoutines.length === 0
            ) {
                return null;
            }

            const sorted = [
                ...navRoutines,
            ].sort(
                (a, b) =>
                    getRoutineLastActivityTime(
                        b
                    ) -
                    getRoutineLastActivityTime(
                        a
                    )
            );

            return sorted[0]?.id ?? null;
        }, [navRoutines]);

    const openLatestRoutine = () => {
        /*
         * Si todavía no existe ninguna rutina,
         * volvemos a Home, donde el usuario
         * puede crearla.
         */
        if (!latestRoutineId) {
            router.replace('/home');
            return;
        }

        router.push({
            pathname: '/routine/[id]',
            params: {
                id: latestRoutineId,
            },
        });
    };


    const openInfoModal = (title: string, text: string) => {
        setInfoModalTitle(title);
        setInfoModalText(text);
        setInfoModalVisible(true);
    };

    const formatStatDistance = (meters?: number | null) => {
        if (!meters) return '--';
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(2)} km`;
    };

    const formatStatDuration = (totalSeconds?: number | null) => {
        if (!totalSeconds) return '--';

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatStatPace = (seconds?: number | null) => {
        if (!seconds) return '--';

        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);

        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatStatSpeed = (speedMps?: number | null) => {
        if (!speedMps) return '--';
        return `${(speedMps * 3.6).toFixed(1)} km/h`;
    };

    const formatRating = (value?: number | null) => {
        if (value == null) return '--';
        return `${value.toFixed(1)} / 10`;
    };

    const toPercent = (value?: number | null) => {
        if (value == null) return '0%';
        return `${Math.min(100, Math.max(0, Math.round(value * 10)))}%` as `${number}%`;
    };

    const getSessionDate = (session: RunSession) => {
        return new Date(session.startedAt ?? session.createdAt);
    };

    const getRunSessionRating = (session: RunSession) => {
        const rating =
            (session as any).rating ??
            (session as any).valuation ??
            (session as any).effort ??
            null;

        if (rating == null) return null;

        const value = Number(rating);

        return Number.isNaN(value) ? null : value;
    };

    const filteredRunningSessions = React.useMemo(() => {
        const sorted = [...runSessions]
            .filter((session) => getRunSessionRating(session) != null)
            .sort(
                (a, b) => getSessionDate(b).getTime() - getSessionDate(a).getTime()
            );

        const now = new Date();

        if (runningPeriod === 'latest') {
            return sorted.slice(0, 8).reverse();
        }

        const filtered = sorted.filter((session) => {
            const date = getSessionDate(session);
            const diffDays =
                (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

            if (runningPeriod === 'weekly') {
                return diffDays <= 7;
            }

            if (runningPeriod === 'monthly') {
                return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                );
            }

            if (runningPeriod === 'yearly') {
                return date.getFullYear() === now.getFullYear();
            }

            return true;
        });

        return filtered.reverse();
    }, [runSessions, runningPeriod]);

    const runningChartLabels = filteredRunningSessions.length
        ? filteredRunningSessions.map((session, index) => {
            const date = getSessionDate(session);

            if (runningPeriod === 'latest') {
                return String(index + 1);
            }

            return `${date.getDate()}/${date.getMonth() + 1}`;
        })
        : ['1'];

    const runningOnlyChartData = filteredRunningSessions.length
        ? filteredRunningSessions.map((session) => getRunSessionRating(session) ?? 0)
        : [0];

    const openRunSessionDetail = (session: RunSession) => {
        setSelectedRunSession(session);
        setRunDetailVisible(true);
    };


    const routinePerformancePoints = React.useMemo<RoutinePerformancePoint[]>(() => {
        const points: RoutinePerformancePoint[] = [];

        historyDays.forEach((day) => {
            const routineRecords = day.records.filter(
                (record) => record.type === 'routine' && record.rating != null
            );

            const exerciseRecords = day.records.filter(
                (record) => record.type === 'exercise' && record.rating != null
            );

            if (routineRecords.length > 0) {
                routineRecords.forEach((record) => {
                    points.push({
                        id: record.id,
                        date: day.date,
                        label: day.label,
                        value: Number(record.rating),
                        source: 'routine-rating',
                        routineName: record.title,
                    });
                });

                return;
            }

            if (exerciseRecords.length > 0) {
                const ratings = exerciseRecords
                    .map((record) => Number(record.rating))
                    .filter((value) => !Number.isNaN(value));

                if (ratings.length === 0) return;

                const avg =
                    ratings.reduce((sum, value) => sum + value, 0) / ratings.length;

                points.push({
                    id: `exercise-average-${day.date}`,
                    date: day.date,
                    label: day.label,
                    value: Number(avg.toFixed(1)),
                    source: 'exercise-average',
                    ratedExercisesCount: ratings.length,
                });
            }
        });

        return points.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [historyDays]);

    const filteredRoutinePoints = React.useMemo(() => {
        const sorted = [...routinePerformancePoints].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const now = new Date();

        if (routinePeriod === 'latest') {
            return sorted.slice(0, 8).reverse();
        }

        const filtered = sorted.filter((point) => {
            const date = new Date(point.date);
            const diffDays =
                (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

            if (routinePeriod === 'weekly') {
                return diffDays <= 7;
            }

            if (routinePeriod === 'monthly') {
                return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                );
            }

            if (routinePeriod === 'yearly') {
                return date.getFullYear() === now.getFullYear();
            }

            return true;
        });

        return filtered.reverse();
    }, [routinePerformancePoints, routinePeriod]);

    const routineChartLabels = filteredRoutinePoints.length
        ? filteredRoutinePoints.map((point, index) => {
            const date = new Date(point.date);

            if (routinePeriod === 'latest') {
                return String(index + 1);
            }

            return `${date.getDate()}/${date.getMonth() + 1}`;
        })
        : ['1'];

    const routineChartData = filteredRoutinePoints.length
        ? filteredRoutinePoints.map((point) => point.value)
        : [0];

    const openRoutinePointDetail = (point: RoutinePerformancePoint) => {
        setSelectedRoutinePoint(point);
        setRoutineDetailVisible(true);
    };

    const getRunningAverageByDays = (days: number) => {
        const now = new Date();

        const ratedSessions = runSessions
            .filter((session) => {
                const rating = getRunSessionRating(session);
                if (rating == null) return false;

                const date = getSessionDate(session);
                const diffDays =
                    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

                return diffDays <= days;
            })
            .map((session) => getRunSessionRating(session))
            .filter((rating): rating is number => rating != null);

        if (ratedSessions.length === 0) return null;

        const avg =
            ratedSessions.reduce((sum, rating) => sum + rating, 0) /
            ratedSessions.length;

        return Number(avg.toFixed(1));
    };

    const runningWeeklyAverage = React.useMemo(
        () => getRunningAverageByDays(7),
        [runSessions]
    );

    const runningMonthlyAverage = React.useMemo(
        () => getRunningAverageByDays(30),
        [runSessions]
    );

    const runningYearlyAverage = React.useMemo(
        () => getRunningAverageByDays(365),
        [runSessions]
    );

    const totalHistoricalSessions = React.useMemo(() => {
        const runningCount = runSessions.length;
        const routineCount = routinePerformancePoints.length;

        return runningCount + routineCount;
    }, [runSessions, routinePerformancePoints]);

    const historicalEffortAverage = React.useMemo(() => {
        const runningRatings = runSessions
            .map((session) => getRunSessionRating(session))
            .filter((rating): rating is number => rating != null);

        const routineRatings = routinePerformancePoints
            .map((point) => point.value)
            .filter((value) => value != null && !Number.isNaN(value));

        const allRatings = [...runningRatings, ...routineRatings];

        if (allRatings.length === 0) return null;

        const avg =
            allRatings.reduce((sum, value) => sum + value, 0) / allRatings.length;

        return Number(avg.toFixed(1));
    }, [runSessions, routinePerformancePoints]);

    const totalHistoricalDistanceMeters =
        stats?.summary.totalDistanceMeters ?? 0;


    const runningTotalDurationSeconds = React.useMemo(() => {
        return runSessions.reduce((sum, session) => {
            return sum + (session.durationSeconds ?? 0);
        }, 0);
    }, [runSessions]);

    const runningAverageMaxSpeedMps = React.useMemo(() => {
        const speeds = runSessions
            .map((session) => session.maxSpeedMps)
            .filter((value): value is number => value != null && !Number.isNaN(value));

        if (speeds.length === 0) return null;

        const avg = speeds.reduce((sum, value) => sum + value, 0) / speeds.length;

        return avg;
    }, [runSessions]);

    const runningHistoricalAvgPaceSecPerKm = React.useMemo(() => {
        const totalDistanceMeters = runSessions.reduce((sum, session) => {
            return sum + (session.distanceMeters ?? 0);
        }, 0);

        const totalDurationSeconds = runSessions.reduce((sum, session) => {
            return sum + (session.durationSeconds ?? 0);
        }, 0);

        if (totalDistanceMeters <= 0 || totalDurationSeconds <= 0) return null;

        return totalDurationSeconds / (totalDistanceMeters / 1000);
    }, [runSessions]);

    const runningYearlyDistanceMeters = React.useMemo(() => {
        const now = new Date();

        return runSessions.reduce((sum, session) => {
            const date = getSessionDate(session);
            const diffDays =
                (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

            if (diffDays <= 365) {
                return sum + (session.distanceMeters ?? 0);
            }

            return sum;
        }, 0);
    }, [runSessions]);

    function getInsightStyle(type: 'positive' | 'warning' | 'neutral') {
        if (type === 'positive') {
            return {
                icon: 'checkmark-circle-outline' as const,
                iconColor: COLORS.primary,
                borderColor: 'rgba(198,255,0,0.35)',
                backgroundColor: 'rgba(198,255,0,0.08)',
                badgeText: 'Positivo',
            };
        }

        if (type === 'warning') {
            return {
                icon: 'alert-circle-outline' as const,
                iconColor: '#FACC15',
                borderColor: 'rgba(250,204,21,0.35)',
                backgroundColor: 'rgba(250,204,21,0.08)',
                badgeText: 'Atención',
            };
        }

        return {
            icon: 'information-circle-outline' as const,
            iconColor: '#78DCE8',
            borderColor: 'rgba(120,220,232,0.35)',
            backgroundColor: 'rgba(120,220,232,0.08)',
            badgeText: 'Dato',
        };
    }

    function InsightCard({
        title,
        description,
        type,
    }: {
        title: string;
        description: string;
        type: 'positive' | 'warning' | 'neutral';
    }) {
        const style = getInsightStyle(type);

        return (
            <View
                style={{
                    backgroundColor: style.backgroundColor,
                    borderWidth: 1,
                    borderColor: style.borderColor,
                    borderRadius: 18,
                    padding: 14,
                    marginBottom: 10,
                }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                    }}
                >
                    <Ionicons
                        name={style.icon}
                        size={22}
                        color={style.iconColor}
                        style={{ marginRight: 10, marginTop: 1 }}
                    />

                    <View style={{ flex: 1 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 14,
                                    fontWeight: '900',
                                    flex: 1,
                                    paddingRight: 8,
                                }}
                            >
                                {title}
                            </Text>

                            <View
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    borderRadius: 999,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                }}
                            >
                                <Text
                                    style={{
                                        color: style.iconColor,
                                        fontSize: 9,
                                        fontWeight: '900',
                                    }}
                                >
                                    {style.badgeText}
                                </Text>
                            </View>
                        </View>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            {description}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const registerSectionPosition = (
        key: StatisticsSectionKey,
        event: LayoutChangeEvent
    ) => {
        sectionPositionsRef.current[key] =
            event.nativeEvent.layout.y;
    };

    const scrollToStatisticsSection = (
        key: StatisticsSectionKey
    ) => {
        const y =
            sectionPositionsRef.current[key];

        if (y == null) {
            return;
        }

        statsScrollRef.current?.scrollTo({
            y: Math.max(
                0,
                y - 10
            ),
            animated: true,
        });
    };

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

    if (!isLoading && !isAuthenticated) {
        return null;
    }

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 w-full px-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                <View className='px-2'>
                    <AppHeader showProfile={false} />
                </View>


                <Text
                    className="ml-5 pl-1 pb-1 text-md text-gray-500"
                >
                    Tus estadísticas
                </Text>

                <View
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                        borderRadius: 22,
                        backgroundColor: '#101010',
                        marginHorizontal: 8,
                        marginTop: 10,
                        flex: 1,
                        overflow: 'hidden',
                    }}
                >
                    <ScrollView
                        ref={statsScrollRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            padding: 18,
                            paddingBottom: 100,
                        }}
                    >
                        {loadingStats && (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>
                                    Cargando estadísticas...
                                </Text>
                            </View>
                        )}

                        {statsError && !loadingStats && (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#FF6B6B', textAlign: 'center' }}>
                                    {statsError}
                                </Text>
                            </View>
                        )}

                        {!loadingStats && !statsError && (
                            <>
                                <Text className="text-gray-200 ml-1 mb-5 mt-2" style={{ fontSize: 13 }}>
                                    Aquí podrás visualizar la evolución de tus entrenamientos, running y valoraciones personales.
                                    Las estadísticas se generan automáticamente a partir de tus registros y te ayudarán a comprender
                                    tu rendimiento, constancia y nivel de esfuerzo con el paso del tiempo.
                                    {"\n"}{"\n"}
                                    También podrás acceder al historial completo de registros para revisar o eliminar sesiones si lo deseas.
                                </Text>

                                <View
                                    style={{
                                        marginBottom: 30,
                                    }}
                                >


                                    <View
                                        onLayout={(event) => {
                                            setQuickAccessWidth(
                                                event.nativeEvent.layout.width
                                            );
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap:
                                                quickAccessTwoRows
                                                    ? 'wrap'
                                                    : 'nowrap',

                                            alignItems: 'flex-start',

                                            justifyContent:
                                                'space-between',

                                            gap: 5,

                                            paddingHorizontal: 2,
                                        }}
                                    >
                                        {/* INSIGHT */}

                                        <StatisticsQuickButton
                                            label="Insights"
                                            active={
                                                activeQuickSection ===
                                                'insights'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'insights'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="bulb-outline"
                                                    size={21}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />

                                        {/* RUNNING */}

                                        <StatisticsQuickButton
                                            label="Running"
                                            active={
                                                activeQuickSection ===
                                                'running'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'running'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="analytics-outline"
                                                    size={21}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />

                                        {/* TIEMPOS */}

                                        <StatisticsQuickButton
                                            label="Tiempos"
                                            active={
                                                activeQuickSection ===
                                                'times'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'times'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="stopwatch-outline"
                                                    size={21}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />

                                        {/* RUTINAS */}

                                        <StatisticsQuickButton
                                            label="Rutinas"
                                            active={
                                                activeQuickSection ===
                                                'routines'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'routines'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="trending-up-outline"
                                                    size={21}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />

                                        {/* EJERCICIOS */}

                                        <StatisticsQuickButton
                                            label="Ejercicios"
                                            active={
                                                activeQuickSection ===
                                                'exercises'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'exercises'
                                                )
                                            }
                                            icon={
                                                <FontAwesome6
                                                    name="dumbbell"
                                                    size={19}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />

                                        {/* CONSEJOS */}

                                        <StatisticsQuickButton
                                            label="Consejos"
                                            active={
                                                activeQuickSection ===
                                                'advice'
                                            }
                                            twoRows={
                                                quickAccessTwoRows
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'advice'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="compass-outline"
                                                    size={21}
                                                    color={COLORS.primary}
                                                />
                                            }
                                        />
                                    </View>
                                </View>


                                <Section>
                                    <Text className="ml-2 mb-2 text-md font-bold" style={{ color: '#fff' }}>
                                        Resumen general
                                    </Text>
                                    <View className="flex-row" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="fitness-outline" size={17} color={COLORS.primary} />}
                                            label="Total histórico"
                                            value={String(totalHistoricalSessions)}
                                            sub="running, rutinas y ejercicios"
                                        />

                                        <StatCard
                                            icon={<Ionicons name="walk-outline" size={17} color="#78DCE8" />}
                                            label="Km recorridos"
                                            value={formatStatDistance(totalHistoricalDistanceMeters)}
                                            sub="total histórico running"
                                        />
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="star-outline" size={17} color={COLORS.primary} />}
                                            label="Promedio histórico de esfuerzo"
                                            value={formatRating(historicalEffortAverage)}
                                            sub="promedio general de running y rutinas"
                                        />
                                    </View>
                                </Section>

                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'insights',
                                            event
                                        )
                                    }
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginHorizontal: 10,
                                            marginTop: 6,
                                            marginBottom: 15,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <Ionicons
                                                name="bulb-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{ marginRight: 10 }}
                                            />

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    className="text-md font-bold" style={{ color: '#fff' }}
                                                >
                                                    Insights
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Lectura automática de tus datos recientes
                                                </Text>
                                            </View>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Insights',
                                                    'Los insights son observaciones automáticas basadas en tus datos de entrenamiento.\n\nNo son consejos todavía: primero muestran qué está pasando con tu actividad, esfuerzo, running y rutinas.\n\nMás adelante, la sección de consejos usará estos datos para darte recomendaciones prácticas.'
                                                )
                                            }
                                        />
                                    </View>

                                    {stats?.insights?.length ? (
                                        <View>
                                            {stats.insights.map((insight) => (
                                                <InsightCard
                                                    key={insight.id}
                                                    title={insight.title}
                                                    description={insight.description}
                                                    type={insight.type}
                                                />
                                            ))}
                                        </View>
                                    ) : (
                                        <View
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.08)',
                                                borderRadius: 18,
                                                padding: 16,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Ionicons
                                                name="analytics-outline"
                                                size={28}
                                                color={COLORS.textMuted}
                                            />

                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 14,
                                                    fontWeight: '800',
                                                    textAlign: 'center',
                                                    marginTop: 10,
                                                }}
                                            >
                                                Todavía no hay insights suficientes
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                    textAlign: 'center',
                                                    marginTop: 6,
                                                }}
                                            >
                                                A medida que registres sesiones, rutinas y valoraciones, la app podrá detectar patrones en tu entrenamiento.
                                            </Text>
                                        </View>
                                    )}
                                </Section>

                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'running',
                                            event
                                        )
                                    }
                                >
                                    <View className="flex-row m-2 pb-2 items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Ionicons
                                                name="analytics-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{
                                                    marginRight: 10,
                                                }}
                                            />

                                            <Text className="text-md font-bold" style={{ color: '#fff' }}>
                                                Rendimiento de tus sesiones
                                            </Text>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Rendimiento Running',
                                                    'Este gráfico muestra solamente tus sesiones de running.\n\nCada punto representa una sesión y su valoración registrada de 1 a 10.\n\nPodés cambiar el período entre últimas sesiones, semana, mes o año.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            gap: 4,
                                            marginBottom: 12,
                                            paddingHorizontal: 6,
                                        }}
                                    >
                                        {[
                                            { key: 'latest', label: 'Últimas' },
                                            { key: 'weekly', label: 'Semanal' },
                                            { key: 'monthly', label: 'Mensual' },
                                            { key: 'yearly', label: 'Anual' },
                                        ].map((item) => {
                                            const active = runningPeriod === item.key;

                                            return (
                                                <Pressable
                                                    key={item.key}
                                                    onPress={() => setRunningPeriod(item.key as any)}
                                                    style={{
                                                        paddingVertical: 3,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 10,
                                                        backgroundColor: active ? COLORS.primary : '#1b1b1b',
                                                        borderWidth: 1,
                                                        borderColor: active ? COLORS.primary : '#333333',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: active ? '#111111' : COLORS.textLight,
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    <View
                                        style={{ marginTop: 6, width: '100%', position: 'relative' }}
                                        onLayout={(event) => {
                                            const width = event.nativeEvent.layout.width;
                                            setRunningChartWidth(width);
                                        }}
                                    >
                                        {runningChartWidth > 0 && filteredRunningSessions.length > 0 && (
                                            <LineChart
                                                data={{
                                                    labels: runningChartLabels,
                                                    datasets: [
                                                        {
                                                            data: runningOnlyChartData,
                                                            color: () => COLORS.primary,
                                                            strokeWidth: 3,
                                                        },
                                                    ],
                                                }}
                                                width={runningChartWidth}
                                                height={180}
                                                fromZero
                                                yAxisInterval={1}
                                                chartConfig={{
                                                    backgroundGradientFrom: '#151515',
                                                    backgroundGradientTo: '#151515',
                                                    decimalPlaces: 1,
                                                    color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                                                    labelColor: (opacity = 1) => `rgba(189,189,189,${opacity})`,
                                                    propsForDots: {
                                                        r: '5',
                                                        strokeWidth: '2',
                                                        stroke: '#111',
                                                    },
                                                    propsForBackgroundLines: {
                                                        stroke: 'rgba(255,255,255,0.08)',
                                                    },
                                                }}
                                                bezier
                                                onDataPointClick={({ index }) => {
                                                    const session = filteredRunningSessions[index];

                                                    if (session) {
                                                        openRunSessionDetail(session);
                                                    }
                                                }}

                                                style={{
                                                    borderRadius: 18,
                                                    marginLeft: -8,
                                                }}
                                            />
                                        )}
                                        {runningChartWidth > 0 && filteredRunningSessions.length > 0 && (
                                            <ChartTouchOverlay
                                                width={runningChartWidth}
                                                height={180}
                                                items={filteredRunningSessions}
                                                onSelect={openRunSessionDetail}
                                            />
                                        )}
                                        {filteredRunningSessions.length === 0 && (
                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    textAlign: 'center',
                                                    marginTop: 12,
                                                }}
                                            >
                                                Aún no hay sesiones de running valoradas para mostrar.
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ marginTop: 12 }}>
                                        <View className="flex-row" style={{ gap: 10 }}>
                                            <StatCard
                                                icon={<Ionicons name="calendar-outline" size={17} color={COLORS.primary} />}
                                                label="Prom. semanal"
                                                value={formatRating(runningWeeklyAverage)}
                                                sub="últimos 7 días"
                                            />

                                            <StatCard
                                                icon={<Ionicons name="calendar-number-outline" size={17} color="#78DCE8" />}
                                                label="Prom. mensual"
                                                value={formatRating(runningMonthlyAverage)}
                                                sub="últimos 30 días"
                                            />
                                        </View>

                                        <View style={{ marginTop: 10 }}>
                                            <StatCard
                                                icon={<Ionicons name="stats-chart-outline" size={17} color={COLORS.primary} />}
                                                label="Promedio anual"
                                                value={formatRating(runningYearlyAverage)}
                                                sub="últimos 365 días"
                                            />
                                        </View>
                                    </View>
                                </Section>
                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'times',
                                            event
                                        )
                                    }
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginVertical: 8,
                                            marginHorizontal: 6,
                                            paddingBottom: 8,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <Ionicons
                                                name="stopwatch-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{
                                                    marginRight: 10,
                                                }}
                                            />

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    className="text-md font-bold" style={{ color: '#fff' }}
                                                >
                                                    Detalles de Running
                                                </Text>
                                            </View>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Running',
                                                    'Esta tarjeta resume tus tiempos, velocidad, ritmo y distancias de running.\n\nEl ritmo indica cuánto tardás en recorrer 1 km. Por ejemplo, 06:20 /km significa 6 minutos y 20 segundos por kilómetro.\n\nEn ritmo, cuanto menor es el número, mejor es el rendimiento.'
                                                )
                                            }
                                        />
                                    </View>

                                    <View className="flex-row" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="time-outline" size={17} color={COLORS.primary} />}
                                            label="Tiempo semanal"
                                            value={formatStatDuration(stats?.running.weeklyDurationSeconds ?? 0)}
                                            sub="últimos 7 días"
                                        />

                                        <StatCard
                                            icon={<Ionicons name="calendar-outline" size={17} color="#78DCE8" />}
                                            label="Tiempo mensual"
                                            value={formatStatDuration(stats?.running.monthlyDurationSeconds ?? 0)}
                                            sub="últimos 30 días"
                                        />
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="timer-outline" size={17} color={COLORS.primary} />}
                                            label="Tiempo total"
                                            value={formatStatDuration(runningTotalDurationSeconds)}
                                            sub="histórico de running"
                                        />
                                    </View>

                                    <View className="flex-row mt-3" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="flash-outline" size={17} color="#78DCE8" />}
                                            label="Vel. máxima"
                                            value={formatStatSpeed(runningAverageMaxSpeedMps)}
                                            sub="promedio histórico"
                                        />

                                        <StatCard
                                            icon={<Ionicons name="speedometer-outline" size={17} color={COLORS.primary} />}
                                            label="Ritmo promedio"
                                            value={
                                                runningHistoricalAvgPaceSecPerKm != null
                                                    ? `${formatStatPace(runningHistoricalAvgPaceSecPerKm)} /km`
                                                    : '--'
                                            }
                                            sub="promedio histórico"
                                        />
                                    </View>

                                    <View className="flex-row mt-3" style={{ gap: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="walk-outline" size={17} color={COLORS.primary} />}
                                            label="Distancia semanal"
                                            value={formatStatDistance(stats?.running.weeklyDistanceMeters ?? 0)}
                                            sub="últimos 7 días"
                                        />

                                        <StatCard
                                            icon={<Ionicons name="map-outline" size={17} color="#78DCE8" />}
                                            label="Distancia mensual"
                                            value={formatStatDistance(stats?.running.monthlyDistanceMeters ?? 0)}
                                            sub="últimos 30 días"
                                        />
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <StatCard
                                            icon={<Ionicons name="earth-outline" size={17} color={COLORS.primary} />}
                                            label="Distancia anual"
                                            value={formatStatDistance(runningYearlyDistanceMeters)}
                                            sub="últimos 365 días"
                                        />
                                    </View>
                                </Section>

                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'routines',
                                            event
                                        )
                                    }
                                >
                                    <View className="flex-row m-2 pb-2 items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Ionicons
                                                name="trending-up-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{
                                                    marginRight: 10,
                                                }}
                                            />

                                            <Text className="text-md font-bold" style={{ color: '#fff' }}>
                                                Evolución de rutinas
                                            </Text>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Rendimiento de rutinas',
                                                    'Este gráfico muestra la evolución de tus entrenamientos de gimnasio.\n\nSi valoraste una rutina completa, se usa esa valoración.\n\nSi no valoraste la rutina pero sí los ejercicios, se usa el promedio de los ejercicios valorados.\n\nLos entrenamientos sin valoración no aparecen en el gráfico.'
                                                )
                                            }
                                        />
                                    </View>



                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            gap: 4,
                                            marginBottom: 12,
                                            paddingHorizontal: 6,
                                        }}
                                    >
                                        {[
                                            { key: 'latest', label: 'Últimas' },
                                            { key: 'weekly', label: 'Semanal' },
                                            { key: 'monthly', label: 'Mensual' },
                                            { key: 'yearly', label: 'Anual' },
                                        ].map((item) => {
                                            const active = routinePeriod === item.key;

                                            return (
                                                <Pressable
                                                    key={item.key}
                                                    onPress={() => setRoutinePeriod(item.key as any)}
                                                    style={{
                                                        paddingVertical: 3,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 10,
                                                        backgroundColor: active ? COLORS.primary : '#1b1b1b',
                                                        borderWidth: 1,
                                                        borderColor: active ? COLORS.primary : '#333333',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: active ? '#111111' : COLORS.textLight,
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    <View
                                        style={{ marginTop: 6, width: '100%', position: 'relative' }}
                                        onLayout={(event) => {
                                            const width = event.nativeEvent.layout.width;
                                            setRoutineChartWidth(width);
                                        }}
                                    >
                                        {routineChartWidth > 0 && filteredRoutinePoints.length > 0 && (
                                            <LineChart
                                                data={{
                                                    labels: routineChartLabels,
                                                    datasets: [
                                                        {
                                                            data: routineChartData,
                                                            color: () => '#78DCE8',
                                                            strokeWidth: 3,
                                                        },
                                                    ],
                                                }}
                                                width={routineChartWidth}
                                                height={180}
                                                fromZero
                                                yAxisInterval={1}
                                                chartConfig={{
                                                    backgroundGradientFrom: '#151515',
                                                    backgroundGradientTo: '#151515',
                                                    decimalPlaces: 1,
                                                    color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                                                    labelColor: (opacity = 1) => `rgba(189,189,189,${opacity})`,
                                                    propsForDots: {
                                                        r: '5',
                                                        strokeWidth: '2',
                                                        stroke: '#111',
                                                    },
                                                    propsForBackgroundLines: {
                                                        stroke: 'rgba(255,255,255,0.08)',
                                                    },
                                                }}
                                                bezier
                                                onDataPointClick={({ index }) => {
                                                    const point = filteredRoutinePoints[index];

                                                    if (point) {
                                                        openRoutinePointDetail(point);
                                                    }
                                                }}

                                                style={{
                                                    borderRadius: 18,
                                                    marginLeft: -8,
                                                }}
                                            />
                                        )}
                                        {routineChartWidth > 0 && filteredRoutinePoints.length > 0 && (
                                            <ChartTouchOverlay
                                                width={routineChartWidth}
                                                height={180}
                                                items={filteredRoutinePoints}
                                                onSelect={openRoutinePointDetail}
                                            />
                                        )}
                                        {filteredRoutinePoints.length === 0 && (
                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    textAlign: 'center',
                                                    marginTop: 12,
                                                }}
                                            >
                                                Aún no hay valoraciones de rutinas o ejercicios para mostrar.
                                            </Text>
                                        )}
                                    </View>





                                    <View style={{ marginTop: 12 }}>
                                        <StatCard
                                            icon={<Ionicons name="checkmark-done-outline" size={17} color={COLORS.primary} />}
                                            label="Entrenamientos valorados"
                                            value={String(filteredRoutinePoints.length)}
                                            sub="rutinas o promedios de ejercicios con valoración"
                                        />
                                    </View>
                                </Section>

                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'exercises',
                                            event
                                        )
                                    }
                                >
                                    <View className='flex-row m-2 pb-2 items-center justify-between'>
                                        <View className='flex-row items-center'>
                                            <FontAwesome6 className='mr-2' name="dumbbell" size={18} color={COLORS.primary} />
                                            <Text className='text-md font-bold' style={{ color: '#fff' }}>
                                                Esfuerzo en general
                                            </Text>
                                        </View>
                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Esfuerzo',
                                                    'Ejercicios más difíciles: ejercicios con mayor promedio de esfuerzo registrado.\n\nEjercicios más fáciles: ejercicios con menor promedio de esfuerzo registrado.\n\nEsfuerzo promedio por ejercicio: promedio general de las valoraciones que hiciste en tus ejercicios.\n\nEstas métricas ayudan a detectar qué ejercicios te exigen más y cuáles vas dominando mejor.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className='mb-3'>
                                        <StatCard
                                            icon={<FontAwesome6 name="chart-simple" size={16} color={COLORS.primary} />}
                                            label="Esfuerzo promedio por ejercicio"
                                            value={formatRating(
                                                stats?.effort.avgEffortByExercise?.length
                                                    ? stats.effort.avgEffortByExercise.reduce((sum, item) => sum + item.avgEffort, 0) /
                                                    stats.effort.avgEffortByExercise.length
                                                    : null
                                            )}
                                        />
                                    </View>
                                    <View className='mx-2'>
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 10 }}>
                                            Top ejercicios mejor rendimiento
                                        </Text>

                                        {stats?.effort.topHardestExercises?.length ? (
                                            stats.effort.topHardestExercises.slice(0, 3).map((item) => (
                                                <BarRow
                                                    key={item.exerciseId ?? item.exerciseName}
                                                    name={item.exerciseName}
                                                    value={toPercent(item.avgEffort)}
                                                />
                                            ))
                                        ) : (
                                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
                                                Aún no hay datos suficientes.
                                            </Text>
                                        )}

                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 8, marginBottom: 10 }}>
                                            Ejercicios que fueron más difíciles
                                        </Text>

                                        {stats?.effort.topBestExercises?.length ? (
                                            stats.effort.topBestExercises.slice(0, 3).map((item) => (
                                                <BarRow
                                                    key={item.exerciseId ?? item.exerciseName}
                                                    name={item.exerciseName}
                                                    value={toPercent(item.avgEffort)}
                                                />
                                            ))
                                        ) : (
                                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
                                                Aún no hay datos suficientes.
                                            </Text>
                                        )}
                                    </View>

                                </Section>
                                <Section
                                    onLayout={(event) =>
                                        registerSectionPosition(
                                            'advice',
                                            event
                                        )
                                    }
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginHorizontal: 10,
                                            marginTop: 6,
                                            marginBottom: 15,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <Ionicons
                                                name="compass-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{ marginRight: 10 }}
                                            />

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    className="text-md font-bold" style={{ color: '#fff' }}
                                                >
                                                    Consejos
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Recomendaciones según tus registros
                                                </Text>
                                            </View>
                                        </View>

                                        <InfoButton
                                            onPress={() =>
                                                openInfoModal(
                                                    'Consejos',
                                                    'Los consejos se generan a partir de tus registros recientes de running, rutinas y valoraciones.\n\nA diferencia de los insights, que describen qué está pasando, esta sección intenta sugerir acciones prácticas.\n\nNo reemplaza la opinión de un profesional de la salud o entrenamiento.'
                                                )
                                            }
                                        />
                                    </View>

                                    {adviceError ? (
                                        <View
                                            style={{
                                                backgroundColor: 'rgba(250,204,21,0.08)',
                                                borderWidth: 1,
                                                borderColor: 'rgba(250,204,21,0.30)',
                                                borderRadius: 18,
                                                padding: 14,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                <Ionicons
                                                    name="alert-circle-outline"
                                                    size={20}
                                                    color="#FACC15"
                                                    style={{ marginRight: 10, marginTop: 1 }}
                                                />

                                                <Text
                                                    style={{
                                                        flex: 1,
                                                        color: COLORS.textMuted,
                                                        fontSize: 12,
                                                        lineHeight: 18,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {adviceError}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : adviceItems.length > 0 ? (
                                        adviceItems.map((item) => (
                                            <AdviceCard
                                                key={item.id}
                                                title={item.title}
                                                description={item.description}
                                                type={item.type}
                                            />
                                        ))
                                    ) : (
                                        <View
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.08)',
                                                borderRadius: 18,
                                                padding: 14,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Todavía no hay consejos disponibles. Registrá más entrenamientos para recibir recomendaciones.
                                            </Text>
                                        </View>
                                    )}

                                    <Text
                                        style={{
                                            color: COLORS.textMuted,
                                            fontSize: 10,
                                            lineHeight: 16,
                                            textAlign: 'center',
                                            marginTop: 4,
                                            marginHorizontal: 12,
                                        }}
                                    >
                                        Estos consejos son orientativos y se ajustan a medida que registrás tus nuevos entrenamientos.
                                    </Text>
                                </Section>
                            </>
                        )}

                    </ScrollView>
                </View>


                <View
                    style={{
                        flexDirection: 'row',

                        alignItems: 'center',

                        justifyContent:
                            'space-between',

                        gap: 8,

                        marginHorizontal: 8,

                        marginTop: 10,

                        marginBottom: 10,
                    }}
                >
                    {/* 1 — HOME */}

                    <StatisticsNavButton
                        onPress={() =>
                            router.replace('/home')
                        }
                        icon={
                            <Ionicons
                                name="home-outline"
                                size={27}
                                color="#FFFFFF"
                            />
                        }
                    />

                    {/* 2 — PERFIL */}

                    <StatisticsNavButton
                        onPress={() =>
                            router.push('/profile')
                        }
                        icon={
                            <Ionicons
                                name="person-circle-outline"
                                size={32}
                                color="#FFFFFF"
                            />
                        }
                    />

                    {/* 3 — RUTINA RECIENTE */}

                    <StatisticsNavButton
                        onPress={
                            openLatestRoutine
                        }
                        icon={
                            <Ionicons
                                name="list-outline"
                                size={34}
                                color="#FFFFFF"
                            />
                        }
                    />

                    {/* 4 — RUNNING */}

                    <StatisticsNavButton
                        onPress={() =>
                            router.push('/liverun')
                        }
                        icon={
                            <FontAwesome6
                                name="person-running"
                                size={25}
                                color="#FFFFFF"
                            />
                        }
                    />

                    {/* 5 — HISTORIAL GENERAL */}

                    <StatisticsNavButton
                        onPress={() =>
                            router.push(
                                '/statistics-history'
                            )
                        }
                        icon={
                            <Ionicons
                                name="document-text-outline"
                                size={27}
                                color="#FFFFFF"
                            />
                        }
                    />
                </View>
            </View>
            <Modal
                visible={infoModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setInfoModalVisible(false)}
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
                            maxWidth: 340,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 18,
                                    fontWeight: '800',
                                    flex: 1,
                                }}
                            >
                                {infoModalTitle}
                            </Text>

                            <Pressable
                                onPress={() => setInfoModalVisible(false)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: '#1b1b1b',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 13,
                                lineHeight: 20,
                            }}
                        >
                            {infoModalText}
                        </Text>

                        <Pressable
                            onPress={() => setInfoModalVisible(false)}
                            style={{
                                marginTop: 16,
                                backgroundColor: COLORS.primary,
                                paddingVertical: 13,
                                borderRadius: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#111', fontWeight: '800' }}>
                                Entendido
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={runDetailVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRunDetailVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.68)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 18,
                                    fontWeight: '800',
                                }}
                            >
                                Detalle de sesión
                            </Text>

                            <Pressable
                                onPress={() => setRunDetailVisible(false)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: '#1b1b1b',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        {selectedRunSession && (
                            <>
                                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                                    Fecha
                                </Text>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 10 }}>
                                    {getSessionDate(selectedRunSession).toLocaleDateString('es-AR')}
                                </Text>

                                <View className="flex-row" style={{ gap: 10, marginBottom: 10 }}>
                                    <StatCard
                                        icon={<Ionicons name="walk-outline" size={16} color={COLORS.primary} />}
                                        label="Distancia"
                                        value={formatStatDistance(selectedRunSession.distanceMeters)}
                                    />

                                    <StatCard
                                        icon={<Ionicons name="stopwatch-outline" size={16} color="#78DCE8" />}
                                        label="Tiempo"
                                        value={formatStatDuration(selectedRunSession.durationSeconds)}
                                    />
                                </View>

                                <View className="flex-row" style={{ gap: 10, marginBottom: 10 }}>
                                    <StatCard
                                        icon={<Ionicons name="speedometer-outline" size={16} color="#78DCE8" />}
                                        label="Ritmo"
                                        value={
                                            selectedRunSession.avgPaceSecPerKm != null
                                                ? `${formatStatPace(selectedRunSession.avgPaceSecPerKm)} /km`
                                                : '--'
                                        }
                                    />

                                    <StatCard
                                        icon={<Ionicons name="flash-outline" size={16} color={COLORS.primary} />}
                                        label="Vel. Máx"
                                        value={formatStatSpeed(selectedRunSession.maxSpeedMps)}
                                    />
                                </View>

                                <StatCard
                                    icon={<Ionicons name="star-outline" size={16} color={COLORS.primary} />}
                                    label="Valoración"
                                    value={formatRating(getRunSessionRating(selectedRunSession))}
                                />
                            </>
                        )}
                    </View>
                </View>
            </Modal>
            <Modal
                visible={routineDetailVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRoutineDetailVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.68)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            backgroundColor: '#101010',
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            padding: 18,
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 18,
                                    fontWeight: '800',
                                }}
                            >
                                Detalle de rutina
                            </Text>

                            <Pressable
                                onPress={() => setRoutineDetailVisible(false)}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: '#1b1b1b',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textLight} />
                            </Pressable>
                        </View>

                        {selectedRoutinePoint && (
                            <>
                                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                                    Fecha
                                </Text>
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontSize: 15,
                                        fontWeight: '700',
                                        marginBottom: 10,
                                    }}
                                >
                                    {new Date(selectedRoutinePoint.date).toLocaleDateString('es-AR')}
                                </Text>

                                {selectedRoutinePoint.routineName && (
                                    <>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                                            Rutina
                                        </Text>
                                        <Text
                                            style={{
                                                color: '#fff',
                                                fontSize: 15,
                                                fontWeight: '700',
                                                marginBottom: 10,
                                            }}
                                        >
                                            {selectedRoutinePoint.routineName}
                                        </Text>
                                    </>
                                )}

                                <StatCard
                                    icon={<Ionicons name="star-outline" size={16} color={COLORS.primary} />}
                                    label="Valoración"
                                    value={formatRating(selectedRoutinePoint.value)}
                                />

                                <View style={{ marginTop: 10 }}>
                                    <StatCard
                                        icon={<Ionicons name="information-circle-outline" size={16} color="#78DCE8" />}
                                        label="Cálculo"
                                        value={
                                            selectedRoutinePoint.source === 'routine-rating'
                                                ? 'Rutina completa'
                                                : `Promedio de ${selectedRoutinePoint.ratedExercisesCount ?? 0} ejercicios`
                                        }
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>

    );
}