import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
    getMyProfile,
    updateMyProfile,
    type MyProfileResponse,
    type UserProfile,
    type MainGoalType,
    type MainGoalPeriod,
    type MainGoalMetric,
    type MainGoalStartMode,
} from '../lib/profile';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImageToCloudinary } from '../lib/cloudinary';
import { getMyStatistics, type MyStatisticsResponse } from '../lib/statistics';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import {
    getMyRunSessions,
    type RunSession,
} from '../lib/runSessions';

import {
    getStatisticsHistory,
    type StatisticsHistoryDay,
} from '../lib/statisticsHistory';

function formatCreatedAt(dateString?: string | null) {
    if (!dateString) return 'No disponible';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No disponible';

    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function formatPlanType(planType?: string | null) {
    switch (planType) {
        case 'professional':
            return 'Profesional';
        case 'pro':
            return 'Pro';
        case 'standard':
        default:
            return 'Estandar';
    }
}

function formatDistanceKm(meters?: number | null) {
    if (meters == null) return 'No disponible';

    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(2)} km`;
}

function formatAverageEffort(value?: number | null) {
    if (value == null) return 'No disponible';

    return `${value.toFixed(1)} / 10`;
}

function formatGoalType(type?: UserProfile['mainGoalType']) {
    switch (type) {
        case 'running':
            return 'Running';
        case 'routine':
            return 'Rutinas';
        default:
            return 'Sin definir';
    }
}

function formatGoalPeriod(period?: UserProfile['mainGoalPeriod']) {
    switch (period) {
        case 'weekly':
            return 'Semanal';
        case 'monthly':
            return 'Mensual';
        default:
            return 'Sin definir';
    }
}

function formatGoalMetric(metric?: UserProfile['mainGoalMetric']) {
    switch (metric) {
        case 'distance_km':
            return 'Kilómetros';
        case 'sessions':
            return 'Entrenamientos';
        case 'minutes':
            return 'Minutos';
        default:
            return 'Sin definir';
    }
}

function formatGoalTargetByType(
    type?: UserProfile['mainGoalType'],
    metric?: UserProfile['mainGoalMetric'],
    target?: number | null
) {
    if (typeof target !== 'number') return 'Sin definir';

    if (metric === 'distance_km') return `${target} km`;
    if (metric === 'minutes') return `${target} minutos`;

    if (metric === 'sessions') {
        return type === 'running'
            ? `${target} salidas`
            : `${target} entrenamientos`;
    }

    return String(target);
}

function formatMinutes(seconds?: number | null) {
    if (seconds == null) return 'No disponible';

    const minutes = Math.round(seconds / 60);

    return `${minutes} minutos`;
}

function formatKmFromMeters(meters?: number | null) {
    if (meters == null) return 'No disponible';

    return `${(meters / 1000).toFixed(1)} km`;
}

function GoalInfoRow({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A',
                gap: 12,
            }}
        >
            <Text
                style={{
                    flex: 1,
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>

            <Text
                numberOfLines={1}
                style={{
                    flex: 1,
                    textAlign: 'right',
                    color: accent ? COLORS.primary : COLORS.textLight,
                    fontSize: 13,
                    fontWeight: accent ? '900' : '800',
                }}
            >
                {value}
            </Text>
        </View>
    );
}

function GoalOptionCard({
    selected,
    title,
    subtitle,
    icon,
    onPress,
}: {
    selected: boolean;
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                flex: 1,
                minHeight: 92,
                backgroundColor: selected ? 'rgba(198,255,0,0.12)' : '#1A1A1A',
                borderWidth: 1,
                borderColor: selected ? COLORS.primary : '#333333',
                borderRadius: 18,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Ionicons
                name={icon}
                size={30}
                color={selected ? COLORS.primary : COLORS.textMuted}
                style={{ marginBottom: 8 }}
            />

            <Text
                style={{
                    color: selected ? COLORS.primary : COLORS.textLight,
                    fontSize: 14,
                    fontWeight: '900',
                    textAlign: 'center',
                }}
            >
                {title}
            </Text>

            {subtitle ? (
                <Text
                    style={{
                        color: COLORS.textMuted,
                        fontSize: 11,
                        textAlign: 'center',
                        marginTop: 4,
                        lineHeight: 15,
                    }}
                >
                    {subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
}

function GoalModalButton({
    label,
    onPress,
    variant = 'dark',
    disabled = false,
}: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'dark';
    disabled?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={{
                flex: 1,
                backgroundColor:
                    variant === 'primary' ? COLORS.primary : '#2A2A2A',
                opacity: disabled ? 0.6 : 1,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text
                style={{
                    color: variant === 'primary' ? '#111111' : COLORS.textLight,
                    fontSize: 13,
                    fontWeight: '900',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function ProfileMetricCard({
    icon,
    label,
    value,
    wide = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <View
            style={{
                width:
                    wide
                        ? '100%'
                        : '48.5%',

                minHeight: 76,

                backgroundColor:
                    '#181818',

                borderRadius: 15,

                borderWidth: 1,

                borderColor:
                    '#303030',

                padding: 11,

                justifyContent:
                    'center',
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <Ionicons
                    name={icon}
                    size={15}
                    color={COLORS.primary}
                />

                <Text
                    style={{
                        flex: 1,

                        color:
                            COLORS.textMuted,

                        fontSize: 9,

                        fontWeight: '800',

                        marginLeft: 6,
                    }}
                >
                    {label}
                </Text>
            </View>

            <Text
                style={{
                    color:
                        COLORS.textLight,

                    fontSize: 18,

                    fontWeight: '900',

                    marginTop: 7,
                }}
            >
                {value}
            </Text>
        </View>
    );
}

type ProfileGoalProgressData = {
    progressPercent: number;

    contextLabel: string;

    currentLabel: string;

    targetLabel: string;

    remainingLabel: string;

    completed: boolean;
};


function formatProfileGoalNumber(
    value: number
) {
    return Number.isInteger(value)
        ? String(value)
        : value.toFixed(1);
}


function getProfileGoalPeriodStart(
    period: MainGoalPeriod
) {
    const now =
        new Date();

    const start =
        new Date(now);

    start.setHours(
        0,
        0,
        0,
        0
    );


    /*
     * Semana:
     * lunes → domingo
     */
    if (period === 'weekly') {
        const day =
            start.getDay();

        const daysSinceMonday =
            (
                day + 6
            ) % 7;

        start.setDate(
            start.getDate() -
            daysSinceMonday
        );

        return start;
    }


    /*
     * Mes:
     * desde el día 1.
     */
    start.setDate(1);

    return start;
}


function parseProfileGoalDate(
    value: string
) {
    /*
     * Evitamos problemas de timezone
     * cuando recibimos YYYY-MM-DD.
     */
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return new Date(
            `${value}T12:00:00`
        );
    }

    return new Date(value);
}

function getProfileGoalCutoff(
    profile:
        UserProfile
) {
    const periodStart =
        getProfileGoalPeriodStart(
            profile.mainGoalPeriod!
        );


    if (
        profile.mainGoalStartMode !==
        'from_zero' ||
        !profile.mainGoalStartedAt
    ) {
        return periodStart;
    }


    const goalStart =
        new Date(
            profile.mainGoalStartedAt
        );


    if (
        Number.isNaN(
            goalStart.getTime()
        )
    ) {
        return periodStart;
    }


    /*
     * Nunca contamos algo anterior
     * al período actual.
     */
    return goalStart >
        periodStart
        ? goalStart
        : periodStart;
}

function buildProfileGoalProgress(
    profile:
        UserProfile |
        null |
        undefined,

    runSessions:
        RunSession[],

    historyDays:
        StatisticsHistoryDay[]
):
    ProfileGoalProgressData |
    null {
    if (
        !profile?.mainGoalType ||
        !profile?.mainGoalPeriod ||
        !profile?.mainGoalMetric ||
        typeof profile.mainGoalTarget !==
        'number' ||
        profile.mainGoalTarget <= 0
    ) {
        return null;
    }


    const period =
        profile.mainGoalPeriod;

    const target =
        profile.mainGoalTarget;

    const periodText =
        period === 'monthly'
            ? 'este mes'
            : 'esta semana';


    /*
     * =========================================
     * FECHA REAL DESDE LA QUE CUENTA EL OBJETIVO
     * =========================================
     */

    const cutoff =
        getProfileGoalCutoff(
            profile
        );

    const now =
        new Date();


    /*
     * Running válido para este objetivo.
     */
    const countedRunSessions =
        runSessions.filter(
            (session) => {
                const date =
                    getProfileRunDate(
                        session
                    );

                return (
                    date >= cutoff &&
                    date <= now
                );
            }
        );


    /*
     * Historial válido para este objetivo.
     */
    const countedHistoryDays =
        historyDays.filter(
            (day) => {
                const date =
                    parseProfileGoalDate(
                        day.date
                    );

                return (
                    date >= cutoff &&
                    date <= now
                );
            }
        );


    let currentValue = 0;

    let contextLabel = '';

    let currentLabel = '';

    let targetLabel = '';

    let remainingLabel = '';


    /*
     * =========================================
     * RUNNING — KILÓMETROS
     * =========================================
     */

    if (
        profile.mainGoalType ===
        'running' &&
        profile.mainGoalMetric ===
        'distance_km'
    ) {
        currentValue =
            countedRunSessions.reduce(
                (
                    total,
                    session
                ) =>
                    total +
                    (
                        session
                            .distanceMeters ??
                        0
                    ),
                0
            ) /
            1000;


        const remaining =
            Math.max(
                target -
                currentValue,
                0
            );


        contextLabel =
            `Running · ${periodText}`;

        currentLabel =
            `${currentValue.toFixed(
                1
            )} km recorridos`;

        targetLabel =
            `Meta: ${formatProfileGoalNumber(
                target
            )} km`;

        remainingLabel =
            remaining <= 0
                ? 'Objetivo alcanzado'
                : `Faltan ${remaining.toFixed(
                    1
                )} km para completar el objetivo`;
    }


    /*
     * =========================================
     * RUNNING — MINUTOS
     * =========================================
     */

    else if (
        profile.mainGoalType ===
        'running' &&
        profile.mainGoalMetric ===
        'minutes'
    ) {
        const totalSeconds =
            countedRunSessions.reduce(
                (
                    total,
                    session
                ) =>
                    total +
                    (
                        session
                            .durationSeconds ??
                        0
                    ),
                0
            );


        currentValue =
            Math.round(
                totalSeconds /
                60
            );


        const remaining =
            Math.max(
                target -
                currentValue,
                0
            );


        contextLabel =
            `Running · ${periodText}`;

        currentLabel =
            `${currentValue} minutos realizados`;

        targetLabel =
            `Meta: ${formatProfileGoalNumber(
                target
            )} min`;

        remainingLabel =
            remaining <= 0
                ? 'Objetivo alcanzado'
                : `Faltan ${formatProfileGoalNumber(
                    remaining
                )} minutos`;
    }


    /*
     * =========================================
     * RUNNING — SALIDAS
     * =========================================
     */

    else if (
        profile.mainGoalType ===
        'running' &&
        profile.mainGoalMetric ===
        'sessions'
    ) {
        currentValue =
            countedRunSessions.length;


        const remaining =
            Math.max(
                target -
                currentValue,
                0
            );


        contextLabel =
            `Running · ${periodText}`;

        currentLabel =
            `${currentValue} ${currentValue === 1
                ? 'salida realizada'
                : 'salidas realizadas'
            }`;

        targetLabel =
            `Meta: ${formatProfileGoalNumber(
                target
            )} ${target === 1
                ? 'salida'
                : 'salidas'
            }`;

        remainingLabel =
            remaining <= 0
                ? 'Objetivo alcanzado'
                : `Faltan ${formatProfileGoalNumber(
                    remaining
                )} ${remaining === 1
                    ? 'salida'
                    : 'salidas'
                }`;
    }


    /*
     * =========================================
     * RUTINAS — ENTRENAMIENTOS
     * =========================================
     */

    else if (
        profile.mainGoalType ===
        'routine' &&
        profile.mainGoalMetric ===
        'sessions'
    ) {
        currentValue =
            countedHistoryDays.reduce(
                (
                    total,
                    day
                ) => {
                    const routineCount =
                        day.records.filter(
                            (
                                record
                            ) =>
                                record.type ===
                                'routine'
                        ).length;

                    return (
                        total +
                        routineCount
                    );
                },
                0
            );


        const remaining =
            Math.max(
                target -
                currentValue,
                0
            );


        contextLabel =
            `Rutinas · ${periodText}`;

        currentLabel =
            `${currentValue} ${currentValue === 1
                ? 'entrenamiento realizado'
                : 'entrenamientos realizados'
            }`;

        targetLabel =
            `Meta: ${formatProfileGoalNumber(
                target
            )} entrenamientos`;

        remainingLabel =
            remaining <= 0
                ? 'Objetivo alcanzado'
                : `Faltan ${formatProfileGoalNumber(
                    remaining
                )} ${remaining === 1
                    ? 'entrenamiento'
                    : 'entrenamientos'
                }`;
    }

    else {
        return null;
    }


    const progressPercent =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (
                        currentValue /
                        target
                    ) *
                    100
                )
            )
        );


    return {
        progressPercent,

        contextLabel,

        currentLabel,

        targetLabel,

        remainingLabel,

        completed:
            currentValue >=
            target,
    };
}

type ProfileTrainingPoint = {
    date: string;
    value: number;
};


function getProfileRunDate(
    session: RunSession
) {
    return new Date(
        session.startedAt ??
        session.createdAt
    );
}


function getProfileRunRating(
    session: RunSession
) {
    const rating =
        (session as any).rating ??
        (session as any).valuation ??
        (session as any).effort ??
        null;

    if (rating == null) {
        return null;
    }

    const value =
        Number(rating);

    return Number.isNaN(value)
        ? null
        : value;
}


function getProfileDateKey(
    date: Date
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            date.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getGoalStartDate(
    period:
        MainGoalPeriod,

    startMode:
        MainGoalStartMode
) {
    const now =
        new Date();


    /*
     * EMPEZAR DESDE CERO:
     * exactamente desde este momento.
     */
    if (
        startMode ===
        'from_zero'
    ) {
        return now.toISOString();
    }


    /*
     * USAR DATOS DEL PERÍODO:
     * comienzo de semana o mes.
     */
    const start =
        new Date(now);

    start.setHours(
        0,
        0,
        0,
        0
    );


    if (
        period ===
        'weekly'
    ) {
        const day =
            start.getDay();

        const daysSinceMonday =
            (
                day + 6
            ) % 7;

        start.setDate(
            start.getDate() -
            daysSinceMonday
        );
    } else {
        start.setDate(1);
    }


    return start.toISOString();
}

function ProfileNavButton({
    icon,
    onPress,
    accent = false,
    disabled = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accent?: boolean;
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

                borderColor:
                    accent
                        ? 'rgba(198,255,0,0.55)'
                        : '#353535',

                opacity:
                    disabled
                        ? 0.45
                        : pressed
                            ? 0.8
                            : 1,
            })}
        >
            <Ionicons
                name={icon}
                size={28}
                color={
                    accent
                        ? COLORS.primary
                        : '#FFFFFF'
                }
            />
        </Pressable>
    );
}

function shouldShowCompleteProfileNotice(profileData?: MyProfileResponse | null) {
    if (!profileData) return true;

    const goal = profileData.profile.goal?.trim() ?? '';
    const hasHeight = typeof profileData.profile.heightCm === 'number';
    const hasWeight = typeof profileData.profile.weightKg === 'number';

    const missingGoal = goal.length === 0;
    const missingHeight = !hasHeight;
    const missingWeight = !hasWeight;

    return missingGoal || missingHeight || missingWeight;
}

export default function ProfileScreen() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [screenError, setScreenError] = useState<string | null>(null);

    const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
    const [statsData, setStatsData] = useState<MyStatisticsResponse | null>(null);

    const [
        profileRunSessions,
        setProfileRunSessions,
    ] = useState<RunSession[]>([]);

    const [
        profileHistoryDays,
        setProfileHistoryDays,
    ] = useState<StatisticsHistoryDay[]>([]);

    const [
        profileStatsChartWidth,
        setProfileStatsChartWidth,
    ] = useState(0);

    const [
        statisticsConfirmVisible,
        setStatisticsConfirmVisible,
    ] = useState(false);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [heightInput, setHeightInput] = useState('');
    const [weightInput, setWeightInput] = useState('');

    const [
        editProfileConfirmVisible,
        setEditProfileConfirmVisible,
    ] = useState(false);

    const [noticeDismissed, setNoticeDismissed] = useState(false);

    const [goalModalVisible, setGoalModalVisible] = useState(false);
    const [goalStep, setGoalStep] = useState(1);
    const [savingGoal, setSavingGoal] = useState(false);

    const [draftGoalType, setDraftGoalType] = useState<MainGoalType>('running');
    const [draftGoalPeriod, setDraftGoalPeriod] = useState<MainGoalPeriod>('weekly');
    const [draftGoalMetric, setDraftGoalMetric] = useState<MainGoalMetric>('distance_km');
    const [draftGoalTarget, setDraftGoalTarget] = useState('');
    const [draftGoalTargetError, setDraftGoalTargetError] = useState<string | null>(null);
    const [
        draftGoalStartMode,
        setDraftGoalStartMode,
    ] =
        useState<MainGoalStartMode>(
            'current_period'
        );



    const loadProfile = async () => {
        try {
            setLoading(true);
            setScreenError(null);

            const [
                data,
                stats,
                sessionsResult,
                historyResult,
            ] = await Promise.all([
                getMyProfile(),

                getMyStatistics(),

                /*
                 * Estas dos consultas son
                 * complementarias.
                 *
                 * Si una falla, el Perfil
                 * igualmente debe poder abrir.
                 */
                getMyRunSessions()
                    .catch((error) => {
                        console.log(
                            'No se pudieron cargar sesiones en Perfil:',
                            error
                        );

                        return {
                            items: [],
                        };
                    }),

                getStatisticsHistory()
                    .catch((error) => {
                        console.log(
                            'No se pudo cargar historial en Perfil:',
                            error
                        );

                        return {
                            items: [],
                        };
                    }),
            ]);


            setProfileData(data);

            setStatsData(stats);

            setProfileRunSessions(
                sessionsResult.items ?? []
            );

            setProfileHistoryDays(
                historyResult.items ?? []
            );

            setNameInput(data.user.name ?? '');
            setHeightInput(
                typeof data.profile.heightCm === 'number'
                    ? String(data.profile.heightCm)
                    : ''
            );
            setWeightInput(
                typeof data.profile.weightKg === 'number'
                    ? String(data.profile.weightKg)
                    : ''
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'No se pudo cargar el perfil.';
            setScreenError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        void loadProfile();

    }, [
        isAuthenticated,
    ]);

    const displayName = profileData?.user.name ?? user?.name ?? 'Tu nombre';
    const displayEmail = profileData?.user.email ?? user?.email ?? 'correo@ejemplo.com';
    const displayCreatedAt = formatCreatedAt(profileData?.user.createdAt);

    const displayPlan = formatPlanType(profileData?.profile.planType);
    const displayWeight =
        typeof profileData?.profile.weightKg === 'number'
            ? `${profileData.profile.weightKg} kg`
            : 'No disponible';

    const displayHeight =
        typeof profileData?.profile.heightCm === 'number'
            ? `${profileData.profile.heightCm} cm`
            : 'No disponible';

    const displayWeeklyKm = formatDistanceKm(statsData?.running.weeklyDistanceMeters);


    const mainGoal = profileData?.profile;

    const profileGoalProgress =
        buildProfileGoalProgress(
            mainGoal,

            profileRunSessions,

            profileHistoryDays
        );

    const hasMainGoal =
        !!mainGoal?.mainGoalType &&
        !!mainGoal?.mainGoalPeriod &&
        !!mainGoal?.mainGoalMetric &&
        typeof mainGoal?.mainGoalTarget === 'number';

    const goalTypeLabel = formatGoalType(mainGoal?.mainGoalType);
    const goalPeriodLabel = formatGoalPeriod(mainGoal?.mainGoalPeriod);
    const goalMetricLabel = formatGoalMetric(mainGoal?.mainGoalMetric);
    const goalTargetLabel = formatGoalTargetByType(
        mainGoal?.mainGoalType,
        mainGoal?.mainGoalMetric,
        mainGoal?.mainGoalTarget
    );

    const goalRunningDistance =
        mainGoal?.mainGoalPeriod === 'monthly'
            ? formatKmFromMeters(statsData?.running.monthlyDistanceMeters)
            : formatKmFromMeters(statsData?.running.weeklyDistanceMeters);

    const goalRunningMinutes =
        mainGoal?.mainGoalPeriod === 'monthly'
            ? formatMinutes(statsData?.running.monthlyDurationSeconds)
            : formatMinutes(statsData?.running.weeklyDurationSeconds);

    const goalTrainingCount =
        mainGoal?.mainGoalPeriod === 'weekly' &&
            typeof statsData?.summary.weeklySessions === 'number'
            ? `${statsData.summary.weeklySessions}`
            : 'No disponible';

    const goalAverageEffort = formatAverageEffort(statsData?.summary.avgEffort);

    const initials = useMemo(() => {
        return (
            displayName
                .split(' ')
                .filter(Boolean)
                .map(word => word[0]?.toUpperCase())
                .join('')
                .slice(0, 2) || 'U'
        );
    }, [displayName]);

    const profileTrainingPoints =
        useMemo<
            ProfileTrainingPoint[]
        >(() => {
            const points:
                ProfileTrainingPoint[] =
                [];


            profileHistoryDays.forEach(
                (day) => {
                    const routineRecords =
                        day.records.filter(
                            (record) =>
                                record.type ===
                                'routine' &&
                                record.rating !=
                                null
                        );


                    const exerciseRecords =
                        day.records.filter(
                            (record) =>
                                record.type ===
                                'exercise' &&
                                record.rating !=
                                null
                        );


                    /*
                     * Igual que Estadísticas:
                     *
                     * si existe valoración
                     * general de rutina,
                     * usamos esa.
                     */
                    if (
                        routineRecords.length >
                        0
                    ) {
                        routineRecords.forEach(
                            (record) => {
                                const value =
                                    Number(
                                        record.rating
                                    );

                                if (
                                    Number.isFinite(
                                        value
                                    )
                                ) {
                                    points.push({
                                        date:
                                            day.date,

                                        value,
                                    });
                                }
                            }
                        );

                        return;
                    }


                    /*
                     * Si no hubo valoración
                     * general de rutina,
                     * calculamos promedio
                     * de ejercicios de ese día.
                     */
                    if (
                        exerciseRecords.length >
                        0
                    ) {
                        const ratings =
                            exerciseRecords
                                .map(
                                    (
                                        record
                                    ) =>
                                        Number(
                                            record.rating
                                        )
                                )
                                .filter(
                                    Number.isFinite
                                );


                        if (
                            ratings.length >
                            0
                        ) {
                            const average =
                                ratings.reduce(
                                    (
                                        total,
                                        value
                                    ) =>
                                        total +
                                        value,
                                    0
                                ) /
                                ratings.length;


                            points.push({
                                date:
                                    day.date,

                                value:
                                    Number(
                                        average.toFixed(
                                            1
                                        )
                                    ),
                            });
                        }
                    }
                }
            );


            return points
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            a.date
                        ).getTime() -
                        new Date(
                            b.date
                        ).getTime()
                )
                .slice(-6);

        }, [
            profileHistoryDays,
        ]);

    const profileRunningPoints =
        useMemo(() => {
            return [
                ...profileRunSessions,
            ]
                .map(
                    (
                        session
                    ) => ({
                        session,

                        rating:
                            getProfileRunRating(
                                session
                            ),
                    })
                )
                .filter(
                    (
                        item
                    ): item is {
                        session:
                        RunSession;
                        rating:
                        number;
                    } =>
                        item.rating !=
                        null
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        getProfileRunDate(
                            a.session
                        ).getTime() -
                        getProfileRunDate(
                            b.session
                        ).getTime()
                )
                .slice(-6);

        }, [
            profileRunSessions,
        ]);

    const profileCombinedChart =
        useMemo(() => {
            const trainingValues =
                profileTrainingPoints.map(
                    (point) =>
                        point.value
                );

            const runningValues =
                profileRunningPoints.map(
                    (item) =>
                        item.rating
                );


            const hasTraining =
                trainingValues.length >=
                2;

            const hasRunning =
                runningValues.length >=
                2;


            /*
             * Si tenemos las dos líneas,
             * utilizamos igual cantidad
             * de puntos para evitar
             * desalineaciones visuales.
             */
            let pointCount = 0;

            if (
                hasTraining &&
                hasRunning
            ) {
                pointCount =
                    Math.min(
                        trainingValues.length,
                        runningValues.length,
                        6
                    );

            } else if (
                hasTraining
            ) {
                pointCount =
                    Math.min(
                        trainingValues.length,
                        6
                    );

            } else if (
                hasRunning
            ) {
                pointCount =
                    Math.min(
                        runningValues.length,
                        6
                    );
            }


            const datasets: any[] =
                [];


            if (
                hasTraining &&
                pointCount > 0
            ) {
                datasets.push({
                    data:
                        trainingValues.slice(
                            -pointCount
                        ),

                    color:
                        () =>
                            COLORS.primary,

                    strokeWidth: 3,
                });
            }


            if (
                hasRunning &&
                pointCount > 0
            ) {
                datasets.push({
                    data:
                        runningValues.slice(
                            -pointCount
                        ),

                    color:
                        () =>
                            '#4DD0E1',

                    strokeWidth: 3,
                });
            }


            /*
             * Serie invisible para
             * mantener escala hasta 10.
             */
            if (
                pointCount > 0
            ) {
                datasets.push({
                    data:
                        Array(
                            pointCount
                        ).fill(10),

                    color:
                        () =>
                            'rgba(0,0,0,0)',

                    strokeWidth: 0,

                    withDots: false,
                });
            }


            return {
                labels:
                    Array.from(
                        {
                            length:
                                pointCount,
                        },

                        (
                            _,
                            index
                        ) =>
                            String(
                                index +
                                1
                            )
                    ),

                datasets,

                pointCount,

                hasTraining,

                hasRunning,
            };

        }, [
            profileTrainingPoints,
            profileRunningPoints,
        ]);

    const profileCurrentAverage =
        statsData
            ?.performance
            .weeklyAverage ??
        statsData
            ?.performance
            .monthlyAverage ??
        statsData
            ?.performance
            .latestAverage ??
        null;


    const profileActivityTotals =
        useMemo(() => {
            let routineRecords = 0;

            let exerciseRecords = 0;


            /*
             * Set evita contar dos veces
             * un mismo día.
             */
            const activeDays =
                new Set<string>();


            profileHistoryDays.forEach(
                (day) => {
                    if (
                        day.records.length >
                        0
                    ) {
                        activeDays.add(
                            day.date
                        );
                    }


                    day.records.forEach(
                        (record) => {
                            if (
                                record.type ===
                                'routine'
                            ) {
                                routineRecords +=
                                    1;
                            }

                            if (
                                record.type ===
                                'exercise'
                            ) {
                                exerciseRecords +=
                                    1;
                            }
                        }
                    );
                }
            );


            profileRunSessions.forEach(
                (session) => {
                    activeDays.add(
                        getProfileDateKey(
                            getProfileRunDate(
                                session
                            )
                        )
                    );
                }
            );


            return {
                activeDays:
                    activeDays.size,

                routineRecords,

                exerciseRecords,

                runningSessions:
                    profileRunSessions.length,
            };

        }, [
            profileHistoryDays,
            profileRunSessions,
        ]);

    const showEmptyProfileNotice =
        !noticeDismissed && shouldShowCompleteProfileNotice(profileData);


    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);

            const parsedHeight =
                heightInput.trim() === '' ? null : Number(heightInput.replace(',', '.'));
            const parsedWeight =
                weightInput.trim() === '' ? null : Number(weightInput.replace(',', '.'));

            if (parsedHeight !== null && Number.isNaN(parsedHeight)) {
                Alert.alert('Dato inválido', 'La altura debe ser un número válido.');
                return;
            }

            if (parsedWeight !== null && Number.isNaN(parsedWeight)) {
                Alert.alert('Dato inválido', 'El peso debe ser un número válido.');
                return;
            }

            const response = await updateMyProfile({
                name: nameInput.trim() ? nameInput.trim() : '',
                heightCm: parsedHeight,
                weightKg: parsedWeight,
            });

            setProfileData({
                user: response.user,
                profile: response.profile,
            });

            setNameInput(response.user.name ?? '');
            setHeightInput(
                typeof response.profile.heightCm === 'number'
                    ? String(response.profile.heightCm)
                    : ''
            );
            setWeightInput(
                typeof response.profile.weightKg === 'number'
                    ? String(response.profile.weightKg)
                    : ''
            );

            setIsEditingProfile(false);
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar el perfil.'
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleConfirmEditProfile = () => {
        /*
         * Volvemos a cargar en los inputs
         * los datos actualmente guardados.
         */
        if (profileData) {
            setNameInput(
                profileData.user.name ?? ''
            );

            setHeightInput(
                typeof profileData.profile.heightCm ===
                    'number'
                    ? String(
                        profileData.profile.heightCm
                    )
                    : ''
            );

            setWeightInput(
                typeof profileData.profile.weightKg ===
                    'number'
                    ? String(
                        profileData.profile.weightKg
                    )
                    : ''
            );
        }

        setEditProfileConfirmVisible(false);

        setIsEditingProfile(true);
    };

    const handleCancelEditProfile = () => {
        if (!profileData) return;

        // restaurar valores originales
        setNameInput(profileData.user.name ?? '');
        setHeightInput(
            typeof profileData.profile.heightCm === 'number'
                ? String(profileData.profile.heightCm)
                : ''
        );
        setWeightInput(
            typeof profileData.profile.weightKg === 'number'
                ? String(profileData.profile.weightKg)
                : ''
        );

        setIsEditingProfile(false);
    };

    const handlePickProfileImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Necesitamos acceso a tu galería para elegir una imagen.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                Alert.alert('Error', 'No se pudo procesar la imagen seleccionada.');
                return;
            }

            setUploadingPhoto(true);

            const upload = await uploadProfileImageToCloudinary({
                uri: asset.uri,
                file: (asset as any).file ?? null,
            });

            const response = await updateMyProfile({
                profileImageUrl: upload.secure_url,
            });

            setProfileData({
                user: response.user,
                profile: response.profile,
            });
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar la foto de perfil.'
            );
        } finally {
            setUploadingPhoto(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <Redirect href="/" />
        );
    }

    if (loading) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: COLORS.background }}
            >
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (screenError) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text
                    className="text-center text-[14px] mb-4"
                    style={{ color: COLORS.textLight }}
                >
                    {screenError}
                </Text>

                <Pressable
                    onPress={loadProfile}
                    className="px-4 py-3 rounded-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text
                        className="text-[14px] font-semibold"
                        style={{ color: '#111111' }}
                    >
                        Reintentar
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const openGoalModal = () => {
        const currentProfile = profileData?.profile;

        setGoalStep(1);

        setDraftGoalType(currentProfile?.mainGoalType ?? 'running');
        setDraftGoalPeriod(currentProfile?.mainGoalPeriod ?? 'weekly');
        setDraftGoalMetric(currentProfile?.mainGoalMetric ?? 'distance_km');
        setDraftGoalTarget(
            typeof currentProfile?.mainGoalTarget === 'number'
                ? String(currentProfile.mainGoalTarget)
                : ''
        );
        setDraftGoalStartMode(
            currentProfile
                ?.mainGoalStartMode ??
            'current_period'
        );

        setGoalModalVisible(true);
        setDraftGoalTargetError(null);
    };

    const closeGoalModal = () => {
        if (savingGoal) return;

        setGoalModalVisible(false);
        setGoalStep(1);
        setDraftGoalTargetError(null);
    };

    const validateGoalTarget = () => {
        const normalizedValue = draftGoalTarget.replace(',', '.').trim();
        const target = Number(normalizedValue);

        if (!normalizedValue) {
            setDraftGoalTargetError('Ingresá un valor para tu objetivo.');
            return false;
        }

        if (!Number.isFinite(target)) {
            setDraftGoalTargetError('Ingresá solo números. Ejemplo: 20, 3 o 120.');
            return false;
        }

        if (target <= 0) {
            setDraftGoalTargetError('El objetivo debe ser mayor a cero.');
            return false;
        }

        if (draftGoalMetric === 'distance_km' && target > 300) {
            setDraftGoalTargetError(
                'Ese objetivo de kilómetros parece demasiado alto. Revisá si el valor es correcto.'
            );
            return false;
        }

        if (draftGoalMetric === 'sessions' && target > 60) {
            setDraftGoalTargetError(
                'La cantidad de entrenamientos parece demasiado alta para el período elegido.'
            );
            return false;
        }

        if (draftGoalMetric === 'minutes' && target > 10000) {
            setDraftGoalTargetError(
                'La cantidad de minutos parece demasiado alta. Revisá si el valor es correcto.'
            );
            return false;
        }

        setDraftGoalTargetError(null);
        return true;
    };

    const goNextGoalStep = () => {
        if (goalStep === 3 && !validateGoalTarget()) {
            return;
        }

        setGoalStep((prev) => Math.min(prev + 1, 5));
    };

    const goPreviousGoalStep = () => {
        setDraftGoalTargetError(null);
        setGoalStep((prev) => Math.max(prev - 1, 1));
    };

    const saveMainGoal = async () => {
        try {
            /*
             * Volvemos a validar antes
             * de enviar al backend.
             */
            if (!validateGoalTarget()) {
                return;
            }

            const target =
                Number(
                    draftGoalTarget
                        .replace(',', '.')
                        .trim()
                );

            const goalStartedAt =
                getGoalStartDate(
                    draftGoalPeriod,
                    draftGoalStartMode
                );

            setSavingGoal(true);

            const updated =
                await updateMyProfile({
                    mainGoalType:
                        draftGoalType,

                    mainGoalPeriod:
                        draftGoalPeriod,

                    mainGoalMetric:
                        draftGoalMetric,

                    mainGoalTarget:
                        target,

                    mainGoalStartMode:
                        draftGoalStartMode,

                    mainGoalStartedAt:
                        goalStartedAt,
                });

            setProfileData({
                user:
                    updated.user,

                profile:
                    updated.profile,
            });

            setGoalModalVisible(
                false
            );

            setGoalStep(1);

            Alert.alert(
                'Objetivo guardado',
                'Tu objetivo principal fue actualizado correctamente.'
            );

        } catch (error) {
            console.log(
                'Error guardando objetivo:',
                error
            );

            Alert.alert(
                'Error',

                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar el objetivo.'
            );

        } finally {
            setSavingGoal(false);
        }
    };

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                <AppHeader showProfile={false} />

                {/* TÍTULO */}
                <View className="self-start px-4 mb-3">
                    <Text className="text-md text-gray-500">
                        Perfil de usuario
                    </Text>
                </View>

                {/* PANEL PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        horizontal={false}
                        contentContainerStyle={{ paddingHorizontal: 8 }}
                    >
                        {/* NOTIFICACIÓN PERFIL VACÍO */}
                        {showEmptyProfileNotice && (
                            <View
                                className="rounded-2xl px-4 py-3 mb-4"
                                style={{
                                    backgroundColor: '#1A1A1A',
                                    borderWidth: 1,
                                    borderColor: '#2F2F2F',
                                }}
                            >
                                <View className="flex-row items-start justify-between">
                                    <Text
                                        className="text-[13px] leading-5 flex-1 pr-3"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Actualiza los datos de tu perfil para ver mejores resultados.
                                    </Text>

                                    <Pressable onPress={() => setNoticeDismissed(true)}>
                                        <Text
                                            className="text-[16px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            ✕
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* DATOS DEL PERFIL */}
                        <View className="mb-4">
                            <View
                                className="rounded-2xl px-2 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                {/* Cabecera */}
                                <View className="flex-row items-center mb-4">
                                    <View className="mr-4 items-center">
                                        <View
                                            className="w-20 h-20 rounded-full items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: COLORS.primary, borderWidth: 4, borderColor: '#2F2F2F' }}
                                        >
                                            {profileData?.profile.profileImageUrl ? (
                                                <Image
                                                    source={{ uri: profileData.profile.profileImageUrl }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Text
                                                    className="text-[20px] font-bold"
                                                    style={{ color: '#111111' }}
                                                >
                                                    {initials}
                                                </Text>
                                            )}
                                        </View>

                                        {isEditingProfile && (
                                            <Pressable
                                                onPress={handlePickProfileImage}
                                                disabled={uploadingPhoto}
                                                className="mt-2 px-3 py-2 rounded-xl items-center justify-center"
                                                style={{ backgroundColor: '#444444' }}
                                            >
                                                <Text
                                                    className="text-[11px]"
                                                    style={{ color: COLORS.textLight }}
                                                >
                                                    {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>

                                    <View className="flex-1">
                                        {isEditingProfile ? (
                                            <TextInput
                                                value={nameInput}
                                                onChangeText={setNameInput}
                                                placeholder="Tu nombre"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mb-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[16px] font-semibold"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayName}
                                            </Text>
                                        )}

                                        <Text
                                            className="text-[13px] mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            {displayEmail}
                                        </Text>

                                        <Text
                                            className="text-[12px] font-medium mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            fecha de creación: {displayCreatedAt}
                                        </Text>
                                    </View>
                                </View>

                                {/* Línea divisoria */}
                                <View
                                    className="h-px mb-4 mx-1"
                                    style={{ backgroundColor: '#3A3A3A' }}
                                />

                                {/* Peso / Altura / Plan en horizontal */}
                                <View className="flex-row items-start mb-4">
                                    <View className="flex-1 mr-2 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Peso
                                        </Text>

                                        {isEditingProfile ? (
                                            <TextInput
                                                value={weightInput}
                                                onChangeText={setWeightInput}
                                                keyboardType="numeric"
                                                placeholder="Ej: 80"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mt-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                    width: '100%',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[14px] mt-1"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayWeight}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="flex-1 mr-2 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Altura
                                        </Text>

                                        {isEditingProfile ? (
                                            <TextInput
                                                value={heightInput}
                                                onChangeText={setHeightInput}
                                                keyboardType="numeric"
                                                placeholder="Ej: 175"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mt-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                    width: '100%',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[14px] mt-1"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayHeight}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="flex-1 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Plan
                                        </Text>
                                        <Text
                                            className="text-[14px] mt-1"
                                            style={{ color: COLORS.textLight }}
                                            numberOfLines={1}
                                        >
                                            {displayPlan}
                                        </Text>
                                    </View>
                                </View>

                                {/* Kilómetros reales */}
                                <View>
                                    <Text
                                        className="text-[12px] font-semibold"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Kilómetros recorridos esta semana
                                    </Text>

                                    <Text
                                        className="text-[16px] font-semibold mt-1"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        {displayWeeklyKm}
                                    </Text>

                                    <View
                                        className="h-px my-4 mx-1"
                                        style={{ backgroundColor: '#2F2F2F' }}
                                    />


                                    {/* ======================================= */}
                                    {/* PROGRESO DEL OBJETIVO                   */}
                                    {/* ======================================= */}

                                    <View
                                        style={{
                                            backgroundColor:
                                                '#181818',

                                            borderRadius: 16,

                                            borderWidth: 1,

                                            borderColor:
                                                profileGoalProgress
                                                    ? 'rgba(198,255,0,0.26)'
                                                    : '#303030',

                                            padding: 13,
                                        }}
                                    >
                                        {profileGoalProgress ? (
                                            <>
                                                {/* CABECERA */}

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
                                                            width: 34,
                                                            height: 34,

                                                            borderRadius: 17,

                                                            backgroundColor:
                                                                'rgba(198,255,0,0.08)',

                                                            alignItems:
                                                                'center',

                                                            justifyContent:
                                                                'center',

                                                            marginRight: 9,
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name={
                                                                profileGoalProgress
                                                                    .completed
                                                                    ? 'checkmark'
                                                                    : 'flag-outline'
                                                            }
                                                            size={18}
                                                            color={
                                                                COLORS.primary
                                                            }
                                                        />
                                                    </View>


                                                    <View
                                                        style={{
                                                            flex: 1,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 13,

                                                                fontWeight:
                                                                    '900',
                                                            }}
                                                        >
                                                            Progreso de tu objetivo
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textMuted,

                                                                fontSize: 9,

                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {
                                                                profileGoalProgress
                                                                    .contextLabel
                                                            }
                                                        </Text>
                                                    </View>


                                                    {/* PORCENTAJE */}

                                                    <View
                                                        style={{
                                                            backgroundColor:
                                                                'rgba(198,255,0,0.10)',

                                                            borderRadius: 999,

                                                            paddingHorizontal:
                                                                9,

                                                            paddingVertical:
                                                                4,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.primary,

                                                                fontSize: 11,

                                                                fontWeight:
                                                                    '900',
                                                            }}
                                                        >
                                                            {
                                                                profileGoalProgress
                                                                    .progressPercent
                                                            }%
                                                        </Text>
                                                    </View>
                                                </View>


                                                {/* ACTUAL / OBJETIVO */}

                                                <View
                                                    style={{
                                                        flexDirection:
                                                            'row',

                                                        justifyContent:
                                                            'space-between',

                                                        alignItems:
                                                            'flex-end',

                                                        gap: 10,

                                                        marginTop: 13,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flex: 1,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    '#777777',

                                                                fontSize: 8,

                                                                fontWeight:
                                                                    '800',
                                                            }}
                                                        >
                                                            REALIZADO
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize: 13,

                                                                fontWeight:
                                                                    '900',

                                                                marginTop: 3,
                                                            }}
                                                        >
                                                            {
                                                                profileGoalProgress
                                                                    .currentLabel
                                                            }
                                                        </Text>
                                                    </View>


                                                    <View
                                                        style={{
                                                            flex: 1,

                                                            alignItems:
                                                                'flex-end',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    '#777777',

                                                                fontSize: 8,

                                                                fontWeight:
                                                                    '800',
                                                            }}
                                                        >
                                                            OBJETIVO
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.primary,

                                                                fontSize: 12,

                                                                fontWeight:
                                                                    '900',

                                                                marginTop: 3,

                                                                textAlign:
                                                                    'right',
                                                            }}
                                                        >
                                                            {
                                                                profileGoalProgress
                                                                    .targetLabel
                                                            }
                                                        </Text>
                                                    </View>
                                                </View>


                                                {/* BARRA */}

                                                <View
                                                    style={{
                                                        height: 12,

                                                        borderRadius: 999,

                                                        backgroundColor:
                                                            '#282828',

                                                        overflow:
                                                            'hidden',

                                                        marginTop: 13,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            height: '100%',

                                                            width:
                                                                `${profileGoalProgress.progressPercent}%`,

                                                            borderRadius:
                                                                999,

                                                            backgroundColor:
                                                                COLORS.primary,
                                                        }}
                                                    />
                                                </View>


                                                {/* FALTANTE */}

                                                <View
                                                    style={{
                                                        flexDirection:
                                                            'row',

                                                        alignItems:
                                                            'center',

                                                        marginTop: 9,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={
                                                            profileGoalProgress
                                                                .completed
                                                                ? 'checkmark-circle'
                                                                : 'time-outline'
                                                        }
                                                        size={14}
                                                        color={
                                                            profileGoalProgress
                                                                .completed
                                                                ? COLORS.primary
                                                                : '#888888'
                                                        }
                                                    />

                                                    <Text
                                                        style={{
                                                            flex: 1,

                                                            color:
                                                                profileGoalProgress
                                                                    .completed
                                                                    ? COLORS.primary
                                                                    : '#A0A0A0',

                                                            fontSize: 9,

                                                            fontWeight:
                                                                profileGoalProgress
                                                                    .completed
                                                                    ? '900'
                                                                    : '700',

                                                            marginLeft: 6,
                                                        }}
                                                    >
                                                        {
                                                            profileGoalProgress
                                                                .remainingLabel
                                                        }
                                                    </Text>
                                                </View>
                                            </>
                                        ) : (
                                            /*
                                             * Usuario sin objetivo.
                                             */
                                            <View
                                                style={{
                                                    flexDirection:
                                                        'row',

                                                    alignItems:
                                                        'center',
                                                }}
                                            >
                                                <Ionicons
                                                    name="flag-outline"
                                                    size={20}
                                                    color="#666666"
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
                                                                COLORS.textLight,

                                                            fontSize: 11,

                                                            fontWeight:
                                                                '900',
                                                        }}
                                                    >
                                                        Progreso del objetivo
                                                    </Text>

                                                    <Text
                                                        style={{
                                                            color:
                                                                COLORS.textMuted,

                                                            fontSize: 9,

                                                            lineHeight: 14,

                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        Definí un objetivo para comenzar a visualizar tu progreso.
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* TU OBJETIVO */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold px-2 mb-1"
                                style={{ color: COLORS.accent }}
                            >
                                Tu objetivo
                            </Text>

                            <View
                                className="rounded-2xl px-3 py-3"
                                style={{
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: '#2F2F2F',
                                }}
                            >
                                {hasMainGoal ? (
                                    <>
                                        <View
                                            style={{
                                                backgroundColor: '#1A1A1A',
                                                borderRadius: 18,
                                                padding: 14,
                                                borderWidth: 1,
                                                borderColor: 'rgba(198,255,0,0.25)',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '900',
                                                    marginBottom: 4,
                                                }}
                                            >
                                                Objetivo principal
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                Este objetivo se usará para mostrar tu progreso en el Home.
                                            </Text>

                                            <GoalInfoRow
                                                label="Tipo de entrenamiento"
                                                value={`${goalTypeLabel} - ${goalPeriodLabel}`}
                                                accent
                                            />

                                            <GoalInfoRow
                                                label="Medición"
                                                value={goalMetricLabel}
                                            />

                                            <GoalInfoRow
                                                label="Objetivo"
                                                value={goalTargetLabel}
                                                accent
                                            />

                                            {mainGoal?.mainGoalType === 'running' ? (
                                                <>
                                                    <GoalInfoRow
                                                        label="Kilómetros recorridos"
                                                        value={goalRunningDistance}
                                                    />

                                                    <GoalInfoRow
                                                        label="Cantidad de entrenamientos"
                                                        value={goalTrainingCount}
                                                    />

                                                    <GoalInfoRow
                                                        label="Minutos de running"
                                                        value={goalRunningMinutes}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <GoalInfoRow
                                                        label="Entrenamientos registrados"
                                                        value={goalTrainingCount}
                                                    />

                                                    <GoalInfoRow
                                                        label="Promedio de esfuerzo"
                                                        value={goalAverageEffort}
                                                    />

                                                    <GoalInfoRow
                                                        label="Estado del objetivo"
                                                        value="En seguimiento"
                                                    />
                                                </>
                                            )}
                                        </View>

                                        <Pressable
                                            onPress={openGoalModal}
                                            className="px-4 py-3 rounded-xl items-center justify-center mt-3"
                                            style={{
                                                backgroundColor: '#444444',
                                            }}
                                        >
                                            <Text
                                                className="text-[14px] font-semibold"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                Editar objetivo
                                            </Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <View
                                            style={{
                                                backgroundColor: '#1A1A1A',
                                                borderRadius: 18,
                                                padding: 14,
                                                borderWidth: 1,
                                                borderColor: '#2F2F2F',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '900',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                Todavía no definiste tu objetivo
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                }}
                                            >
                                                Podés elegir un objetivo de running o rutinas, semanal o mensual.
                                                Luego se mostrará tu progreso en esta pantalla y en el Home.
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={openGoalModal}
                                            className="px-4 py-3 rounded-xl items-center justify-center mt-3"
                                            style={{
                                                backgroundColor: COLORS.primary,
                                            }}
                                        >
                                            <Text
                                                className="text-[14px] font-semibold"
                                                style={{ color: '#111111' }}
                                            >
                                                Crear objetivo
                                            </Text>
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* ================================================= */}
                        {/* TUS ESTADÍSTICAS                                  */}
                        {/* ================================================= */}

                        <View
                            style={{
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        COLORS.accent,

                                    fontSize: 15,

                                    fontWeight: '700',

                                    paddingHorizontal: 8,

                                    marginBottom: 7,
                                }}
                            >
                                Tus estadísticas
                            </Text>


                            <View
                                style={{
                                    backgroundColor:
                                        '#111111',

                                    borderRadius: 20,

                                    borderWidth: 1,

                                    borderColor:
                                        '#2F2F2F',

                                    padding: 11,
                                }}
                            >
                                {/* GRÁFICO INTERACTIVO */}

                                <Pressable
                                    onPress={() =>
                                        setStatisticsConfirmVisible(
                                            true
                                        )
                                    }
                                    style={({ pressed }) => ({
                                        backgroundColor:
                                            pressed
                                                ? '#1D1D1D'
                                                : '#181818',

                                        borderRadius: 17,

                                        borderWidth: 1,

                                        borderColor:
                                            pressed
                                                ? 'rgba(198,255,0,0.40)'
                                                : '#303030',

                                        overflow: 'hidden',

                                        paddingTop: 12,

                                        opacity:
                                            pressed
                                                ? 0.9
                                                : 1,
                                    })}
                                >
                                    {/* CABECERA */}

                                    <View
                                        style={{
                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'space-between',

                                            paddingHorizontal:
                                                12,

                                            marginBottom: 4,
                                        }}
                                    >
                                        <View>
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textLight,

                                                    fontSize: 13,

                                                    fontWeight:
                                                        '900',
                                                }}
                                            >
                                                Rendimiento reciente
                                            </Text>

                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize: 9,

                                                    marginTop: 2,
                                                }}
                                            >
                                                Últimos registros valorados
                                            </Text>
                                        </View>

                                        <Ionicons
                                            name="open-outline"
                                            size={18}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    </View>


                                    {/* LEYENDA */}

                                    <View
                                        style={{
                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',

                                            paddingHorizontal:
                                                12,

                                            marginTop: 8,

                                            gap: 14,
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
                                            <View
                                                style={{
                                                    width: 8,
                                                    height: 8,

                                                    borderRadius: 4,

                                                    backgroundColor:
                                                        COLORS.primary,

                                                    marginRight: 5,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    color:
                                                        '#AFAFAF',

                                                    fontSize: 8,
                                                }}
                                            >
                                                Rutinas / ejercicios
                                            </Text>
                                        </View>


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
                                                    width: 8,
                                                    height: 8,

                                                    borderRadius: 4,

                                                    backgroundColor:
                                                        '#4DD0E1',

                                                    marginRight: 5,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    color:
                                                        '#AFAFAF',

                                                    fontSize: 8,
                                                }}
                                            >
                                                Running
                                            </Text>
                                        </View>
                                    </View>


                                    {/* GRÁFICO */}

                                    <View
                                        onLayout={(
                                            event
                                        ) => {
                                            setProfileStatsChartWidth(
                                                event
                                                    .nativeEvent
                                                    .layout.width
                                            );
                                        }}
                                        style={{
                                            marginTop: 6,
                                        }}
                                    >
                                        {profileCombinedChart
                                            .pointCount >
                                            0 &&
                                            profileStatsChartWidth >
                                            0 ? (
                                            <LineChart
                                                data={{
                                                    labels:
                                                        profileCombinedChart
                                                            .labels,

                                                    datasets:
                                                        profileCombinedChart
                                                            .datasets,
                                                }}

                                                width={
                                                    profileStatsChartWidth
                                                }

                                                height={190}

                                                fromZero

                                                segments={5}

                                                withShadow={
                                                    false
                                                }

                                                chartConfig={{
                                                    backgroundGradientFrom:
                                                        '#181818',

                                                    backgroundGradientTo:
                                                        '#181818',

                                                    decimalPlaces:
                                                        0,

                                                    color:
                                                        (
                                                            opacity =
                                                                1
                                                        ) =>
                                                            `rgba(255,255,255,${opacity})`,

                                                    labelColor:
                                                        (
                                                            opacity =
                                                                1
                                                        ) =>
                                                            `rgba(140,140,140,${opacity})`,

                                                    propsForDots:
                                                    {
                                                        r: '4',

                                                        strokeWidth:
                                                            '2',

                                                        stroke:
                                                            '#111111',
                                                    },

                                                    propsForBackgroundLines:
                                                    {
                                                        stroke:
                                                            'rgba(255,255,255,0.06)',
                                                    },
                                                }}

                                                style={{
                                                    marginLeft:
                                                        -10,

                                                    borderRadius:
                                                        16,
                                                }}
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    minHeight: 150,

                                                    alignItems:
                                                        'center',

                                                    justifyContent:
                                                        'center',

                                                    padding: 16,
                                                }}
                                            >
                                                <Ionicons
                                                    name="analytics-outline"
                                                    size={29}
                                                    color="#666666"
                                                />

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textMuted,

                                                        fontSize: 10,

                                                        textAlign:
                                                            'center',

                                                        marginTop: 8,
                                                    }}
                                                >
                                                    Registrá al menos dos valoraciones para comenzar a visualizar tu evolución.
                                                </Text>
                                            </View>
                                        )}
                                    </View>


                                    {/* ACCIÓN */}

                                    <View
                                        style={{
                                            borderTopWidth: 1,

                                            borderTopColor:
                                                '#292929',

                                            marginHorizontal:
                                                12,

                                            paddingVertical:
                                                9,

                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    COLORS.primary,

                                                fontSize: 9,

                                                fontWeight:
                                                    '800',
                                            }}
                                        >
                                            Toca para ver estadísticas completas
                                        </Text>

                                        <Ionicons
                                            name="chevron-forward"
                                            size={13}
                                            color={
                                                COLORS.primary
                                            }
                                            style={{
                                                marginLeft: 4,
                                            }}
                                        />
                                    </View>
                                </Pressable>


                                {/* MÉTRICAS */}

                                <View
                                    style={{
                                        flexDirection: 'row',

                                        flexWrap: 'wrap',

                                        justifyContent:
                                            'space-between',

                                        gap: 8,

                                        marginTop: 10,
                                    }}
                                >
                                    <ProfileMetricCard
                                        icon="star-outline"
                                        label="Promedio actual"
                                        value={
                                            profileCurrentAverage !=
                                                null
                                                ? `${Number(
                                                    profileCurrentAverage
                                                ).toFixed(
                                                    1
                                                )} ★`
                                                : '--'
                                        }
                                        wide
                                    />


                                    <ProfileMetricCard
                                        icon="calendar-outline"
                                        label="Días activos"
                                        value={String(
                                            profileActivityTotals
                                                .activeDays
                                        )}
                                    />


                                    <ProfileMetricCard
                                        icon="barbell-outline"
                                        label="Rutinas completadas"
                                        value={String(
                                            profileActivityTotals
                                                .routineRecords
                                        )}
                                    />


                                    <ProfileMetricCard
                                        icon="fitness-outline"
                                        label="Ejercicios registrados"
                                        value={String(
                                            profileActivityTotals
                                                .exerciseRecords
                                        )}
                                    />


                                    <ProfileMetricCard
                                        icon="walk-outline"
                                        label="Corridas totales"
                                        value={String(
                                            profileActivityTotals
                                                .runningSessions
                                        )}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Línea divisoria */}
                        <View
                            className="h-px mb-4 mx-1"
                            style={{ backgroundColor: '#3A3A3A' }}
                        />

                        {/* TIPO DE CUENTA */}
                        <View className="mb-3">
                            <View
                                className="rounded-2xl px-4 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[15px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Tipo de cuenta: Plan {displayPlan}
                                </Text>

                                <Text
                                    className="text-[12px] mt-2"
                                    style={{
                                        color: COLORS.textMuted,
                                        textDecorationLine: 'underline',
                                    }}
                                >
                                    cambiar tipo plan
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>

                {/* ================================================= */}
                {/* NAVEGACIÓN INFERIOR                               */}
                {/* ================================================= */}

                {!isEditingProfile ? (
                    /*
                     * ===============================================
                     * MODO NORMAL
                     * ===============================================
                     */
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',

                            gap: 8,

                            marginHorizontal: 8,
                            marginTop: 10,
                            marginBottom: 10,
                        }}
                    >
                        {/* 1 — HOME */}

                        <ProfileNavButton
                            icon="home-outline"
                            onPress={() =>
                                router.replace('/home')
                            }
                        />


                        {/* 2 — ESTADÍSTICAS */}

                        <ProfileNavButton
                            icon="stats-chart-outline"
                            onPress={() =>
                                router.push('/statistics')
                            }
                        />


                        {/* 3 — HISTORIAL */}

                        <ProfileNavButton
                            icon="document-text-outline"
                            onPress={() =>
                                router.push(
                                    '/statistics-history'
                                )
                            }
                        />


                        {/* 4 — EDITAR PERFIL */}

                        <ProfileNavButton
                            icon="create-outline"
                            accent
                            onPress={() =>
                                setEditProfileConfirmVisible(
                                    true
                                )
                            }
                        />
                    </View>

                ) : (

                    /*
                     * ===============================================
                     * MODO EDICIÓN
                     * ===============================================
                     *
                     * Mientras hay cambios pendientes
                     * reemplazamos temporalmente la navegación
                     * por Cancelar / Guardar.
                     */
                    <View
                        style={{
                            flexDirection: 'row',

                            gap: 8,

                            marginHorizontal: 8,
                            marginTop: 10,
                            marginBottom: 8,
                        }}
                    >
                        {/* CANCELAR */}

                        <Pressable
                            disabled={savingProfile}
                            onPress={
                                handleCancelEditProfile
                            }
                            style={({ pressed }) => ({
                                flex: 1,

                                height: 58,

                                borderRadius: 17,

                                backgroundColor:
                                    pressed
                                        ? '#3A2024'
                                        : '#242424',

                                borderWidth: 3,
                                borderColor: '#503438',

                                alignItems: 'center',
                                justifyContent: 'center',

                                opacity:
                                    savingProfile
                                        ? 0.5
                                        : 1,
                            })}
                        >
                            <Ionicons
                                name="close-outline"
                                size={25}
                                color="#FFBABA"
                            />

                            <Text
                                style={{
                                    color: '#FFBABA',

                                    fontSize: 9,

                                    fontWeight: '800',

                                    marginTop: 1,
                                }}
                            >
                                Cancelar
                            </Text>
                        </Pressable>


                        {/* GUARDAR */}

                        <Pressable
                            disabled={savingProfile}
                            onPress={() =>
                                void handleSaveProfile()
                            }
                            style={({ pressed }) => ({
                                flex: 1,

                                height: 58,

                                borderRadius: 17,

                                backgroundColor:
                                    pressed
                                        ? '#B4E800'
                                        : COLORS.primary,

                                borderWidth: 3,
                                borderColor: '#353535',

                                alignItems: 'center',
                                justifyContent: 'center',

                                opacity:
                                    savingProfile
                                        ? 0.7
                                        : 1,
                            })}
                        >
                            {savingProfile ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#111111"
                                />
                            ) : (
                                <>
                                    <Ionicons
                                        name="checkmark-outline"
                                        size={25}
                                        color="#111111"
                                    />

                                    <Text
                                        style={{
                                            color: '#111111',

                                            fontSize: 9,

                                            fontWeight: '900',

                                            marginTop: 1,
                                        }}
                                    >
                                        Guardar
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}
            </View>

            {/* ================================================= */}
            {/* MODAL — IR A ESTADÍSTICAS                         */}
            {/* ================================================= */}

            <Modal
                visible={
                    statisticsConfirmVisible
                }
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setStatisticsConfirmVisible(
                        false
                    )
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
                            maxWidth: 380,

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#343434',

                            padding: 18,
                        }}
                    >
                        <View
                            style={{
                                width: 50,
                                height: 50,

                                borderRadius: 25,

                                alignSelf:
                                    'center',

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
                                name="stats-chart-outline"
                                size={25}
                                color={
                                    COLORS.primary
                                }
                            />
                        </View>


                        <Text
                            style={{
                                color:
                                    COLORS.textLight,

                                fontSize: 18,

                                fontWeight:
                                    '900',

                                textAlign:
                                    'center',

                                marginTop: 13,
                            }}
                        >
                            Estadísticas completas
                        </Text>


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
                            ¿Querés ver los datos completos en la pantalla de estadísticas?
                        </Text>


                        <Text
                            style={{
                                color:
                                    '#777777',

                                fontSize: 9,

                                lineHeight: 14,

                                textAlign:
                                    'center',

                                marginTop: 5,
                            }}
                        >
                            Allí podrás consultar Running, rutinas, ejercicios, períodos y detalles de rendimiento.
                        </Text>


                        <View
                            style={{
                                flexDirection:
                                    'row',

                                gap: 8,

                                marginTop: 18,
                            }}
                        >
                            <Pressable
                                onPress={() =>
                                    setStatisticsConfirmVisible(
                                        false
                                    )
                                }
                                style={({ pressed }) => ({
                                    flex: 1,

                                    height: 45,

                                    borderRadius:
                                        13,

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
                                    Quedarme aquí
                                </Text>
                            </Pressable>


                            <Pressable
                                onPress={() => {
                                    setStatisticsConfirmVisible(
                                        false
                                    );

                                    router.push(
                                        '/statistics'
                                    );
                                }}
                                style={({ pressed }) => ({
                                    flex: 1.25,

                                    height: 45,

                                    borderRadius:
                                        13,

                                    backgroundColor:
                                        pressed
                                            ? '#B4E800'
                                            : COLORS.primary,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            '#111111',

                                        fontSize: 11,

                                        fontWeight:
                                            '900',
                                    }}
                                >
                                    Ver estadísticas
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ================================================= */}
            {/* MODAL — CONFIRMAR EDICIÓN DEL PERFIL              */}
            {/* ================================================= */}

            <Modal
                visible={
                    editProfileConfirmVisible
                }
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setEditProfileConfirmVisible(
                        false
                    )
                }
            >
                <View
                    style={{
                        flex: 1,

                        backgroundColor:
                            'rgba(0,0,0,0.76)',

                        justifyContent: 'center',
                        alignItems: 'center',

                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 380,

                            backgroundColor:
                                '#101010',

                            borderRadius: 24,

                            borderWidth: 1,

                            borderColor:
                                '#343434',

                            padding: 18,
                        }}
                    >
                        {/* ICONO */}

                        <View
                            style={{
                                width: 50,
                                height: 50,

                                borderRadius: 25,

                                alignSelf: 'center',

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
                                name="person-outline"
                                size={25}
                                color={COLORS.primary}
                            />
                        </View>


                        {/* TITULO */}

                        <Text
                            style={{
                                color:
                                    COLORS.textLight,

                                fontSize: 18,

                                fontWeight: '900',

                                textAlign: 'center',

                                marginTop: 13,
                            }}
                        >
                            Editar información
                        </Text>


                        {/* MENSAJE */}

                        <Text
                            style={{
                                color:
                                    COLORS.textMuted,

                                fontSize: 11,

                                lineHeight: 17,

                                textAlign: 'center',

                                marginTop: 7,
                            }}
                        >
                            ¿Realmente querés editar la información de tu perfil?
                        </Text>

                        <Text
                            style={{
                                color: '#777777',

                                fontSize: 9,

                                lineHeight: 14,

                                textAlign: 'center',

                                marginTop: 5,
                            }}
                        >
                            Podrás modificar tu nombre, foto, peso y altura antes de guardar los cambios.
                        </Text>


                        {/* BOTONES */}

                        <View
                            style={{
                                flexDirection: 'row',

                                gap: 8,

                                marginTop: 18,
                            }}
                        >
                            {/* CANCELAR */}

                            <Pressable
                                onPress={() =>
                                    setEditProfileConfirmVisible(
                                        false
                                    )
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

                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                            >
                                <Text
                                    style={{
                                        color: '#C7C7C7',

                                        fontSize: 11,

                                        fontWeight: '800',
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>


                            {/* CONFIRMAR */}

                            <Pressable
                                onPress={
                                    handleConfirmEditProfile
                                }
                                style={({ pressed }) => ({
                                    flex: 1.25,

                                    height: 45,

                                    borderRadius: 13,

                                    backgroundColor:
                                        pressed
                                            ? '#B4E800'
                                            : COLORS.primary,

                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                            >
                                <Text
                                    style={{
                                        color: '#111111',

                                        fontSize: 11,

                                        fontWeight: '900',
                                    }}
                                >
                                    Sí, editar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={goalModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeGoalModal}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.70)',
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
                        <Text
                            style={{
                                color: COLORS.primary,
                                fontSize: 13,
                                fontWeight: '900',
                                marginBottom: 4,
                            }}
                        >
                            Objetivo: Paso {goalStep} de 5
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 20,
                                fontWeight: '900',
                                marginBottom: 14,
                            }}
                        >
                            {goalStep === 1 &&
                                'Elegí tu objetivo principal'}

                            {goalStep === 2 &&
                                'Elegí cómo medir tu progreso'}

                            {goalStep === 3 &&
                                'Definí tu meta'}

                            {goalStep === 4 &&
                                '¿Desde dónde querés comenzar?'}

                            {goalStep === 5 &&
                                'Confirmá tu objetivo'}
                        </Text>

                        {goalStep === 1 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 12,
                                        fontWeight: '800',
                                        marginBottom: 8,
                                    }}
                                >
                                    Tipo de entrenamiento
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <GoalOptionCard
                                        selected={draftGoalType === 'running'}
                                        title="Running"
                                        subtitle="Distancia, tiempo o salidas"
                                        icon="walk-outline"
                                        onPress={() => {
                                            setDraftGoalType('running');
                                            setDraftGoalMetric('distance_km');
                                        }}
                                    />

                                    <GoalOptionCard
                                        selected={draftGoalType === 'routine'}
                                        title="Rutinas"
                                        subtitle="Entrenamientos deportivos"
                                        icon="barbell-outline"
                                        onPress={() => {
                                            setDraftGoalType('routine');
                                            setDraftGoalMetric('sessions');
                                        }}
                                    />
                                </View>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 12,
                                        fontWeight: '800',
                                        marginBottom: 8,
                                    }}
                                >
                                    Medición del objetivo
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <GoalOptionCard
                                        selected={draftGoalPeriod === 'weekly'}
                                        title="Semanal"
                                        subtitle="Feedback más rápido"
                                        icon="calendar-outline"
                                        onPress={() => setDraftGoalPeriod('weekly')}
                                    />

                                    <GoalOptionCard
                                        selected={draftGoalPeriod === 'monthly'}
                                        title="Mensual"
                                        subtitle="Visión más amplia"
                                        icon="calendar-number-outline"
                                        onPress={() => setDraftGoalPeriod('monthly')}
                                    />
                                </View>
                            </View>
                        )}

                        {goalStep === 2 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Elegí el dato principal que querés usar para medir tu progreso.
                                </Text>

                                {draftGoalType === 'running' ? (
                                    <View style={{ gap: 10 }}>
                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'distance_km'}
                                            title="Kilómetros"
                                            subtitle="Distancia recorrida en el período elegido"
                                            icon="map-outline"
                                            onPress={() => setDraftGoalMetric('distance_km')}
                                        />

                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'minutes'}
                                            title="Minutos"
                                            subtitle="Tiempo total de running acumulado"
                                            icon="time-outline"
                                            onPress={() => setDraftGoalMetric('minutes')}
                                        />

                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'sessions'}
                                            title="Salidas"
                                            subtitle="Cantidad de sesiones de running"
                                            icon="footsteps-outline"
                                            onPress={() => setDraftGoalMetric('sessions')}
                                        />
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'sessions'}
                                            title="Entrenamientos"
                                            subtitle="Cuenta rutinas completas o registros con al menos 3 ejercicios"
                                            icon="barbell-outline"
                                            onPress={() => setDraftGoalMetric('sessions')}
                                        />

                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 12,
                                                lineHeight: 18,
                                                marginTop: 4,
                                            }}
                                        >
                                            Para que una sesión cuente como entrenamiento, deberá registrarse una rutina completa o al menos 3 ejercicios cargados.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {goalStep === 3 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Ingresá un valor alcanzable. Podés ajustarlo más adelante según tu progreso.
                                </Text>

                                <TextInput
                                    value={draftGoalTarget}
                                    onChangeText={(value) => {
                                        setDraftGoalTarget(value);
                                        setDraftGoalTargetError(null);
                                    }}
                                    keyboardType="numeric"
                                    placeholder={
                                        draftGoalMetric === 'distance_km'
                                            ? 'Ej: 20'
                                            : draftGoalMetric === 'minutes'
                                                ? 'Ej: 120'
                                                : 'Ej: 3'
                                    }
                                    placeholderTextColor={COLORS.textMuted}
                                    style={{
                                        backgroundColor: '#1A1A1A',
                                        borderWidth: 1,
                                        borderColor: draftGoalTargetError ? '#FF6B6B' : '#333333',
                                        borderRadius: 16,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        color: COLORS.textLight,
                                        fontSize: 18,
                                        fontWeight: '800',
                                        marginBottom: 10,
                                    }}
                                />
                                {draftGoalTargetError ? (
                                    <Text
                                        style={{
                                            color: '#FF6B6B',
                                            fontSize: 12,
                                            fontWeight: '800',
                                            marginBottom: 10,
                                            lineHeight: 16,
                                        }}
                                    >
                                        {draftGoalTargetError}
                                    </Text>
                                ) : null}

                                <Text
                                    style={{
                                        color: COLORS.primary,
                                        fontSize: 12,
                                        fontWeight: '800',
                                    }}
                                >
                                    {draftGoalMetric === 'distance_km' && 'Unidad: kilómetros'}
                                    {draftGoalMetric === 'minutes' && 'Unidad: minutos'}
                                    {draftGoalMetric === 'sessions' &&
                                        (draftGoalType === 'running'
                                            ? 'Unidad: salidas de running'
                                            : 'Unidad: entrenamientos')}
                                </Text>
                            </View>
                        )}

                        {goalStep === 4 && (
                            <View>
                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 13,

                                        lineHeight: 19,

                                        marginBottom: 15,
                                    }}
                                >
                                    Elegí desde qué momento querés calcular el progreso de este objetivo.
                                </Text>


                                {/* USAR PERÍODO ACTUAL */}

                                <GoalOptionCard
                                    selected={
                                        draftGoalStartMode ===
                                        'current_period'
                                    }

                                    title={
                                        draftGoalPeriod ===
                                            'monthly'
                                            ? 'Usar los datos de este mes'
                                            : 'Usar los datos de esta semana'
                                    }

                                    subtitle={
                                        draftGoalPeriod ===
                                            'monthly'
                                            ? 'Se incluirá todo lo que ya registraste desde el inicio de este mes.'
                                            : 'Se incluirá todo lo que ya registraste desde el inicio de esta semana.'
                                    }

                                    icon="calendar-outline"

                                    onPress={() =>
                                        setDraftGoalStartMode(
                                            'current_period'
                                        )
                                    }
                                />


                                <View
                                    style={{
                                        height: 10,
                                    }}
                                />


                                {/* EMPEZAR DESDE CERO */}

                                <GoalOptionCard
                                    selected={
                                        draftGoalStartMode ===
                                        'from_zero'
                                    }

                                    title="Empezar desde cero"

                                    subtitle="El objetivo comenzará en 0 desde ahora. Tus entrenamientos e historial anteriores se conservarán."

                                    icon="refresh-outline"

                                    onPress={() =>
                                        setDraftGoalStartMode(
                                            'from_zero'
                                        )
                                    }
                                />


                                {/* ACLARACIÓN */}

                                <View
                                    style={{
                                        marginTop: 14,

                                        backgroundColor:
                                            'rgba(255,255,255,0.035)',

                                        borderRadius: 13,

                                        padding: 11,

                                        flexDirection:
                                            'row',

                                        alignItems:
                                            'flex-start',
                                    }}
                                >
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={17}
                                        color={
                                            COLORS.primary
                                        }
                                    />

                                    <Text
                                        style={{
                                            flex: 1,

                                            color:
                                                COLORS.textMuted,

                                            fontSize: 10,

                                            lineHeight: 15,

                                            marginLeft: 7,
                                        }}
                                    >
                                        Esta opción sólo modifica el punto de inicio del objetivo. No elimina ni modifica tus registros históricos.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {goalStep === 5 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Revisá tu objetivo antes de guardarlo. Este será el objetivo principal que se mostrará en tu perfil y en el Home.
                                </Text>

                                <View
                                    style={{
                                        backgroundColor: '#1A1A1A',
                                        borderRadius: 18,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor: 'rgba(198,255,0,0.25)',
                                    }}
                                >
                                    <GoalInfoRow
                                        label="Tipo"
                                        value={`${formatGoalType(draftGoalType)} - ${formatGoalPeriod(draftGoalPeriod)}`}
                                        accent
                                    />

                                    <GoalInfoRow
                                        label="Medición"
                                        value={formatGoalMetric(draftGoalMetric)}
                                    />

                                    <GoalInfoRow
                                        label="Objetivo"
                                        value={formatGoalTargetByType(
                                            draftGoalType,
                                            draftGoalMetric,
                                            Number(draftGoalTarget.replace(',', '.'))
                                        )}
                                        accent
                                    />

                                    <GoalInfoRow
                                        label="Inicio del progreso"

                                        value={
                                            draftGoalStartMode ===
                                                'from_zero'
                                                ? 'Desde cero'
                                                : draftGoalPeriod ===
                                                    'monthly'
                                                    ? 'Datos de este mes'
                                                    : 'Datos de esta semana'
                                        }

                                        accent
                                    />
                                </View>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            {goalStep === 1 ? (
                                <GoalModalButton
                                    label="Cancelar"
                                    onPress={closeGoalModal}
                                    variant="dark"
                                    disabled={savingGoal}
                                />
                            ) : (
                                <GoalModalButton
                                    label="Volver"
                                    onPress={goPreviousGoalStep}
                                    variant="dark"
                                    disabled={savingGoal}
                                />
                            )}

                            {goalStep < 5 ? (
                                <GoalModalButton
                                    label="Siguiente"
                                    onPress={goNextGoalStep}
                                    variant="primary"
                                    disabled={savingGoal}
                                />
                            ) : (
                                <GoalModalButton
                                    label={savingGoal ? 'Guardando...' : 'Guardar objetivo'}
                                    onPress={saveMainGoal}
                                    variant="primary"
                                    disabled={savingGoal}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}