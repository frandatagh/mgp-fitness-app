import React, { useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    Text, View,
    ActivityIndicator,
    Modal,
    Animated,
    Easing,
    type LayoutChangeEvent
} from 'react-native';
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

                borderWidth: 3,
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
}: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    active?: boolean;
}) {
    return (
        <View
            style={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
            }}
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    width: 55,
                    height: 55,
                    borderRadius: 100,

                    alignItems: 'center',
                    justifyContent: 'center',

                    backgroundColor:
                        active
                            ? 'rgba(198,255,0,0.18)'
                            : pressed
                                ? '#292929'
                                : '#1B1B1B',

                    borderWidth: 3,
                    borderColor: COLORS.primary,

                    opacity:
                        pressed ? 0.82 : 1,

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

            <Text
                numberOfLines={1}
                style={{
                    color:
                        active
                            ? COLORS.primary
                            : '#BDBDBD',

                    fontSize: 11,
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

function AnimatedStatsModal({
    visible,
    onClose,
    title,
    subtitle,
    icon,
    children,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    const [mounted, setMounted] =
        React.useState(false);

    const animation =
        React.useRef(
            new Animated.Value(0)
        ).current;

    const closingRef =
        React.useRef(false);

    React.useEffect(() => {
        if (!visible) return;

        closingRef.current = false;

        setMounted(true);

        animation.setValue(0);

        const frame =
            requestAnimationFrame(() => {
                Animated.timing(
                    animation,
                    {
                        toValue: 1,
                        duration: 260,
                        easing:
                            Easing.out(
                                Easing.cubic
                            ),
                        useNativeDriver:
                            false,
                    }
                ).start();
            });

        return () => {
            cancelAnimationFrame(
                frame
            );
        };
    }, [visible, animation]);

    const closeWithAnimation =
        () => {
            if (
                closingRef.current
            ) {
                return;
            }

            closingRef.current =
                true;

            Animated.timing(
                animation,
                {
                    toValue: 0,
                    duration: 190,
                    easing:
                        Easing.in(
                            Easing.cubic
                        ),
                    useNativeDriver:
                        false,
                }
            ).start(() => {
                setMounted(false);

                closingRef.current =
                    false;

                onClose();
            });
        };

    if (!mounted) {
        return null;
    }

    const translateY =
        animation.interpolate({
            inputRange: [0, 1],
            outputRange: [35, 0],
        });

    const scale =
        animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
        });

    const backdropOpacity =
        animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.76],
        });

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={
                closeWithAnimation
            }
        >
            <View
                style={{
                    flex: 1,

                    justifyContent:
                        'center',

                    alignItems:
                        'center',

                    padding: 20,
                }}
            >
                {/* FONDO */}

                <Animated.View
                    pointerEvents="none"
                    style={{
                        position:
                            'absolute',

                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,

                        backgroundColor:
                            '#000000',

                        opacity:
                            backdropOpacity,
                    }}
                />

                {/* TARJETA */}

                <Animated.View
                    style={{
                        width: '100%',
                        maxWidth: 390,
                        maxHeight: '86%',

                        backgroundColor:
                            '#101010',

                        borderRadius: 24,

                        borderWidth: 1,

                        borderColor:
                            '#343434',

                        padding: 18,

                        opacity:
                            animation,

                        transform: [
                            {
                                translateY,
                            },
                            {
                                scale,
                            },
                        ],

                        shadowColor:
                            '#000000',

                        shadowOpacity:
                            0.55,

                        shadowRadius: 24,

                        shadowOffset: {
                            width: 0,
                            height: 10,
                        },

                        elevation: 12,
                    }}
                >
                    {/* HEADER */}

                    <View
                        style={{
                            flexDirection:
                                'row',

                            alignItems:
                                'center',

                            marginBottom:
                                16,
                        }}
                    >
                        <View
                            style={{
                                width: 46,
                                height: 46,

                                borderRadius:
                                    23,

                                backgroundColor:
                                    'rgba(198,255,0,0.08)',

                                borderWidth: 1,

                                borderColor:
                                    'rgba(198,255,0,0.40)',

                                alignItems:
                                    'center',

                                justifyContent:
                                    'center',
                            }}
                        >
                            {icon}
                        </View>

                        <View
                            style={{
                                flex: 1,

                                marginLeft:
                                    12,
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        COLORS.textLight,

                                    fontSize:
                                        18,

                                    fontWeight:
                                        '900',
                                }}
                            >
                                {title}
                            </Text>

                            {subtitle && (
                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize:
                                            11,

                                        marginTop:
                                            3,
                                    }}
                                >
                                    {
                                        subtitle
                                    }
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* CONTENIDO */}

                    <ScrollView
                        showsVerticalScrollIndicator={
                            false
                        }
                        style={{
                            flexShrink: 1,
                        }}
                        contentContainerStyle={{
                            paddingBottom: 3,
                        }}
                    >
                        {children}
                    </ScrollView>

                    {/* FOOTER */}

                    <View
                        style={{
                            borderTopWidth:
                                1,

                            borderTopColor:
                                '#292929',

                            marginTop: 16,

                            paddingTop: 13,
                        }}
                    >
                        <Pressable
                            onPress={
                                closeWithAnimation
                            }
                            style={({
                                pressed,
                            }) => ({
                                height: 46,

                                borderRadius:
                                    14,

                                alignItems:
                                    'center',

                                justifyContent:
                                    'center',

                                backgroundColor:
                                    pressed
                                        ? '#B4E800'
                                        : COLORS.primary,

                                transform: [
                                    {
                                        scale:
                                            pressed
                                                ? 0.985
                                                : 1,
                                    },
                                ],
                            })}
                        >
                            <Text
                                style={{
                                    color:
                                        '#101010',

                                    fontSize:
                                        13,

                                    fontWeight:
                                        '900',
                                }}
                            >
                                Entendido
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

function ModalMetricCard({
    icon,
    label,
    value,
    wide = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <View
            style={{
                flexBasis:
                    wide
                        ? '100%'
                        : '47%',

                flexGrow: 1,

                minHeight: 76,

                backgroundColor:
                    '#181818',

                borderWidth: 1,

                borderColor:
                    '#292929',

                borderRadius: 15,

                padding: 11,
            }}
        >
            <View
                style={{
                    flexDirection:
                        'row',

                    alignItems:
                        'center',
                }}
            >
                {icon}

                <Text
                    style={{
                        color:
                            '#8F8F8F',

                        fontSize: 10,

                        fontWeight:
                            '700',

                        marginLeft: 6,
                    }}
                >
                    {label}
                </Text>
            </View>

            <Text
                numberOfLines={
                    wide ? 2 : 1
                }
                style={{
                    color:
                        COLORS.textLight,

                    fontSize: 14,

                    fontWeight:
                        '900',

                    marginTop: 7,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

const QUICK_ICON_COLOR = '#C7C7C7';

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

    const formatStatPace = (
        seconds?: number | null
    ) => {
        if (!seconds) return '--';

        const totalSeconds =
            Math.round(seconds);

        const minutes =
            Math.floor(
                totalSeconds / 60
            );

        const secs =
            totalSeconds % 60;

        return `${String(minutes).padStart(
            2,
            '0'
        )}:${String(secs).padStart(
            2,
            '0'
        )}`;
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

    const getRunSessionEndDate = (
        session: RunSession
    ) => {
        const value =
            (session as any)
                .endedAt;

        if (!value) {
            return null;
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date;
    };

    const formatClockTime = (
        date?: Date | null
    ) => {
        if (!date) return '--';

        return date.toLocaleTimeString(
            'es-AR',
            {
                hour: '2-digit',
                minute: '2-digit',
            }
        );
    };

    const getRunAverageSpeedMps = (
        session: RunSession
    ) => {
        const distance =
            session.distanceMeters ??
            0;

        const duration =
            session.durationSeconds ??
            0;

        if (
            distance <= 0 ||
            duration <= 0
        ) {
            return null;
        }

        return distance / duration;
    };

    const hasSavedRunRoute = (
        session: RunSession
    ) => {
        return Boolean(
            (session as any)
                .pathGeoJson
        );
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

    const [runSelectionFlash, setRunSelectionFlash] =
        React.useState(false);

    const runSelectionTimerRef =
        React.useRef<
            ReturnType<typeof setTimeout> | null
        >(null);

    const selectRunSession = (
        session: RunSession
    ) => {
        setSelectedRunSession(session);

        setRunSelectionFlash(true);

        if (runSelectionTimerRef.current) {
            clearTimeout(
                runSelectionTimerRef.current
            );
        }

        runSelectionTimerRef.current =
            setTimeout(() => {
                setRunSelectionFlash(false);

                runSelectionTimerRef.current =
                    null;
            }, 1000);
    };

    const openSelectedRunSessionDetail =
        () => {
            if (!selectedRunSession) {
                return;
            }

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

    const [
        routineSelectionFlash,
        setRoutineSelectionFlash,
    ] = React.useState(false);

    const routineSelectionTimerRef =
        React.useRef<
            ReturnType<typeof setTimeout> | null
        >(null);

    const selectRoutinePoint = (
        point: RoutinePerformancePoint
    ) => {
        setSelectedRoutinePoint(point);

        setRoutineSelectionFlash(true);

        if (
            routineSelectionTimerRef.current
        ) {
            clearTimeout(
                routineSelectionTimerRef.current
            );
        }

        routineSelectionTimerRef.current =
            setTimeout(() => {
                setRoutineSelectionFlash(false);

                routineSelectionTimerRef.current =
                    null;
            }, 1000);
    };

    const routinePeriodDescription = {
        latest: 'últimas sesiones',
        weekly: 'últimos 7 días',
        monthly: 'este mes',
        yearly: 'este año',
    }[routinePeriod];

    const formatRatingDelta = (
        value?: number | null
    ) => {
        if (value == null) {
            return '--';
        }

        const sign =
            value > 0
                ? '+'
                : '';

        return `${sign}${value.toFixed(1)}`;
    };

    const getRoutinePerformanceLabel = (
        value: number
    ) => {
        if (value >= 9) {
            return 'Rendimiento excelente';
        }

        if (value >= 8) {
            return 'Muy buen rendimiento';
        }

        if (value >= 7) {
            return 'Buen rendimiento';
        }

        if (value >= 5) {
            return 'Rendimiento intermedio';
        }

        return 'Sesión con mayor dificultad';
    };

    const selectedRoutineContext =
        React.useMemo(() => {
            if (!selectedRoutinePoint) {
                return null;
            }

            /*
             * EJERCICIOS VALORADOS
             * EL DÍA DE ESA SESIÓN
             */

            const selectedDay =
                historyDays.find(
                    (day) =>
                        day.date ===
                        selectedRoutinePoint.date
                );

            const exerciseRecords =
                (selectedDay?.records ?? [])
                    .filter(
                        (record) =>
                            record.type ===
                            'exercise' &&
                            record.rating != null
                    )
                    .map((record) => ({
                        ...record,

                        numericRating:
                            Number(
                                record.rating
                            ),
                    }))
                    .filter(
                        (record) =>
                            !Number.isNaN(
                                record.numericRating
                            )
                    );

            /*
             * PROMEDIO DE EJERCICIOS
             */

            const exerciseAverage =
                exerciseRecords.length
                    ? exerciseRecords.reduce(
                        (sum, record) =>
                            sum +
                            record.numericRating,
                        0
                    ) /
                    exerciseRecords.length
                    : null;

            /*
             * MEJOR EJERCICIO
             */

            const bestExercise =
                exerciseRecords.length
                    ? [...exerciseRecords].sort(
                        (a, b) =>
                            b.numericRating -
                            a.numericRating
                    )[0]
                    : null;

            /*
             * EJERCICIO MÁS DIFÍCIL
             */

            const hardestExercise =
                exerciseRecords.length
                    ? [...exerciseRecords].sort(
                        (a, b) =>
                            a.numericRating -
                            b.numericRating
                    )[0]
                    : null;

            /*
             * SESIÓN ANTERIOR
             */

            const selectedIndex =
                filteredRoutinePoints.findIndex(
                    (point) =>
                        point.id ===
                        selectedRoutinePoint.id
                );

            const previousPoint =
                selectedIndex > 0
                    ? filteredRoutinePoints[
                    selectedIndex - 1
                    ]
                    : null;

            const differenceFromPrevious =
                previousPoint
                    ? selectedRoutinePoint.value -
                    previousPoint.value
                    : null;

            /*
             * PROMEDIO DEL PERÍODO
             */

            const periodValues =
                filteredRoutinePoints
                    .map(
                        (point) =>
                            point.value
                    )
                    .filter(
                        (value) =>
                            !Number.isNaN(
                                value
                            )
                    );

            const periodAverage =
                periodValues.length
                    ? periodValues.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) /
                    periodValues.length
                    : null;

            /*
             * HISTÓRICO DE ESA MISMA RUTINA
             */

            const sameRoutinePoints =
                selectedRoutinePoint.routineName
                    ? routinePerformancePoints.filter(
                        (point) =>
                            point.routineName ===
                            selectedRoutinePoint
                                .routineName
                    )
                    : [];

            const sameRoutineValues =
                sameRoutinePoints
                    .map(
                        (point) =>
                            point.value
                    )
                    .filter(
                        (value) =>
                            !Number.isNaN(
                                value
                            )
                    );

            const historicalAverage =
                sameRoutineValues.length
                    ? sameRoutineValues.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) /
                    sameRoutineValues.length
                    : null;

            const historicalBest =
                sameRoutineValues.length
                    ? Math.max(
                        ...sameRoutineValues
                    )
                    : null;

            /*
             * RUTINA ACTUAL
             */

            const normalizedName =
                selectedRoutinePoint
                    .routineName
                    ?.trim()
                    .toLowerCase();

            const routineMatches =
                normalizedName
                    ? navRoutines.filter(
                        (routine) =>
                            routine.title
                                .trim()
                                .toLowerCase() ===
                            normalizedName
                    )
                    : [];

            const currentRoutine =
                routineMatches.length === 1
                    ? routineMatches[0]
                    : null;

            return {
                exerciseRecords,
                exerciseAverage,

                bestExercise,
                hardestExercise,

                differenceFromPrevious,

                periodAverage,
                periodCount:
                    filteredRoutinePoints.length,

                sameRoutinePoints,
                historicalAverage,
                historicalBest,

                currentRoutine,
            };
        }, [
            selectedRoutinePoint,
            historyDays,
            filteredRoutinePoints,
            routinePerformancePoints,
            navRoutines,
        ]);

    const openSelectedRoutineDetail =
        () => {
            if (!selectedRoutinePoint) {
                return;
            }

            setRoutineDetailVisible(true);
        };

    useEffect(() => {
        return () => {
            if (
                runSelectionTimerRef.current
            ) {
                clearTimeout(
                    runSelectionTimerRef.current
                );
            }

            if (
                routineSelectionTimerRef.current
            ) {
                clearTimeout(
                    routineSelectionTimerRef.current
                );
            }
        };
    }, []);

    useEffect(() => {
        setSelectedRunSession(null);
        setRunSelectionFlash(false);
    }, [runningPeriod]);

    useEffect(() => {
        setSelectedRoutinePoint(null);
        setRoutineSelectionFlash(false);
    }, [routinePeriod]);

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
                                        marginBottom: 16,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontSize: 13,
                                            fontWeight: '400',
                                            marginLeft: 10,
                                            marginBottom: 10,
                                        }}
                                    >
                                        Acceso rápido
                                    </Text>

                                    {/* CINCO ACCESOS PRINCIPALES */}

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: 4,
                                            paddingHorizontal: 2,
                                        }}
                                    >
                                        {/* INSIGHT */}

                                        <StatisticsQuickButton
                                            label="Insight"
                                            active={
                                                activeQuickSection ===
                                                'insights'
                                            }
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'insights'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="bulb-outline"
                                                    size={28}
                                                    color={
                                                        activeQuickSection === 'insights'
                                                            ? COLORS.primary
                                                            : QUICK_ICON_COLOR
                                                    }
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
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'running'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="analytics-outline"
                                                    size={28}
                                                    color={
                                                        activeQuickSection === 'running'
                                                            ? COLORS.primary
                                                            : QUICK_ICON_COLOR
                                                    }
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
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'times'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="stopwatch-outline"
                                                    size={30}
                                                    color={
                                                        activeQuickSection === 'times'
                                                            ? COLORS.primary
                                                            : QUICK_ICON_COLOR
                                                    }
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
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'routines'
                                                )
                                            }
                                            icon={
                                                <Ionicons
                                                    name="trending-up-outline"
                                                    size={28}
                                                    color={
                                                        activeQuickSection === 'routines'
                                                            ? COLORS.primary
                                                            : QUICK_ICON_COLOR
                                                    }
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
                                            onPress={() =>
                                                handleQuickAccess(
                                                    'exercises'
                                                )
                                            }
                                            icon={
                                                <FontAwesome6
                                                    name="dumbbell"
                                                    size={19}
                                                    color={
                                                        activeQuickSection === 'exercises'
                                                            ? COLORS.primary
                                                            : QUICK_ICON_COLOR
                                                    }
                                                />
                                            }
                                        />
                                    </View>

                                    {/* CONSEJOS */}

                                    <Pressable
                                        onPress={() =>
                                            handleQuickAccess(
                                                'advice'
                                            )
                                        }
                                        style={({ pressed }) => ({
                                            marginTop: 14,
                                            marginBottom: 8,

                                            height: 50,

                                            borderRadius: 14,

                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',

                                            backgroundColor:
                                                activeQuickSection ===
                                                    'advice'
                                                    ? 'rgba(198,255,0,0.16)'
                                                    : pressed
                                                        ? '#292929'
                                                        : '#1B1B1B',

                                            borderWidth:
                                                activeQuickSection ===
                                                    'advice'
                                                    ? 2
                                                    : 3,

                                            borderColor:
                                                activeQuickSection ===
                                                    'advice'
                                                    ? COLORS.primary
                                                    : '#343434',

                                            opacity:
                                                pressed ? 0.85 : 1,
                                        })}
                                    >
                                        <Ionicons
                                            name="compass-outline"
                                            size={27}
                                            color={
                                                activeQuickSection === 'advice'
                                                    ? COLORS.primary
                                                    : QUICK_ICON_COLOR
                                            }
                                        />

                                        <Text
                                            style={{
                                                color:
                                                    activeQuickSection ===
                                                        'advice'
                                                        ? COLORS.primary
                                                        : COLORS.textLight,

                                                fontSize: 15,
                                                fontWeight: '600',
                                                marginLeft: 8,
                                            }}
                                        >
                                            Consejos y recomendaciones
                                        </Text>
                                    </Pressable>
                                </View>


                                <Section >
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
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                flex: 1,
                                            }}
                                        >
                                            <Ionicons
                                                name="analytics-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{
                                                    marginRight: 10,
                                                }}
                                            />

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    className="text-md font-bold"
                                                    style={{ color: '#fff' }}
                                                >
                                                    Rendimiento de tus sesiones
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 10,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Evolución de tu valoración de esfuerzo en running
                                                </Text>
                                            </View>
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
                                                    const session =
                                                        filteredRunningSessions[
                                                        index
                                                        ];

                                                    if (session) {
                                                        selectRunSession(
                                                            session
                                                        );
                                                    }
                                                }}

                                                style={{
                                                    borderRadius: 18,
                                                    marginLeft: -8,
                                                }}
                                                getDotColor={(
                                                    _dataPoint,
                                                    index
                                                ) => {
                                                    const session =
                                                        filteredRunningSessions[index];

                                                    if (
                                                        session &&
                                                        selectedRunSession &&
                                                        session.id ===
                                                        selectedRunSession.id
                                                    ) {
                                                        return '#FFFFFF';
                                                    }

                                                    return COLORS.primary;
                                                }}
                                            />
                                        )}
                                        {runningChartWidth > 0 && filteredRunningSessions.length > 0 && (
                                            <ChartTouchOverlay
                                                width={runningChartWidth}
                                                height={180}
                                                items={
                                                    filteredRunningSessions
                                                }
                                                onSelect={
                                                    selectRunSession
                                                }
                                            />
                                        )}
                                        {selectedRunSession && (
                                            <View
                                                style={{
                                                    marginTop: 10,

                                                    backgroundColor:
                                                        runSelectionFlash
                                                            ? 'rgba(198,255,0,0.08)'
                                                            : '#191919',

                                                    borderWidth: 1,

                                                    borderColor:
                                                        runSelectionFlash
                                                            ? COLORS.primary
                                                            : '#303030',

                                                    borderRadius: 16,

                                                    padding: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'space-between',
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textMuted,

                                                                fontSize: 10,

                                                                fontWeight: '700',
                                                            }}
                                                        >
                                                            Sesión seleccionada
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 13,

                                                                fontWeight: '900',

                                                                marginTop: 3,
                                                            }}
                                                        >
                                                            {getSessionDate(
                                                                selectedRunSession
                                                            ).toLocaleDateString(
                                                                'es-AR'
                                                            )}
                                                        </Text>
                                                    </View>

                                                    <View
                                                        style={{
                                                            backgroundColor:
                                                                'rgba(198,255,0,0.10)',

                                                            borderRadius: 999,

                                                            paddingHorizontal: 10,
                                                            paddingVertical: 5,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.primary,

                                                                fontSize: 11,

                                                                fontWeight: '900',
                                                            }}
                                                        >
                                                            {formatRating(
                                                                getRunSessionRating(
                                                                    selectedRunSession
                                                                )
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        marginTop: 10,
                                                        gap: 8,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flex: 1,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#777777',
                                                                fontSize: 9,
                                                            }}
                                                        >
                                                            Distancia
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color: '#DDDDDD',
                                                                fontSize: 12,
                                                                fontWeight: '800',
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {formatStatDistance(
                                                                selectedRunSession
                                                                    .distanceMeters
                                                            )}
                                                        </Text>
                                                    </View>

                                                    <View
                                                        style={{
                                                            flex: 1,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#777777',
                                                                fontSize: 9,
                                                            }}
                                                        >
                                                            Tiempo
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color: '#DDDDDD',
                                                                fontSize: 12,
                                                                fontWeight: '800',
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {formatStatDuration(
                                                                selectedRunSession
                                                                    .durationSeconds
                                                            )}
                                                        </Text>
                                                    </View>

                                                    <Pressable
                                                        onPress={
                                                            openSelectedRunSessionDetail
                                                        }
                                                        style={({ pressed }) => ({
                                                            paddingHorizontal: 11,
                                                            paddingVertical: 8,

                                                            borderRadius: 10,

                                                            backgroundColor:
                                                                pressed
                                                                    ? '#343434'
                                                                    : '#242424',

                                                            alignSelf: 'center',
                                                        })}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 10,

                                                                fontWeight: '800',
                                                            }}
                                                        >
                                                            Ver detalle ›
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </View>
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
                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 10,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Tiempo, distancia, ritmo y velocidad
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
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                flex: 1,
                                            }}
                                        >
                                            <Ionicons
                                                name="trending-up-outline"
                                                size={21}
                                                color={COLORS.primary}
                                                style={{
                                                    marginRight: 10,
                                                }}
                                            />

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    className="text-md font-bold"
                                                    style={{ color: '#fff' }}
                                                >
                                                    Evolución de rutinas
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: 10,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Evolución de tus valoraciones de entrenamiento
                                                </Text>
                                            </View>
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
                                                        selectRoutinePoint(point)
                                                    }
                                                }}

                                                style={{
                                                    borderRadius: 18,
                                                    marginLeft: -8,
                                                }}
                                                getDotColor={(
                                                    _dataPoint,
                                                    index
                                                ) => {
                                                    const point =
                                                        filteredRoutinePoints[index];

                                                    if (
                                                        point &&
                                                        selectedRoutinePoint &&
                                                        point.id ===
                                                        selectedRoutinePoint.id
                                                    ) {
                                                        return '#FFFFFF';
                                                    }

                                                    return '#78DCE8';
                                                }}
                                            />
                                        )}
                                        {routineChartWidth > 0 && filteredRoutinePoints.length > 0 && (
                                            <ChartTouchOverlay
                                                width={routineChartWidth}
                                                height={180}
                                                items={filteredRoutinePoints}
                                                onSelect={selectRoutinePoint}
                                            />
                                        )}
                                        {selectedRoutinePoint && (
                                            <View
                                                style={{
                                                    marginTop: 10,

                                                    backgroundColor:
                                                        routineSelectionFlash
                                                            ? 'rgba(198,255,0,0.08)'
                                                            : '#191919',

                                                    borderWidth: 1,

                                                    borderColor:
                                                        routineSelectionFlash
                                                            ? COLORS.primary
                                                            : '#303030',

                                                    borderRadius: 16,

                                                    padding: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: 'row',

                                                        justifyContent:
                                                            'space-between',

                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flex: 1,
                                                            paddingRight: 10,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textMuted,

                                                                fontSize: 10,

                                                                fontWeight: '700',
                                                            }}
                                                        >
                                                            Rutina seleccionada
                                                        </Text>

                                                        <Text
                                                            numberOfLines={1}
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 13,

                                                                fontWeight: '900',

                                                                marginTop: 3,
                                                            }}
                                                        >
                                                            {selectedRoutinePoint
                                                                .routineName ??
                                                                'Entrenamiento registrado'}
                                                        </Text>
                                                    </View>

                                                    <View
                                                        style={{
                                                            backgroundColor:
                                                                'rgba(120,220,232,0.10)',

                                                            borderRadius: 999,

                                                            paddingHorizontal: 10,
                                                            paddingVertical: 5,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#78DCE8',
                                                                fontSize: 11,
                                                                fontWeight: '900',
                                                            }}
                                                        >
                                                            {formatRating(
                                                                selectedRoutinePoint
                                                                    .value
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',

                                                        marginTop: 9,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flex: 1,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#AAAAAA',
                                                                fontSize: 10,
                                                                fontWeight: '700',
                                                            }}
                                                        >
                                                            {new Date(
                                                                selectedRoutinePoint.date
                                                            ).toLocaleDateString(
                                                                'es-AR'
                                                            )}
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color: '#777777',
                                                                fontSize: 9,
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {selectedRoutinePoint
                                                                .source ===
                                                                'routine-rating'
                                                                ? 'Valoración de rutina completa'
                                                                : `Promedio de ${selectedRoutinePoint
                                                                    .ratedExercisesCount ??
                                                                0
                                                                } ejercicios`}
                                                        </Text>
                                                    </View>

                                                    <Pressable
                                                        onPress={
                                                            openSelectedRoutineDetail
                                                        }
                                                        style={({ pressed }) => ({
                                                            paddingHorizontal: 11,
                                                            paddingVertical: 8,

                                                            borderRadius: 10,

                                                            backgroundColor:
                                                                pressed
                                                                    ? '#343434'
                                                                    : '#242424',
                                                        })}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 10,

                                                                fontWeight: '800',
                                                            }}
                                                        >
                                                            Ver detalle ›
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </View>
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
                                                    'Rendimiento de ejercicios',
                                                    'Ejercicios con mejor rendimiento: son aquellos que recibieron tus valoraciones promedio más altas.\n\nEjercicios que resultaron más difíciles: son aquellos que recibieron tus valoraciones promedio más bajas.\n\nLa valoración promedio por ejercicio reúne las calificaciones que registraste durante tus entrenamientos.\n\nEstos datos te ayudan a reconocer cuáles ejercicios dominás mejor y cuáles conviene trabajar con mayor atención.'
                                                )
                                            }
                                        />
                                    </View>
                                    <View className='mb-3'>
                                        <StatCard
                                            icon={<FontAwesome6 name="chart-simple" size={16} color={COLORS.primary} />}
                                            label="Valoración promedio por ejercicio"
                                            value={formatRating(
                                                stats?.effort.avgEffortByExercise?.length
                                                    ? stats.effort.avgEffortByExercise.reduce((sum, item) => sum + item.avgEffort, 0) /
                                                    stats.effort.avgEffortByExercise.length
                                                    : null
                                            )}
                                        />
                                    </View>
                                    <View className='mx-2'>
                                        <Text
                                            style={{
                                                color: '#fff',
                                                fontWeight: '800',
                                                fontSize: 14,
                                                marginBottom: 10,
                                            }}
                                        >
                                            Ejercicios con mejor rendimiento
                                        </Text>

                                        {stats?.effort
                                            .topBestExercises?.length ? (
                                            stats.effort.topBestExercises
                                                .slice(0, 3)
                                                .map((item) => (
                                                    <BarRow
                                                        key={
                                                            item.exerciseId ??
                                                            item.exerciseName
                                                        }
                                                        name={
                                                            item.exerciseName
                                                        }
                                                        value={toPercent(
                                                            item.avgEffort
                                                        )}
                                                    />
                                                ))
                                        ) : (
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,
                                                    fontSize: 12,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                Aún no hay datos suficientes.
                                            </Text>
                                        )}

                                        <Text
                                            style={{
                                                color: '#fff',
                                                fontWeight: '800',
                                                fontSize: 14,
                                                marginTop: 8,
                                                marginBottom: 10,
                                            }}
                                        >
                                            Ejercicios que resultaron más difíciles
                                        </Text>

                                        {stats?.effort
                                            .topHardestExercises?.length ? (
                                            stats.effort.topHardestExercises
                                                .slice(0, 3)
                                                .map((item) => (
                                                    <BarRow
                                                        key={
                                                            item.exerciseId ??
                                                            item.exerciseName
                                                        }
                                                        name={
                                                            item.exerciseName
                                                        }
                                                        value={toPercent(
                                                            item.avgEffort
                                                        )}
                                                    />
                                                ))
                                        ) : (
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,
                                                    fontSize: 12,
                                                    marginBottom: 10,
                                                }}
                                            >
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
            <AnimatedStatsModal
                visible={
                    infoModalVisible
                }
                onClose={() =>
                    setInfoModalVisible(
                        false
                    )
                }
                title={
                    infoModalTitle ||
                    'Información'
                }
                subtitle="Información sobre esta estadística"
                icon={
                    <Ionicons
                        name="information-circle-outline"
                        size={26}
                        color={
                            COLORS.primary
                        }
                    />
                }
            >
                <View
                    style={{
                        backgroundColor:
                            '#181818',

                        borderRadius: 16,

                        borderWidth: 1,

                        borderColor:
                            '#292929',

                        padding: 14,
                    }}
                >
                    <Text
                        style={{
                            color:
                                '#C3C3C3',

                            fontSize: 13,

                            lineHeight: 21,
                        }}
                    >
                        {infoModalText}
                    </Text>
                </View>
            </AnimatedStatsModal>
            <AnimatedStatsModal
                visible={
                    runDetailVisible
                }
                onClose={() =>
                    setRunDetailVisible(
                        false
                    )
                }
                title="Detalle de sesión"
                subtitle={
                    selectedRunSession
                        ? getSessionDate(
                            selectedRunSession
                        ).toLocaleDateString(
                            'es-AR',
                            {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            }
                        )
                        : undefined
                }
                icon={
                    <FontAwesome6
                        name="person-running"
                        size={22}
                        color={
                            COLORS.primary
                        }
                    />
                }
            >
                {selectedRunSession && (
                    <>
                        <Text
                            style={{
                                color:
                                    '#8F8F8F',

                                fontSize: 10,

                                fontWeight:
                                    '800',

                                marginBottom: 8,

                                textTransform:
                                    'uppercase',

                                letterSpacing:
                                    0.6,
                            }}
                        >
                            Resumen de la carrera
                        </Text>

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                flexWrap:
                                    'wrap',

                                gap: 8,
                            }}
                        >
                            {/* DISTANCIA */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="map-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Distancia"
                                value={formatStatDistance(
                                    selectedRunSession
                                        .distanceMeters
                                )}
                            />

                            {/* DURACIÓN */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="stopwatch-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Duración"
                                value={formatStatDuration(
                                    selectedRunSession
                                        .durationSeconds
                                )}
                            />

                            {/* RITMO */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="speedometer-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Ritmo promedio"
                                value={
                                    selectedRunSession
                                        .avgPaceSecPerKm !=
                                        null
                                        ? `${formatStatPace(
                                            selectedRunSession
                                                .avgPaceSecPerKm
                                        )} /km`
                                        : '--'
                                }
                            />

                            {/* VELOCIDAD MEDIA */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="pulse-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Vel. promedio"
                                value={formatStatSpeed(
                                    getRunAverageSpeedMps(
                                        selectedRunSession
                                    )
                                )}
                            />

                            {/* VELOCIDAD MÁXIMA */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="flash-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Vel. máxima"
                                value={formatStatSpeed(
                                    selectedRunSession
                                        .maxSpeedMps
                                )}
                            />

                            {/* VALORACIÓN */}

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="star-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                }
                                label="Valoración"
                                value={formatRating(
                                    getRunSessionRating(
                                        selectedRunSession
                                    )
                                )}
                            />
                        </View>

                        {/* HORARIOS */}

                        <Text
                            style={{
                                color:
                                    '#8F8F8F',

                                fontSize: 10,

                                fontWeight:
                                    '800',

                                marginTop: 17,

                                marginBottom: 8,

                                textTransform:
                                    'uppercase',

                                letterSpacing:
                                    0.6,
                            }}
                        >
                            Registro
                        </Text>

                        <View
                            style={{
                                flexDirection:
                                    'row',

                                flexWrap:
                                    'wrap',

                                gap: 8,
                            }}
                        >
                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="play-outline"
                                        size={17}
                                        color={
                                            QUICK_ICON_COLOR
                                        }
                                    />
                                }
                                label="Inicio"
                                value={formatClockTime(
                                    getSessionDate(
                                        selectedRunSession
                                    )
                                )}
                            />

                            <ModalMetricCard
                                icon={
                                    <Ionicons
                                        name="flag-outline"
                                        size={17}
                                        color={
                                            QUICK_ICON_COLOR
                                        }
                                    />
                                }
                                label="Finalización"
                                value={formatClockTime(
                                    getRunSessionEndDate(
                                        selectedRunSession
                                    )
                                )}
                            />

                            <ModalMetricCard
                                wide
                                icon={
                                    <Ionicons
                                        name="location-outline"
                                        size={17}
                                        color={
                                            QUICK_ICON_COLOR
                                        }
                                    />
                                }
                                label="Recorrido GPS"
                                value={
                                    hasSavedRunRoute(
                                        selectedRunSession
                                    )
                                        ? 'Ruta guardada correctamente'
                                        : 'Ruta no disponible'
                                }
                            />
                        </View>
                    </>
                )}
            </AnimatedStatsModal>
            <AnimatedStatsModal
                visible={
                    routineDetailVisible
                }
                onClose={() =>
                    setRoutineDetailVisible(
                        false
                    )
                }
                title="Detalle de rutina"
                subtitle={
                    selectedRoutinePoint
                        ? new Date(
                            selectedRoutinePoint.date
                        ).toLocaleDateString(
                            'es-AR',
                            {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            }
                        )
                        : undefined
                }
                icon={
                    <FontAwesome6
                        name="dumbbell"
                        size={21}
                        color={COLORS.primary}
                    />
                }
            >
                {selectedRoutinePoint &&
                    selectedRoutineContext && (
                        <>
                            {/* VALORACIÓN PRINCIPAL */}

                            <View
                                style={{
                                    backgroundColor:
                                        'rgba(198,255,0,0.07)',

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(198,255,0,0.30)',

                                    borderRadius: 18,

                                    paddingVertical: 16,
                                    paddingHorizontal: 14,

                                    alignItems:
                                        'center',

                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.primary,

                                        fontSize: 30,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    {formatRating(
                                        selectedRoutinePoint
                                            .value
                                    )}
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 12,

                                        fontWeight:
                                            '800',

                                        marginTop: 3,
                                    }}
                                >
                                    {getRoutinePerformanceLabel(
                                        selectedRoutinePoint
                                            .value
                                    )}
                                </Text>
                            </View>

                            {/* SESIÓN */}

                            <Text
                                style={{
                                    color: '#8F8F8F',

                                    fontSize: 10,

                                    fontWeight: '900',

                                    letterSpacing: 0.7,

                                    marginBottom: 8,
                                }}
                            >
                                SESIÓN
                            </Text>

                            <View
                                style={{
                                    flexDirection:
                                        'row',

                                    flexWrap:
                                        'wrap',

                                    gap: 8,
                                }}
                            >
                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="star-outline"
                                            size={17}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    }
                                    label="Valoración"
                                    value={formatRating(
                                        selectedRoutinePoint
                                            .value
                                    )}
                                />

                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="analytics-outline"
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Promedio período"
                                    value={formatRating(
                                        selectedRoutineContext
                                            .periodAverage
                                    )}
                                />

                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name={
                                                (
                                                    selectedRoutineContext
                                                        .differenceFromPrevious ??
                                                    0
                                                ) >= 0
                                                    ? 'trending-up-outline'
                                                    : 'trending-down-outline'
                                            }
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Vs. anterior"
                                    value={
                                        selectedRoutineContext
                                            .differenceFromPrevious !=
                                            null
                                            ? `${formatRatingDelta(
                                                selectedRoutineContext
                                                    .differenceFromPrevious
                                            )} pts`
                                            : '--'
                                    }
                                />

                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="layers-outline"
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Sesiones período"
                                    value={String(
                                        selectedRoutineContext
                                            .periodCount
                                    )}
                                />
                            </View>

                            {/* EJERCICIOS */}

                            <Text
                                style={{
                                    color: '#8F8F8F',

                                    fontSize: 10,

                                    fontWeight: '900',

                                    letterSpacing: 0.7,

                                    marginTop: 18,
                                    marginBottom: 8,
                                }}
                            >
                                EJERCICIOS DE ESE DÍA
                            </Text>

                            <View
                                style={{
                                    flexDirection:
                                        'row',

                                    flexWrap:
                                        'wrap',

                                    gap: 8,
                                }}
                            >
                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="calculator-outline"
                                            size={17}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    }
                                    label="Promedio"
                                    value={formatRating(
                                        selectedRoutineContext
                                            .exerciseAverage
                                    )}
                                />

                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="checkmark-done-outline"
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Valorados"
                                    value={String(
                                        selectedRoutineContext
                                            .exerciseRecords
                                            .length
                                    )}
                                />

                                {/* MEJOR */}

                                <View
                                    style={{
                                        flexBasis: '47%',
                                        flexGrow: 1,

                                        backgroundColor:
                                            '#181818',

                                        borderWidth: 1,
                                        borderColor:
                                            '#292929',

                                        borderRadius: 15,

                                        padding: 11,

                                        minHeight: 82,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                '#8F8F8F',

                                            fontSize: 10,

                                            fontWeight:
                                                '700',
                                        }}
                                    >
                                        Mejor
                                    </Text>

                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontSize: 12,

                                            fontWeight:
                                                '900',

                                            marginTop: 7,
                                        }}
                                    >
                                        {selectedRoutineContext
                                            .bestExercise
                                            ?.title ??
                                            '--'}
                                    </Text>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.primary,

                                            fontSize: 11,

                                            fontWeight:
                                                '900',

                                            marginTop: 3,
                                        }}
                                    >
                                        {selectedRoutineContext
                                            .bestExercise
                                            ? formatRating(
                                                selectedRoutineContext
                                                    .bestExercise
                                                    .numericRating
                                            )
                                            : '--'}
                                    </Text>
                                </View>

                                {/* MÁS DIFÍCIL */}

                                <View
                                    style={{
                                        flexBasis: '47%',
                                        flexGrow: 1,

                                        backgroundColor:
                                            '#181818',

                                        borderWidth: 1,
                                        borderColor:
                                            '#292929',

                                        borderRadius: 15,

                                        padding: 11,

                                        minHeight: 82,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                '#8F8F8F',

                                            fontSize: 10,

                                            fontWeight:
                                                '700',
                                        }}
                                    >
                                        Más difícil
                                    </Text>

                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontSize: 12,

                                            fontWeight:
                                                '900',

                                            marginTop: 7,
                                        }}
                                    >
                                        {selectedRoutineContext
                                            .hardestExercise
                                            ?.title ??
                                            '--'}
                                    </Text>

                                    <Text
                                        style={{
                                            color:
                                                '#C7C7C7',

                                            fontSize: 11,

                                            fontWeight:
                                                '900',

                                            marginTop: 3,
                                        }}
                                    >
                                        {selectedRoutineContext
                                            .hardestExercise
                                            ? formatRating(
                                                selectedRoutineContext
                                                    .hardestExercise
                                                    .numericRating
                                            )
                                            : '--'}
                                    </Text>
                                </View>
                            </View>

                            {/* HISTORIAL */}

                            <Text
                                style={{
                                    color: '#8F8F8F',

                                    fontSize: 10,

                                    fontWeight: '900',

                                    letterSpacing: 0.7,

                                    marginTop: 18,
                                    marginBottom: 8,
                                }}
                            >
                                HISTORIAL DE ESTA RUTINA
                            </Text>

                            <View
                                style={{
                                    flexDirection:
                                        'row',

                                    flexWrap:
                                        'wrap',

                                    gap: 8,
                                }}
                            >
                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="repeat-outline"
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Sesiones"
                                    value={String(
                                        selectedRoutineContext
                                            .sameRoutinePoints
                                            .length
                                    )}
                                />

                                <ModalMetricCard
                                    icon={
                                        <Ionicons
                                            name="analytics-outline"
                                            size={17}
                                            color={
                                                QUICK_ICON_COLOR
                                            }
                                        />
                                    }
                                    label="Promedio"
                                    value={formatRating(
                                        selectedRoutineContext
                                            .historicalAverage
                                    )}
                                />

                                <ModalMetricCard
                                    wide
                                    icon={
                                        <Ionicons
                                            name="trophy-outline"
                                            size={17}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    }
                                    label="Mejor marca"
                                    value={formatRating(
                                        selectedRoutineContext
                                            .historicalBest
                                    )}
                                />
                            </View>

                            {/* RUTINA ACTUAL */}

                            <Text
                                style={{
                                    color: '#8F8F8F',

                                    fontSize: 10,

                                    fontWeight: '900',

                                    letterSpacing: 0.7,

                                    marginTop: 18,
                                    marginBottom: 8,
                                }}
                            >
                                RUTINA ACTUAL
                            </Text>

                            <View
                                style={{
                                    backgroundColor:
                                        '#181818',

                                    borderWidth: 1,

                                    borderColor:
                                        '#292929',

                                    borderRadius: 15,

                                    padding: 13,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection:
                                            'row',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'space-between',
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',
                                        }}
                                    >
                                        <FontAwesome6
                                            name="dumbbell"
                                            size={17}
                                            color={
                                                COLORS.primary
                                            }
                                        />

                                        <Text
                                            style={{
                                                color:
                                                    COLORS.textLight,

                                                fontSize: 12,

                                                fontWeight:
                                                    '800',

                                                marginLeft: 8,
                                            }}
                                        >
                                            Ejercicios
                                        </Text>
                                    </View>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.primary,

                                            fontSize: 16,

                                            fontWeight:
                                                '900',
                                        }}
                                    >
                                        {selectedRoutineContext
                                            .currentRoutine
                                            ?.exercises
                                            ?.length ??
                                            '--'}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
            </AnimatedStatsModal>
        </SafeAreaView>

    );
}