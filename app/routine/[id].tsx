// app/routine/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    View,
    Pressable,
    Modal,
    Animated,
    Easing,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getRoutine, Routine, RoutineExercise, markRoutineDone, saveExerciseCheckin, saveRoutineCheckin, updateRoutineExercise } from '../../lib/routines';
import { Ionicons } from '@expo/vector-icons';
import {
    saveExerciseCheckinWithOfflineSupport,
    saveRoutineCheckinWithOfflineSupport,
} from '../../lib/offlineActions';
import AppHeader from '../../components/AppHeader';
import {
    getRoutineViewMode,
    saveRoutineViewMode,
    type RoutineViewMode,
} from '../../lib/uiPreferences';



// Columnas alineadas para la “tabla”
const colName = { flex: 4 };   // nombre ejercicio
const colSets = { flex: 1.2 }; // series
const colReps = { flex: 1.2 }; // reps
const colNotes = { flex: 3 };  // notas

function RoutineNavButton({
    icon,
    onPress,
    active = false,
    disabled = false,
}: {
    icon: React.ReactNode;
    onPress: () => void;
    active?: boolean;
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
                    active
                        ? 'rgba(198,255,0,0.12)'
                        : pressed
                            ? '#333333'
                            : '#242424',

                borderWidth: 3,

                borderColor:
                    active
                        ? COLORS.primary
                        : '#353535',

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

function ScoreSelector({
    value,
    disabled = false,
    onSelect,
}: {
    value: number | null;
    disabled?: boolean;
    onSelect: (score: number) => void;
}) {
    return (
        <View>
            <View
                style={{
                    flexDirection: 'row',
                    width: '100%',
                    gap: 3,
                }}
            >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                    (score) => {
                        const selected =
                            value === score;

                        const backgroundColor =
                            score <= 3
                                ? '#EF5350'
                                : score <= 7
                                    ? '#6F6F6F'
                                    : COLORS.primary;

                        return (
                            <Pressable
                                key={score}
                                disabled={disabled}
                                onPress={() =>
                                    onSelect(score)
                                }
                                style={({ pressed }) => ({
                                    flex: 1,
                                    minWidth: 0,

                                    height: 31,

                                    borderRadius: 7,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    backgroundColor,

                                    opacity:
                                        disabled &&
                                            !selected
                                            ? 0.3
                                            : pressed
                                                ? 0.75
                                                : 1,

                                    borderWidth:
                                        selected
                                            ? 2
                                            : 0,

                                    borderColor:
                                        '#FFFFFF',

                                    transform: [
                                        {
                                            scale:
                                                selected
                                                    ? 1.06
                                                    : 1,
                                        },
                                    ],
                                })}
                            >
                                <Text
                                    style={{
                                        color:
                                            score >= 8
                                                ? '#111111'
                                                : '#FFFFFF',

                                        fontSize: 10,
                                        fontWeight: '900',
                                    }}
                                >
                                    {score}
                                </Text>
                            </Pressable>
                        );
                    }
                )}
            </View>

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent:
                        'space-between',
                    marginTop: 7,
                }}
            >
                <Text
                    style={{
                        color: '#777777',
                        fontSize: 8,
                    }}
                >
                    Mayor dificultad
                </Text>

                <Text
                    style={{
                        color: '#777777',
                        fontSize: 8,
                    }}
                >
                    Muy bien
                </Text>
            </View>
        </View>
    );
}

export default function RoutineDetailScreen() {
    const { isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [routine, setRoutine] = useState<Routine | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [menuVisible, setMenuVisible] = useState(false);

    const [routineSurveyVisible, setRoutineSurveyVisible] = useState(false);
    const [routineScore, setRoutineScore] = useState<number | null>(null);
    const [
        routineUiPhase,
        setRoutineUiPhase,
    ] = useState<
        | 'survey'
        | 'savingAnswer'
        | 'saved'
    >('survey');
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<RoutineExercise | null>(null);
    const [selectedExerciseDay, setSelectedExerciseDay] = useState<string | null>(null);
    const surveyAnim = React.useRef(new Animated.Value(0)).current;
    const successAnim = React.useRef(new Animated.Value(0)).current;
    const successIconAnim = React.useRef(new Animated.Value(0.85)).current;
    const routineModalAnim =
        React.useRef(
            new Animated.Value(0)
        ).current;

    const routineModalAnimatedStyle:
        Animated.WithAnimatedObject<any> = {
        opacity: routineModalAnim,

        transform: [
            {
                translateY:
                    routineModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                    }),
            },
            {
                scale:
                    routineModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                    }),
            },
        ],
    };


    const [exerciseScore, setExerciseScore] = useState<number | null>(null);

    const [
        exerciseUiPhase,
        setExerciseUiPhase,
    ] = useState<
        | 'idle'
        | 'survey'
        | 'savingAnswer'
        | 'saved'
    >('idle');

    const [
        quickEditVisible,
        setQuickEditVisible,
    ] = useState(false);

    const [
        quickEditSaving,
        setQuickEditSaving,
    ] = useState(false);

    const [
        quickEditError,
        setQuickEditError,
    ] = useState<string | null>(
        null
    );

    const [
        quickEditName,
        setQuickEditName,
    ] = useState('');

    const [
        quickEditSets,
        setQuickEditSets,
    ] = useState('');

    const [
        quickEditReps,
        setQuickEditReps,
    ] = useState('');

    const [
        quickEditDay,
        setQuickEditDay,
    ] = useState('');

    const [
        quickEditNotes,
        setQuickEditNotes,
    ] = useState('');

    const [doneMarked, setDoneMarked] = useState(false);

    const [
        developmentFeature,
        setDevelopmentFeature,
    ] = useState<
        'export' | 'share' | null
    >(null);

    const routineSuccessIconAnim = React.useRef(new Animated.Value(0.85)).current;
    const exerciseModalAnim =
        React.useRef(
            new Animated.Value(0)
        ).current;

    const exerciseModalAnimatedStyle:
        Animated.WithAnimatedObject<any> = {
        opacity: exerciseModalAnim,

        transform: [
            {
                translateY:
                    exerciseModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                    }),
            },
            {
                scale:
                    exerciseModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                    }),
            },
        ],
    };


    const [
        routineViewMode,
        setRoutineViewMode,
    ] = useState<RoutineViewMode>(
        'table'
    );

    const [
        viewPreferenceLoaded,
        setViewPreferenceLoaded,
    ] = useState(false);



    useEffect(() => {
        let active = true;

        const loadViewPreference =
            async () => {
                try {
                    const savedMode =
                        await getRoutineViewMode();

                    if (!active) {
                        return;
                    }

                    setRoutineViewMode(
                        savedMode
                    );
                } finally {
                    if (active) {
                        setViewPreferenceLoaded(
                            true
                        );
                    }
                }
            };

        void loadViewPreference();

        return () => {
            active = false;
        };
    }, []);

    const handleOpenQuickExerciseEdit =
        () => {
            if (!selectedExercise) {
                return;
            }

            setQuickEditName(
                selectedExercise.name ?? ''
            );

            setQuickEditSets(
                selectedExercise.sets ?? ''
            );

            setQuickEditReps(
                selectedExercise.reps ?? ''
            );

            setQuickEditDay(
                selectedExercise.day ?? ''
            );

            setQuickEditNotes(
                selectedExercise.notes ?? ''
            );

            setQuickEditError(null);

            /*
             * Cerramos primero el detalle
             * para evitar dos Modals
             * superpuestos.
             */
            setExerciseModalVisible(
                false
            );

            setQuickEditVisible(true);
        };

    const handleSaveQuickExerciseEdit =
        async () => {
            if (
                !routine?.id ||
                !selectedExercise?.id
            ) {
                return;
            }

            const cleanName =
                quickEditName.trim();

            if (!cleanName) {
                setQuickEditError(
                    'El ejercicio necesita un nombre.'
                );

                return;
            }

            try {
                setQuickEditSaving(true);
                setQuickEditError(null);

                const updatedExercise =
                    await updateRoutineExercise(
                        routine.id,
                        selectedExercise.id,
                        {
                            name:
                                cleanName,

                            sets:
                                quickEditSets
                                    .trim() ||
                                null,

                            reps:
                                quickEditReps
                                    .trim() ||
                                null,

                            day:
                                quickEditDay
                                    .trim() ||
                                null,

                            notes:
                                quickEditNotes
                                    .trim() ||
                                null,
                        }
                    );

                /*
                 * Actualización inmediata
                 * del estado local.
                 */
                setRoutine(
                    (current) => {
                        if (!current) {
                            return current;
                        }

                        return {
                            ...current,

                            exercises:
                                (
                                    current.exercises ??
                                    []
                                ).map(
                                    (
                                        exercise
                                    ) =>
                                        exercise.id ===
                                            updatedExercise.id
                                            ? updatedExercise
                                            : exercise
                                ),
                        };
                    }
                );

                setSelectedExercise(
                    updatedExercise
                );

                setSelectedExerciseDay(
                    updatedExercise.day ??
                    'Sin día'
                );

                setQuickEditVisible(
                    false
                );
            } catch (error) {
                console.error(
                    'Error editando ejercicio:',
                    error
                );

                setQuickEditError(
                    'No se pudieron guardar los cambios.'
                );
            } finally {
                setQuickEditSaving(false);
            }
        };

    const handleToggleRoutineView = () => {
        const nextMode: RoutineViewMode =
            routineViewMode === 'table'
                ? 'cards'
                : 'table';

        /*
         * El cambio visual ocurre
         * inmediatamente.
         */
        setRoutineViewMode(nextMode);

        /*
         * La preferencia se guarda
         * en segundo plano.
         * NO esperamos el resultado.
         */
        void saveRoutineViewMode(nextMode);
    };



    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                if (!id) return;
                const data = await getRoutine(String(id));
                if (isMounted) {
                    setRoutine(data);
                    setError(null);
                }
            } catch (err) {
                console.log('Error cargando rutina:', err);
                if (isMounted) {
                    setError('No se pudo cargar la rutina.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!routine) return;

        setDoneMarked(isSameLocalDay(routine.lastDoneAt));
    }, [routine]);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const handleBack = () => {
        // No dependemos del historial; siempre volvemos al home
        router.replace('/home');
    };


    const handleDonePress = () => {
        setRoutineScore(null);

        setRoutineUiPhase(
            'survey'
        );

        routineModalAnim.setValue(0);

        setRoutineSurveyVisible(
            true
        );

        requestAnimationFrame(() => {
            Animated.timing(
                routineModalAnim,
                {
                    toValue: 1,
                    duration: 240,

                    easing:
                        Easing.out(
                            Easing.cubic
                        ),

                    useNativeDriver:
                        false,
                }
            ).start();
        });
    };



    const animateSuccessIcon = () => {
        successIconAnim.setValue(0.85);

        Animated.sequence([
            Animated.timing(successIconAnim, {
                toValue: 1.12,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.spring(successIconAnim, {
                toValue: 1,
                friction: 5,
                tension: 120,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateRoutineSuccessIcon = () => {
        routineSuccessIconAnim.setValue(0.85);

        Animated.sequence([
            Animated.timing(routineSuccessIconAnim, {
                toValue: 1.12,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.spring(routineSuccessIconAnim, {
                toValue: 1,
                friction: 5,
                tension: 120,
                useNativeDriver: true,
            }),
        ]).start();
    };










    const handleSelectRoutineScore =
        async (score: number) => {
            if (!routine?.id) {
                return;
            }

            try {
                setRoutineScore(
                    score
                );

                setRoutineUiPhase(
                    'savingAnswer'
                );

                /*
                 * Ejecutamos inmediatamente
                 * las operaciones reales.
                 */
                const updatedRoutine =
                    await markRoutineDone(
                        routine.id
                    );

                const result =
                    await saveRoutineCheckinWithOfflineSupport(
                        routine.id,
                        {
                            score,
                        }
                    );

                console.log(
                    'Resultado checkin rutina:',
                    result
                );

                setRoutine(
                    updatedRoutine
                );

                setDoneMarked(
                    true
                );

                setRoutineUiPhase(
                    'saved'
                );

                requestAnimationFrame(
                    () => {
                        animateRoutineSuccessIcon();
                    }
                );
            } catch (error) {
                console.error(
                    'Error guardando feedback de la rutina:',
                    error
                );

                /*
                 * Volvemos a permitir
                 * seleccionar una nota.
                 */
                setRoutineUiPhase(
                    'survey'
                );
            }
        };

    const closeRoutineSurveyModal =
        () => {
            /*
             * Evitamos cerrar mientras
             * estamos guardando.
             */
            if (
                routineUiPhase ===
                'savingAnswer'
            ) {
                return;
            }

            Animated.timing(
                routineModalAnim,
                {
                    toValue: 0,

                    duration: 180,

                    easing:
                        Easing.in(
                            Easing.cubic
                        ),

                    useNativeDriver:
                        false,
                }
            ).start(
                ({ finished }) => {
                    if (!finished) {
                        return;
                    }

                    setRoutineSurveyVisible(
                        false
                    );

                    setRoutineScore(
                        null
                    );

                    setRoutineUiPhase(
                        'survey'
                    );

                    routineSuccessIconAnim.setValue(
                        0.85
                    );
                }
            );
        };

    const handleEditPress = () => {
        setEditModalVisible(true);
    };

    const handleConfirmEdit = () => {
        setEditModalVisible(false);
        if (routine?.id) {
            router.push({
                pathname: '/routine/edit/[id]',
                params: { id: routine.id },
            });
        }
    };

    const handleCancelEdit = () => {
        setEditModalVisible(false);
    };

    const openExerciseModal = (
        exercise: RoutineExercise,
        day: string
    ) => {
        setSelectedExercise(exercise);
        setSelectedExerciseDay(day);

        setExerciseScore(null);
        setExerciseUiPhase('idle');

        exerciseModalAnim.setValue(0);

        setExerciseModalVisible(true);

        requestAnimationFrame(() => {
            Animated.timing(
                exerciseModalAnim,
                {
                    toValue: 1,

                    duration: 240,

                    easing:
                        Easing.out(
                            Easing.cubic
                        ),

                    /*
                     * false evita el warning
                     * de React Native Web.
                     */
                    useNativeDriver: false,
                }
            ).start();
        });
    };

    const handleSearchExerciseOnYoutube = async () => {
        if (!selectedExercise?.name) return;

        try {
            const query = encodeURIComponent(`how to train ${selectedExercise.name} tutorial`);
            const youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;

            const supported = await Linking.canOpenURL(youtubeUrl);

            if (supported) {
                await Linking.openURL(youtubeUrl);
            } else {
                console.log('No se pudo abrir YouTube');
            }
        } catch (error) {
            console.error('Error abriendo búsqueda en YouTube:', error);
        }
    };

    const handleOpenExerciseSurvey =
        () => {
            setExerciseUiPhase(
                'survey'
            );

            surveyAnim.setValue(0);

            requestAnimationFrame(
                () => {
                    animateIn(
                        surveyAnim
                    );
                }
            );
        };

    const handleCancelExerciseSurvey = () => {
        animateOut(surveyAnim, () => {
            setExerciseScore(null);
            setExerciseUiPhase('idle');
        });
    };

    const handleSelectExerciseScore =
        async (
            score: number
        ) => {
            if (
                !selectedExercise?.id ||
                !routine?.id
            ) {
                return;
            }

            try {
                setExerciseScore(
                    score
                );

                setExerciseUiPhase(
                    'savingAnswer'
                );

                /*
                 * Guardamos inmediatamente.
                 */
                const result =
                    await saveExerciseCheckinWithOfflineSupport(
                        selectedExercise.id,
                        {
                            routineId:
                                routine.id,

                            score,
                        }
                    );

                console.log(
                    'Resultado checkin ejercicio:',
                    result
                );

                successAnim.setValue(
                    0
                );

                setExerciseUiPhase(
                    'saved'
                );

                requestAnimationFrame(
                    () => {
                        animateIn(
                            successAnim
                        );

                        animateSuccessIcon();
                    }
                );
            } catch (error) {
                console.error(
                    'Error guardando feedback del ejercicio:',
                    error
                );

                setExerciseUiPhase(
                    'survey'
                );
            }
        };

    const closeExerciseModal = () => {
        /*
         * Mientras realmente se está
         * guardando evitamos un cierre
         * accidental.
         */
        if (
            exerciseUiPhase ===
            'savingAnswer'
        ) {
            return;
        }

        Animated.timing(
            exerciseModalAnim,
            {
                toValue: 0,

                duration: 180,

                easing:
                    Easing.in(
                        Easing.cubic
                    ),

                useNativeDriver: false,
            }
        ).start(({ finished }) => {
            if (!finished) {
                return;
            }

            setExerciseModalVisible(false);

            setSelectedExercise(null);
            setSelectedExerciseDay(null);

            setExerciseScore(null);

            setExerciseUiPhase(
                'idle'
            );

            surveyAnim.setValue(0);
            successAnim.setValue(0);

            successIconAnim.setValue(
                0.85
            );
        });
    };


    const animateIn = (animValue: Animated.Value) => {
        animValue.setValue(0);

        Animated.parallel([
            Animated.timing(animValue, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
        ]).start();
    };

    const animateOut = (animValue: Animated.Value, onEnd?: () => void) => {
        Animated.parallel([
            Animated.timing(animValue, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: false,
            }),
        ]).start(({ finished }) => {
            if (finished && onEnd) onEnd();
        });
    };

    const surveyAnimatedStyle: Animated.WithAnimatedObject<any> = {
        opacity: surveyAnim,
        transform: [
            {
                translateY: surveyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
            {
                scale: surveyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                }),
            },
        ],
    };

    const successAnimatedStyle: Animated.WithAnimatedObject<any> = {
        opacity: successAnim,
        transform: [
            {
                translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
            {
                scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                }),
            },
        ],
    };

    const isSameLocalDay = (dateString?: string | null) => {
        if (!dateString) return false;

        const date = new Date(dateString);
        const now = new Date();

        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    };

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

    if (error || !routine) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-4"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text style={{ color: COLORS.textLight, marginBottom: 12 }}>
                    {error ?? 'Rutina no encontrada.'}
                </Text>
                <Pressable
                    onPress={handleBack}
                    className="px-4 py-3 rounded-xl"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text style={{ color: '#111111', fontWeight: '600' }}>Volver</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    // 👉 Ordenamos por `order` y agrupamos por `day`
    const exercises: RoutineExercise[] =
        (routine.exercises ?? []).slice().sort((a, b) => {
            const ao = a.order ?? 0;
            const bo = b.order ?? 0;
            return ao - bo;
        });

    const groupedByDay: Record<string, RoutineExercise[]> = {};

    for (const ex of exercises) {
        const key = ex.day || 'Sin día';
        if (!groupedByDay[key]) groupedByDay[key] = [];
        groupedByDay[key].push(ex);
    }

    const menuItems = [
        { label: 'Editar rutina', action: 'edit' as const },
        { label: 'Borrar rutina', action: 'delete' as const, destructive: true },
        { label: 'Exportar', action: 'export' as const },
        { label: 'Compartir', action: 'share' as const },
        { label: 'Salir de rutina', action: 'close' as const },
    ];

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >

            <View className="flex-1 px-4"
                style={{
                    maxWidth: 800,
                    alignSelf: 'center',
                    width: '100%',
                    minHeight: 0,
                }}>
                {/* Encabezado superior */}
                <AppHeader showProfile={false} />

                {/* Contenedor principal de la tarjeta */}
                <View
                    className="flex-1 rounded-3xl mt-3 py-3"
                    style={{
                        borderWidth: 2,
                        borderColor: COLORS.primary,
                        overflow: 'hidden',   // no necesitamos popups aquí
                        marginBottom: 8,      // un poco de aire antes de los botones
                        minHeight: 0,         // 👈 deja que el ScrollView se adapte
                    }}
                >
                    {/* TÍTULO + BOTÓN MENÚ (FIJOS) */}
                    <View className="flex-row items-center mb-3 px-4">
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text
                                className="text-[16px] underline font-semibold text-white"
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {routine.title}
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => setMenuVisible(true)}
                            hitSlop={8}
                            style={({ pressed }) => ({
                                width: 32,
                                height: 32,
                                borderRadius: 9999,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: pressed ? '#3f3f3f' : 'transparent',
                                flexShrink: 0,
                            })}
                        >
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>⋯</Text>
                        </Pressable>
                    </View>

                    {/* ZONA SCROLLEABLE: DESCRIPCIÓN + TABLA */}
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 16 }}
                        >
                            {/* Descripción */}
                            {routine.notes && (
                                <Text
                                    className="text-[14px] leading-5 text-gray-200 mb-2 px-4"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    {routine.notes}
                                </Text>
                            )}

                            {/* VISUALIZACIÓN DE LA RUTINA */}

                            <View
                                style={{
                                    marginTop: 12,
                                    paddingHorizontal: 16,
                                }}
                            >
                                {routineViewMode ===
                                    'table' ? (
                                    /*
                                     * =========================
                                     * VISTA 1 — TABLA
                                     * =========================
                                     */
                                    <>
                                        {Object.entries(
                                            groupedByDay
                                        ).map(
                                            ([day, exs]) => (
                                                <View
                                                    key={day}
                                                    style={{
                                                        marginBottom:
                                                            12,
                                                    }}
                                                >
                                                    {/* DÍA */}

                                                    <View
                                                        style={{
                                                            marginBottom:
                                                                4,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    '#9CA3AF',

                                                                fontSize:
                                                                    13,

                                                                fontWeight:
                                                                    '800',
                                                            }}
                                                        >
                                                            {day}
                                                        </Text>
                                                    </View>

                                                    {/* ENCABEZADOS */}

                                                    <View
                                                        style={{
                                                            flexDirection:
                                                                'row',

                                                            borderBottomWidth:
                                                                1,

                                                            borderBottomColor:
                                                                COLORS.primary,

                                                            paddingBottom:
                                                                4,

                                                            marginBottom:
                                                                4,
                                                        }}
                                                    >
                                                        <Text
                                                            style={[
                                                                colName,
                                                                {
                                                                    color:
                                                                        '#F3F4F6',

                                                                    fontSize:
                                                                        14,

                                                                    fontWeight:
                                                                        '700',
                                                                },
                                                            ]}
                                                        >
                                                            Ejercicios
                                                        </Text>

                                                        <Text
                                                            style={[
                                                                colSets,
                                                                {
                                                                    color:
                                                                        '#F3F4F6',

                                                                    fontSize:
                                                                        14,

                                                                    fontWeight:
                                                                        '700',

                                                                    textAlign:
                                                                        'center',
                                                                },
                                                            ]}
                                                        >
                                                            Series
                                                        </Text>

                                                        <Text
                                                            style={[
                                                                colReps,
                                                                {
                                                                    color:
                                                                        '#F3F4F6',

                                                                    fontSize:
                                                                        14,

                                                                    fontWeight:
                                                                        '700',

                                                                    textAlign:
                                                                        'center',
                                                                },
                                                            ]}
                                                        >
                                                            Reps.
                                                        </Text>

                                                        <Text
                                                            style={[
                                                                colNotes,
                                                                {
                                                                    color:
                                                                        '#F3F4F6',

                                                                    fontSize:
                                                                        14,

                                                                    fontWeight:
                                                                        '700',

                                                                    textAlign:
                                                                        'right',
                                                                },
                                                            ]}
                                                        >
                                                            Notas
                                                        </Text>
                                                    </View>

                                                    {/* FILAS */}

                                                    {exs.map(
                                                        (
                                                            ex,
                                                            index
                                                        ) => (
                                                            <Pressable
                                                                key={
                                                                    ex.id ??
                                                                    `${day}-${index}`
                                                                }
                                                                onPress={() =>
                                                                    openExerciseModal(
                                                                        ex,
                                                                        day
                                                                    )
                                                                }
                                                                style={({
                                                                    pressed,
                                                                }) => ({
                                                                    flexDirection:
                                                                        'row',

                                                                    paddingVertical:
                                                                        6,

                                                                    borderBottomWidth:
                                                                        1,

                                                                    borderBottomColor:
                                                                        '#262626',

                                                                    backgroundColor:
                                                                        pressed
                                                                            ? '#202020'
                                                                            : 'transparent',
                                                                })}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        colName,
                                                                        {
                                                                            color:
                                                                                '#E5E7EB',

                                                                            fontSize:
                                                                                14,
                                                                        },
                                                                    ]}
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {
                                                                        ex.name
                                                                    }
                                                                </Text>

                                                                <Text
                                                                    style={[
                                                                        colSets,
                                                                        {
                                                                            color:
                                                                                '#D1D5DB',

                                                                            fontSize:
                                                                                14,

                                                                            textAlign:
                                                                                'center',
                                                                        },
                                                                    ]}
                                                                >
                                                                    {ex.sets ??
                                                                        '-'}
                                                                </Text>

                                                                <Text
                                                                    style={[
                                                                        colReps,
                                                                        {
                                                                            color:
                                                                                '#D1D5DB',

                                                                            fontSize:
                                                                                14,

                                                                            textAlign:
                                                                                'center',
                                                                        },
                                                                    ]}
                                                                >
                                                                    {ex.reps ??
                                                                        '-'}
                                                                </Text>

                                                                <Text
                                                                    style={[
                                                                        colNotes,
                                                                        {
                                                                            color:
                                                                                '#D1D5DB',

                                                                            fontSize:
                                                                                14,

                                                                            textAlign:
                                                                                'right',
                                                                        },
                                                                    ]}
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {ex.notes ??
                                                                        '-'}
                                                                </Text>
                                                            </Pressable>
                                                        )
                                                    )}
                                                </View>
                                            )
                                        )}
                                    </>
                                ) : (
                                    /*
                                     * =========================
                                     * VISTA 2 — TARJETAS
                                     * =========================
                                     */
                                    <>
                                        {Object.entries(
                                            groupedByDay
                                        ).map(
                                            ([day, exs]) => (
                                                <View
                                                    key={day}
                                                    style={{
                                                        marginBottom:
                                                            18,
                                                    }}
                                                >
                                                    {/* CABECERA DEL DÍA */}

                                                    <View
                                                        style={{
                                                            flexDirection:
                                                                'row',

                                                            alignItems:
                                                                'center',

                                                            marginBottom:
                                                                9,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                width: 28,
                                                                height: 28,

                                                                borderRadius:
                                                                    14,

                                                                alignItems:
                                                                    'center',

                                                                justifyContent:
                                                                    'center',

                                                                backgroundColor:
                                                                    'rgba(198,255,0,0.08)',

                                                                borderWidth:
                                                                    1,

                                                                borderColor:
                                                                    'rgba(198,255,0,0.30)',
                                                            }}
                                                        >
                                                            <Ionicons
                                                                name="calendar-outline"
                                                                size={15}
                                                                color={
                                                                    COLORS.primary
                                                                }
                                                            />
                                                        </View>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textLight,

                                                                fontSize:
                                                                    14,

                                                                fontWeight:
                                                                    '900',

                                                                marginLeft:
                                                                    8,
                                                            }}
                                                        >
                                                            {day}
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                color:
                                                                    COLORS.textMuted,

                                                                fontSize:
                                                                    10,

                                                                marginLeft:
                                                                    7,
                                                            }}
                                                        >
                                                            {exs.length}{' '}
                                                            {exs.length ===
                                                                1
                                                                ? 'ejercicio'
                                                                : 'ejercicios'}
                                                        </Text>
                                                    </View>

                                                    {/* TARJETAS */}

                                                    {exs.map(
                                                        (
                                                            ex,
                                                            index
                                                        ) => {
                                                            const hasNotes =
                                                                Boolean(
                                                                    ex.notes &&
                                                                    ex.notes
                                                                        .trim()
                                                                        .length >
                                                                    0
                                                                );

                                                            return (
                                                                <Pressable
                                                                    key={
                                                                        ex.id ??
                                                                        `${day}-${index}`
                                                                    }
                                                                    onPress={() =>
                                                                        openExerciseModal(
                                                                            ex,
                                                                            day
                                                                        )
                                                                    }
                                                                    style={({
                                                                        pressed,
                                                                    }) => ({
                                                                        backgroundColor:
                                                                            pressed
                                                                                ? '#222222'
                                                                                : '#181818',

                                                                        borderWidth:
                                                                            1,

                                                                        borderColor:
                                                                            pressed
                                                                                ? 'rgba(198,255,0,0.55)'
                                                                                : '#303030',

                                                                        borderRadius:
                                                                            18,

                                                                        padding:
                                                                            13,

                                                                        marginBottom:
                                                                            9,

                                                                        transform: [
                                                                            {
                                                                                scale:
                                                                                    pressed
                                                                                        ? 0.99
                                                                                        : 1,
                                                                            },
                                                                        ],
                                                                    })}
                                                                >
                                                                    {/* CABECERA EJERCICIO */}

                                                                    <View
                                                                        style={{
                                                                            flexDirection:
                                                                                'row',

                                                                            alignItems:
                                                                                'center',
                                                                        }}
                                                                    >
                                                                        {/* NÚMERO */}

                                                                        <View
                                                                            style={{
                                                                                width:
                                                                                    31,

                                                                                height:
                                                                                    31,

                                                                                borderRadius:
                                                                                    16,

                                                                                backgroundColor:
                                                                                    '#222222',

                                                                                borderWidth:
                                                                                    1,

                                                                                borderColor:
                                                                                    '#383838',

                                                                                alignItems:
                                                                                    'center',

                                                                                justifyContent:
                                                                                    'center',

                                                                                marginRight:
                                                                                    10,
                                                                            }}
                                                                        >
                                                                            <Text
                                                                                style={{
                                                                                    color:
                                                                                        COLORS.primary,

                                                                                    fontSize:
                                                                                        11,

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

                                                                        <Text
                                                                            numberOfLines={
                                                                                2
                                                                            }
                                                                            style={{
                                                                                flex: 1,

                                                                                color:
                                                                                    COLORS.textLight,

                                                                                fontSize:
                                                                                    15,

                                                                                fontWeight:
                                                                                    '900',

                                                                                lineHeight:
                                                                                    19,
                                                                            }}
                                                                        >
                                                                            {
                                                                                ex.name
                                                                            }
                                                                        </Text>

                                                                        <Ionicons
                                                                            name="chevron-forward"
                                                                            size={18}
                                                                            color="#666666"
                                                                            style={{
                                                                                marginLeft:
                                                                                    6,
                                                                            }}
                                                                        />
                                                                    </View>

                                                                    {/* SERIES Y REPS */}

                                                                    <View
                                                                        style={{
                                                                            flexDirection:
                                                                                'row',

                                                                            marginTop:
                                                                                12,

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

                                                                                paddingVertical:
                                                                                    8,

                                                                                paddingHorizontal:
                                                                                    10,

                                                                                borderWidth:
                                                                                    1,

                                                                                borderColor:
                                                                                    '#292929',
                                                                            }}
                                                                        >
                                                                            <Text
                                                                                style={{
                                                                                    color:
                                                                                        '#747474',

                                                                                    fontSize:
                                                                                        8,

                                                                                    fontWeight:
                                                                                        '900',

                                                                                    letterSpacing:
                                                                                        0.7,
                                                                                }}
                                                                            >
                                                                                SERIES
                                                                            </Text>

                                                                            <Text
                                                                                style={{
                                                                                    color:
                                                                                        '#E5E5E5',

                                                                                    fontSize:
                                                                                        15,

                                                                                    fontWeight:
                                                                                        '900',

                                                                                    marginTop:
                                                                                        2,
                                                                                }}
                                                                            >
                                                                                {ex.sets ??
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

                                                                                paddingVertical:
                                                                                    8,

                                                                                paddingHorizontal:
                                                                                    10,

                                                                                borderWidth:
                                                                                    1,

                                                                                borderColor:
                                                                                    '#292929',
                                                                            }}
                                                                        >
                                                                            <Text
                                                                                style={{
                                                                                    color:
                                                                                        '#747474',

                                                                                    fontSize:
                                                                                        8,

                                                                                    fontWeight:
                                                                                        '900',

                                                                                    letterSpacing:
                                                                                        0.7,
                                                                                }}
                                                                            >
                                                                                REPETICIONES
                                                                            </Text>

                                                                            <Text
                                                                                style={{
                                                                                    color:
                                                                                        '#E5E5E5',

                                                                                    fontSize:
                                                                                        15,

                                                                                    fontWeight:
                                                                                        '900',

                                                                                    marginTop:
                                                                                        2,
                                                                                }}
                                                                            >
                                                                                {ex.reps ??
                                                                                    '-'}
                                                                            </Text>
                                                                        </View>
                                                                    </View>

                                                                    {/* NOTAS */}

                                                                    {hasNotes && (
                                                                        <View
                                                                            style={{
                                                                                flexDirection:
                                                                                    'row',

                                                                                alignItems:
                                                                                    'flex-start',

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
                                                                            <Ionicons
                                                                                name="document-text-outline"
                                                                                size={14}
                                                                                color="#777777"
                                                                                style={{
                                                                                    marginRight:
                                                                                        6,

                                                                                    marginTop:
                                                                                        1,
                                                                                }}
                                                                            />

                                                                            <Text
                                                                                numberOfLines={
                                                                                    2
                                                                                }
                                                                                style={{
                                                                                    flex: 1,

                                                                                    color:
                                                                                        '#999999',

                                                                                    fontSize:
                                                                                        10,

                                                                                    lineHeight:
                                                                                        15,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    ex.notes
                                                                                }
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </Pressable>
                                                            );
                                                        }
                                                    )}
                                                </View>
                                            )
                                        )}
                                    </>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>


                {/* MODAL: DETALLE + VALORACIÓN DEL EJERCICIO */}

                <Modal
                    visible={exerciseModalVisible}
                    transparent
                    animationType="none"
                    onRequestClose={closeExerciseModal}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 20,
                        }}
                    >
                        {/* FONDO OSCURO ANIMADO */}

                        <Animated.View
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,

                                backgroundColor: '#000000',

                                opacity: exerciseModalAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.76],
                                }),
                            }}
                        />

                        {/* TARJETA PRINCIPAL */}

                        <Animated.View
                            style={[
                                {
                                    width: '100%',
                                    maxWidth: 390,
                                    maxHeight: '88%',

                                    backgroundColor: '#101010',

                                    borderRadius: 24,

                                    borderWidth: 1,
                                    borderColor: '#343434',

                                    padding: 18,

                                    shadowColor: '#000000',
                                    shadowOpacity: 0.55,
                                    shadowRadius: 24,

                                    shadowOffset: {
                                        width: 0,
                                        height: 10,
                                    },

                                    elevation: 12,
                                },

                                exerciseModalAnimatedStyle,
                            ]}
                        >
                            {selectedExercise &&
                                exerciseUiPhase !== 'saved' ? (
                                <>
                                    {/* HEADER */}

                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginBottom: 16,
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
                                                    'rgba(198,255,0,0.35)',

                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons
                                                name="barbell-outline"
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
                                                numberOfLines={2}
                                                style={{
                                                    color:
                                                        COLORS.textLight,

                                                    fontSize: 18,
                                                    lineHeight: 22,

                                                    fontWeight: '900',
                                                }}
                                            >
                                                {selectedExercise.name}
                                            </Text>

                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize: 10,
                                                    marginTop: 3,
                                                }}
                                            >
                                                {selectedExerciseDay ??
                                                    'Ejercicio de la rutina'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* CONTENIDO SCROLLEABLE */}

                                    <ScrollView
                                        showsVerticalScrollIndicator={
                                            false
                                        }
                                        style={{
                                            flexShrink: 1,
                                        }}
                                        contentContainerStyle={{
                                            paddingBottom: 2,
                                        }}
                                    >
                                        {/* SERIES + REPETICIONES */}

                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                gap: 8,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flex: 1,

                                                    backgroundColor:
                                                        '#181818',

                                                    borderWidth: 1,
                                                    borderColor:
                                                        '#292929',

                                                    borderRadius: 15,

                                                    padding: 12,
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
                                                    <Ionicons
                                                        name="layers-outline"
                                                        size={16}
                                                        color={
                                                            COLORS.primary
                                                        }
                                                    />

                                                    <Text
                                                        style={{
                                                            color:
                                                                '#888888',

                                                            fontSize: 9,

                                                            fontWeight:
                                                                '800',

                                                            marginLeft: 6,
                                                        }}
                                                    >
                                                        SERIES
                                                    </Text>
                                                </View>

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textLight,

                                                        fontSize: 20,

                                                        fontWeight:
                                                            '900',

                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {selectedExercise.sets ??
                                                        '-'}
                                                </Text>
                                            </View>

                                            <View
                                                style={{
                                                    flex: 1,

                                                    backgroundColor:
                                                        '#181818',

                                                    borderWidth: 1,
                                                    borderColor:
                                                        '#292929',

                                                    borderRadius: 15,

                                                    padding: 12,
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
                                                    <Ionicons
                                                        name="repeat-outline"
                                                        size={16}
                                                        color={
                                                            COLORS.primary
                                                        }
                                                    />

                                                    <Text
                                                        style={{
                                                            color:
                                                                '#888888',

                                                            fontSize: 9,

                                                            fontWeight:
                                                                '800',

                                                            marginLeft: 6,
                                                        }}
                                                    >
                                                        REPETICIONES
                                                    </Text>
                                                </View>

                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.textLight,

                                                        fontSize: 20,

                                                        fontWeight:
                                                            '900',

                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {selectedExercise.reps ??
                                                        '-'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* NOTAS */}

                                        <View
                                            style={{
                                                backgroundColor:
                                                    '#181818',

                                                borderWidth: 1,
                                                borderColor:
                                                    '#292929',

                                                borderRadius: 15,

                                                padding: 12,

                                                marginTop: 9,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <Ionicons
                                                    name="document-text-outline"
                                                    size={16}
                                                    color="#C7C7C7"
                                                />

                                                <Text
                                                    style={{
                                                        color:
                                                            '#888888',

                                                        fontSize: 9,

                                                        fontWeight:
                                                            '800',

                                                        marginLeft: 6,
                                                    }}
                                                >
                                                    NOTAS
                                                </Text>
                                            </View>

                                            <Text
                                                style={{
                                                    color: '#C5C5C5',

                                                    fontSize: 11,
                                                    lineHeight: 17,
                                                }}
                                            >
                                                {selectedExercise.notes &&
                                                    selectedExercise.notes
                                                        .trim().length > 0
                                                    ? selectedExercise.notes
                                                    : 'Sin notas adicionales.'}
                                            </Text>
                                        </View>

                                        {/* YOUTUBE */}

                                        <Pressable
                                            onPress={
                                                handleSearchExerciseOnYoutube
                                            }
                                            style={({ pressed }) => ({
                                                height: 42,

                                                borderRadius: 13,

                                                marginTop: 9,

                                                borderWidth: 1,
                                                borderColor:
                                                    '#343434',

                                                backgroundColor:
                                                    pressed
                                                        ? '#292929'
                                                        : '#181818',

                                                flexDirection: 'row',

                                                alignItems: 'center',
                                                justifyContent:
                                                    'center',
                                            })}
                                        >
                                            <Ionicons
                                                name="logo-youtube"
                                                size={18}
                                                color="#C7C7C7"
                                            />

                                            <Text
                                                style={{
                                                    color: '#C7C7C7',

                                                    fontSize: 11,

                                                    fontWeight:
                                                        '800',

                                                    marginLeft: 7,
                                                }}
                                            >
                                                Buscar cómo hacer el ejercicio
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={
                                                handleOpenQuickExerciseEdit
                                            }
                                            style={({ pressed }) => ({
                                                height: 42,

                                                borderRadius: 13,

                                                marginTop: 8,

                                                borderWidth: 1,

                                                borderColor:
                                                    pressed
                                                        ? COLORS.primary
                                                        : '#343434',

                                                backgroundColor:
                                                    pressed
                                                        ? 'rgba(198,255,0,0.08)'
                                                        : '#181818',

                                                flexDirection: 'row',

                                                alignItems: 'center',

                                                justifyContent: 'center',
                                            })}
                                        >
                                            <Ionicons
                                                name="create-outline"
                                                size={18}
                                                color="#C7C7C7"
                                            />

                                            <Text
                                                style={{
                                                    color: '#C7C7C7',

                                                    fontSize: 11,

                                                    fontWeight: '800',

                                                    marginLeft: 7,
                                                }}
                                            >
                                                Editar ejercicio
                                            </Text>
                                        </Pressable>

                                        {/* BOTÓN VALORAR */}

                                        {exerciseUiPhase ===
                                            'idle' && (
                                                <Pressable
                                                    onPress={
                                                        handleOpenExerciseSurvey
                                                    }
                                                    style={({
                                                        pressed,
                                                    }) => ({
                                                        height: 46,

                                                        borderRadius:
                                                            14,

                                                        marginTop:
                                                            12,

                                                        alignItems:
                                                            'center',

                                                        justifyContent:
                                                            'center',

                                                        backgroundColor:
                                                            pressed
                                                                ? '#B4E800'
                                                                : COLORS.primary,
                                                    })}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                '#101010',

                                                            fontSize: 13,

                                                            fontWeight:
                                                                '900',
                                                        }}
                                                    >
                                                        Valorar ejercicio
                                                    </Text>
                                                </Pressable>
                                            )}

                                        {/* ENCUESTA */}

                                        {(exerciseUiPhase ===
                                            'survey' ||
                                            exerciseUiPhase ===
                                            'savingAnswer') && (
                                                <Animated.View
                                                    style={[
                                                        {
                                                            width: '100%',

                                                            backgroundColor:
                                                                '#181818',

                                                            borderWidth:
                                                                1,

                                                            borderColor:
                                                                'rgba(198,255,0,0.35)',

                                                            borderRadius:
                                                                16,

                                                            padding:
                                                                13,

                                                            marginTop:
                                                                12,
                                                        },

                                                        surveyAnimatedStyle,
                                                    ]}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                COLORS.textLight,

                                                            fontSize: 13,

                                                            fontWeight:
                                                                '900',

                                                            textAlign:
                                                                'center',

                                                            marginBottom:
                                                                11,
                                                        }}
                                                    >
                                                        ¿Cómo te fue con este ejercicio?
                                                    </Text>

                                                    {/* SELECTOR RESPONSIVE */}

                                                    <ScoreSelector
                                                        value={
                                                            exerciseScore
                                                        }
                                                        disabled={
                                                            exerciseUiPhase ===
                                                            'savingAnswer'
                                                        }
                                                        onSelect={
                                                            handleSelectExerciseScore
                                                        }
                                                    />

                                                    <Text
                                                        style={{
                                                            color:
                                                                '#777777',

                                                            fontSize: 9,

                                                            lineHeight:
                                                                14,

                                                            textAlign:
                                                                'center',

                                                            marginTop:
                                                                11,
                                                        }}
                                                    >
                                                        Tu valoración se utilizará para actualizar tus estadísticas.
                                                    </Text>

                                                    {/* GUARDANDO */}

                                                    {exerciseUiPhase ===
                                                        'savingAnswer' && (
                                                            <View
                                                                style={{
                                                                    flexDirection:
                                                                        'row',

                                                                    alignItems:
                                                                        'center',

                                                                    justifyContent:
                                                                        'center',

                                                                    marginTop:
                                                                        13,
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
                                                                            '#AAAAAA',

                                                                        fontSize:
                                                                            10,

                                                                        fontWeight:
                                                                            '700',

                                                                        marginLeft:
                                                                            7,
                                                                    }}
                                                                >
                                                                    Guardando valoración...
                                                                </Text>
                                                            </View>
                                                        )}
                                                </Animated.View>
                                            )}
                                    </ScrollView>

                                    {/* FOOTER */}



                                    {exerciseUiPhase !==
                                        'savingAnswer' && (
                                            <Pressable
                                                onPress={
                                                    exerciseUiPhase ===
                                                        'survey'
                                                        ? handleCancelExerciseSurvey
                                                        : closeExerciseModal
                                                }
                                                style={({ pressed }) => ({
                                                    height: 43,

                                                    borderRadius: 13,

                                                    marginTop: 13,

                                                    backgroundColor:
                                                        pressed
                                                            ? '#303030'
                                                            : '#222222',

                                                    borderWidth: 1,
                                                    borderColor:
                                                        '#343434',

                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'center',
                                                })}
                                            >
                                                <Text
                                                    style={{
                                                        color: '#C7C7C7',

                                                        fontSize: 11,

                                                        fontWeight:
                                                            '800',
                                                    }}
                                                >
                                                    {exerciseUiPhase ===
                                                        'survey'
                                                        ? 'Cancelar valoración'
                                                        : 'Cerrar'}
                                                </Text>
                                            </Pressable>
                                        )}
                                </>
                            ) : (
                                /*
                                 * ========================
                                 * VALORACIÓN GUARDADA
                                 * ========================
                                 */

                                <Animated.View
                                    style={[
                                        {
                                            alignItems:
                                                'center',

                                            paddingVertical:
                                                15,
                                        },

                                        successAnimatedStyle,
                                    ]}
                                >
                                    <Animated.View
                                        style={{
                                            transform: [
                                                {
                                                    scale:
                                                        successIconAnim,
                                                },
                                            ],
                                        }}
                                    >
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={76}
                                            color={COLORS.primary}
                                        />
                                    </Animated.View>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontSize: 21,

                                            fontWeight:
                                                '900',

                                            marginTop: 9,
                                        }}
                                    >
                                        ¡Muy bien!
                                    </Text>

                                    {/* PUNTUACIÓN */}

                                    {exerciseScore != null && (
                                        <View
                                            style={{
                                                backgroundColor:
                                                    'rgba(198,255,0,0.08)',

                                                borderWidth: 1,

                                                borderColor:
                                                    'rgba(198,255,0,0.30)',

                                                borderRadius:
                                                    999,

                                                paddingHorizontal:
                                                    18,

                                                paddingVertical:
                                                    7,

                                                marginTop: 11,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        COLORS.primary,

                                                    fontSize: 18,

                                                    fontWeight:
                                                        '900',
                                                }}
                                            >
                                                {exerciseScore} / 10
                                            </Text>
                                        </View>
                                    )}

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textMuted,

                                            fontSize: 12,

                                            lineHeight: 18,

                                            textAlign:
                                                'center',

                                            marginTop: 13,

                                            maxWidth: 280,
                                        }}
                                    >
                                        Tu valoración fue guardada correctamente y ya forma parte de tus estadísticas.
                                    </Text>

                                    {/* ÚNICA SALIDA DEL ÉXITO */}

                                    <Pressable
                                        onPress={
                                            closeExerciseModal
                                        }
                                        style={({ pressed }) => ({
                                            width: '100%',

                                            height: 46,

                                            borderRadius: 14,

                                            marginTop: 20,

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',

                                            backgroundColor:
                                                pressed
                                                    ? '#B4E800'
                                                    : COLORS.primary,
                                        })}
                                    >
                                        <Text
                                            style={{
                                                color: '#101010',

                                                fontSize: 13,

                                                fontWeight:
                                                    '900',
                                            }}
                                        >
                                            Entendido
                                        </Text>
                                    </Pressable>
                                </Animated.View>
                            )}
                        </Animated.View>
                    </View>
                </Modal>


                {/* Modal opciones de rutina */}
                <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <View
                        className="flex-1 justify-center items-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                        <View
                            className="w-72 rounded-3xl px-4 py-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        >
                            <Text
                                className="text-base font-semibold mb-3 text-center"
                                style={{ color: COLORS.textLight }}
                            >
                                Opciones de tu rutina
                            </Text>

                            {menuItems.map((item, index) => (
                                <Pressable
                                    key={item.action}
                                    onPress={() => {
                                        setMenuVisible(false);

                                        if (item.action === 'edit' && routine?.id) {
                                            router.push({
                                                pathname: '/routine/edit/[id]',
                                                params: { id: routine.id },
                                            });
                                        } else if (item.action === 'delete' && routine?.id) {
                                            console.log('Borrar rutina', routine.id);
                                        } else if (
                                            item.action === 'export'
                                        ) {
                                            setDevelopmentFeature(
                                                'export'
                                            );
                                        } else if (
                                            item.action === 'share'
                                        ) {
                                            setDevelopmentFeature(
                                                'share'
                                            );
                                        } else if (item.action === 'close') {
                                            handleBack();
                                        }
                                    }}
                                    className={`py-2 ${index !== 0 ? 'border-t border-neutral-800' : ''
                                        }`}
                                >
                                    <Text
                                        className="text-[14px]"
                                        style={{
                                            color: item.destructive ? '#FFBABA' : COLORS.textLight,
                                        }}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}

                            <Pressable
                                onPress={() => setMenuVisible(false)}
                                className="mt-4 py-2 rounded-full items-center"
                                style={{ backgroundColor: COLORS.primary }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: '#111111' }}
                                >
                                    Cerrar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>


                {/* Botones inferiores */}
                {/* NAVEGACIÓN INFERIOR */}

                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',

                        gap: 8,

                        marginTop: 4,
                        marginBottom: 8,
                    }}
                >
                    {/* 1 — HOME */}

                    <RoutineNavButton
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

                    {/* 2 — ESTADÍSTICAS */}

                    <RoutineNavButton
                        onPress={() =>
                            router.push(
                                '/statistics'
                            )
                        }
                        icon={
                            <Ionicons
                                name="stats-chart-outline"
                                size={27}
                                color="#FFFFFF"
                            />
                        }
                    />

                    {/* 3 — VALORAR RUTINA */}

                    <RoutineNavButton
                        onPress={
                            handleDonePress
                        }
                        active={
                            doneMarked
                        }
                        icon={
                            <Ionicons
                                name={
                                    doneMarked
                                        ? 'checkbox'
                                        : 'checkbox-outline'
                                }
                                size={29}
                                color={
                                    doneMarked
                                        ? COLORS.primary
                                        : '#FFFFFF'
                                }
                            />
                        }
                    />

                    {/* 4 — CAMBIAR VISTA */}

                    <RoutineNavButton
                        onPress={handleToggleRoutineView}
                        icon={
                            <Ionicons
                                name={
                                    routineViewMode === 'table'
                                        ? 'grid-outline'
                                        : 'list-outline'
                                }
                                size={28}
                                color="#C7C7C7"
                            />
                        }
                    />

                    {/* 5 — EDITAR */}

                    <RoutineNavButton
                        onPress={handleEditPress}
                        icon={
                            <Ionicons
                                name="create-outline"
                                size={28}
                                color="#FFFFFF"
                            />
                        }
                    />
                </View>



                {/* MODAL: VALORACIÓN DE LA RUTINA */}

                <Modal
                    visible={
                        routineSurveyVisible
                    }
                    transparent
                    animationType="none"
                    onRequestClose={
                        closeRoutineSurveyModal
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

                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,

                                backgroundColor:
                                    '#000000',

                                opacity:
                                    routineModalAnim.interpolate({
                                        inputRange: [
                                            0,
                                            1,
                                        ],

                                        outputRange: [
                                            0,
                                            0.76,
                                        ],
                                    }),
                            }}
                        />

                        {/* TARJETA */}

                        <Animated.View
                            style={[
                                {
                                    width: '100%',
                                    maxWidth: 390,

                                    backgroundColor:
                                        '#101010',

                                    borderRadius:
                                        24,

                                    borderWidth:
                                        1,

                                    borderColor:
                                        '#343434',

                                    padding: 18,

                                    shadowColor:
                                        '#000000',

                                    shadowOpacity:
                                        0.55,

                                    shadowRadius:
                                        24,

                                    shadowOffset: {
                                        width: 0,
                                        height: 10,
                                    },

                                    elevation: 12,
                                },

                                routineModalAnimatedStyle,
                            ]}
                        >
                            {routineUiPhase !==
                                'saved' ? (
                                <>
                                    {/* HEADER */}

                                    <View
                                        style={{
                                            flexDirection:
                                                'row',

                                            alignItems:
                                                'center',

                                            marginBottom:
                                                18,
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

                                                borderWidth:
                                                    1,

                                                borderColor:
                                                    'rgba(198,255,0,0.35)',

                                                alignItems:
                                                    'center',

                                                justifyContent:
                                                    'center',
                                            }}
                                        >
                                            <Ionicons
                                                name="checkbox-outline"
                                                size={25}
                                                color={
                                                    COLORS.primary
                                                }
                                            />
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
                                                Valorar rutina
                                            </Text>

                                            <Text
                                                numberOfLines={
                                                    2
                                                }
                                                style={{
                                                    color:
                                                        COLORS.textMuted,

                                                    fontSize:
                                                        10,

                                                    lineHeight:
                                                        14,

                                                    marginTop:
                                                        3,
                                                }}
                                            >
                                                {routine.title}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* PREGUNTA */}

                                    <View
                                        style={{
                                            backgroundColor:
                                                '#181818',

                                            borderWidth:
                                                1,

                                            borderColor:
                                                'rgba(198,255,0,0.30)',

                                            borderRadius:
                                                17,

                                            padding:
                                                14,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    COLORS.textLight,

                                                fontSize:
                                                    14,

                                                fontWeight:
                                                    '900',

                                                textAlign:
                                                    'center',

                                                marginBottom:
                                                    13,
                                            }}
                                        >
                                            ¿Cómo terminaste la rutina?
                                        </Text>

                                        <ScoreSelector
                                            value={
                                                routineScore
                                            }
                                            disabled={
                                                routineUiPhase ===
                                                'savingAnswer'
                                            }
                                            onSelect={
                                                handleSelectRoutineScore
                                            }
                                        />

                                        <Text
                                            style={{
                                                color:
                                                    '#777777',

                                                fontSize:
                                                    9,

                                                lineHeight:
                                                    14,

                                                textAlign:
                                                    'center',

                                                marginTop:
                                                    12,
                                            }}
                                        >
                                            Tu valoración se utilizará para actualizar tus estadísticas y analizar tu evolución.
                                        </Text>

                                        {routineUiPhase ===
                                            'savingAnswer' && (
                                                <View
                                                    style={{
                                                        flexDirection:
                                                            'row',

                                                        justifyContent:
                                                            'center',

                                                        alignItems:
                                                            'center',

                                                        marginTop:
                                                            14,
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
                                                                '#AAAAAA',

                                                            fontSize:
                                                                10,

                                                            fontWeight:
                                                                '700',

                                                            marginLeft:
                                                                7,
                                                        }}
                                                    >
                                                        Guardando valoración...
                                                    </Text>
                                                </View>
                                            )}
                                    </View>

                                    {/* CANCELAR */}

                                    {routineUiPhase !==
                                        'savingAnswer' && (
                                            <Pressable
                                                onPress={
                                                    closeRoutineSurveyModal
                                                }
                                                style={({
                                                    pressed,
                                                }) => ({
                                                    height: 43,

                                                    borderRadius:
                                                        13,

                                                    marginTop:
                                                        13,

                                                    backgroundColor:
                                                        pressed
                                                            ? '#303030'
                                                            : '#222222',

                                                    borderWidth:
                                                        1,

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

                                                        fontSize:
                                                            11,

                                                        fontWeight:
                                                            '800',
                                                    }}
                                                >
                                                    Cancelar
                                                </Text>
                                            </Pressable>
                                        )}
                                </>
                            ) : (
                                /*
                                 * ====================
                                 * GUARDADO CON ÉXITO
                                 * ====================
                                 */

                                <View
                                    style={{
                                        alignItems:
                                            'center',

                                        paddingVertical:
                                            15,
                                    }}
                                >
                                    <Animated.View
                                        style={{
                                            transform: [
                                                {
                                                    scale:
                                                        routineSuccessIconAnim,
                                                },
                                            ],
                                        }}
                                    >
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={76}
                                            color={
                                                COLORS.primary
                                            }
                                        />
                                    </Animated.View>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontSize: 21,

                                            fontWeight:
                                                '900',

                                            marginTop: 9,
                                        }}
                                    >
                                        ¡Rutina registrada!
                                    </Text>

                                    {routineScore !=
                                        null && (
                                            <View
                                                style={{
                                                    backgroundColor:
                                                        'rgba(198,255,0,0.08)',

                                                    borderWidth:
                                                        1,

                                                    borderColor:
                                                        'rgba(198,255,0,0.30)',

                                                    borderRadius:
                                                        999,

                                                    paddingHorizontal:
                                                        18,

                                                    paddingVertical:
                                                        7,

                                                    marginTop:
                                                        11,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color:
                                                            COLORS.primary,

                                                        fontSize:
                                                            18,

                                                        fontWeight:
                                                            '900',
                                                    }}
                                                >
                                                    {
                                                        routineScore
                                                    }{' '}
                                                    / 10
                                                </Text>
                                            </View>
                                        )}

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textMuted,

                                            fontSize: 12,

                                            lineHeight:
                                                18,

                                            textAlign:
                                                'center',

                                            marginTop:
                                                13,

                                            maxWidth:
                                                280,
                                        }}
                                    >
                                        Tu rutina fue marcada como realizada y tu valoración ya forma parte de tus estadísticas.
                                    </Text>

                                    <Pressable
                                        onPress={
                                            closeRoutineSurveyModal
                                        }
                                        style={({
                                            pressed,
                                        }) => ({
                                            width:
                                                '100%',

                                            height: 46,

                                            borderRadius:
                                                14,

                                            marginTop:
                                                20,

                                            alignItems:
                                                'center',

                                            justifyContent:
                                                'center',

                                            backgroundColor:
                                                pressed
                                                    ? '#B4E800'
                                                    : COLORS.primary,
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
                            )}
                        </Animated.View>
                    </View>
                </Modal>
                {/* Modal: confirmar edición de rutina */}
                <Modal
                    visible={editModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={handleCancelEdit}
                >
                    <View
                        className="flex-1 justify-center items-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                        <View
                            className="w-72 rounded-3xl px-4 py-4"
                            style={{
                                backgroundColor: '#111111',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        >
                            <Text
                                className="text-base font-semibold mb-4 text-center"
                                style={{ color: COLORS.textLight }}
                            >
                                ¿Quieres editar esta rutina?
                            </Text>

                            <Text
                                className="text-xs mb-4 text-center"
                                style={{ color: COLORS.textMuted }}
                            >
                                Podrás modificar ejercicios, series, repeticiones y notas. Los cambios se guardarán al confirmar en la siguiente pantalla.
                            </Text>

                            <View className="flex-row justify-between mt-4">
                                {/* Cancelar */}
                                <Pressable
                                    onPress={handleCancelEdit}
                                    className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: '#444444' }}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Cancelar
                                    </Text>
                                </Pressable>

                                {/* Ir a editar */}
                                <Pressable
                                    onPress={handleConfirmEdit}
                                    className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: COLORS.primary }}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: '#111111' }}
                                    >
                                        Editar ahora
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={
                        developmentFeature !== null
                    }
                    transparent
                    animationType="fade"
                    onRequestClose={() =>
                        setDevelopmentFeature(null)
                    }
                >
                    <View
                        style={{
                            flex: 1,
                            backgroundColor:
                                'rgba(0,0,0,0.72)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 20,
                        }}
                    >
                        <View
                            style={{
                                width: '100%',
                                maxWidth: 360,

                                backgroundColor:
                                    '#101010',

                                borderRadius: 24,

                                borderWidth: 1,
                                borderColor:
                                    '#343434',

                                padding: 20,
                            }}
                        >
                            <View
                                style={{
                                    width: 50,
                                    height: 50,

                                    borderRadius: 25,

                                    backgroundColor:
                                        'rgba(198,255,0,0.08)',

                                    borderWidth: 1,

                                    borderColor:
                                        'rgba(198,255,0,0.35)',

                                    alignItems: 'center',
                                    justifyContent:
                                        'center',

                                    alignSelf: 'center',
                                }}
                            >
                                <Ionicons
                                    name={
                                        developmentFeature ===
                                            'export'
                                            ? 'download-outline'
                                            : 'share-social-outline'
                                    }
                                    size={25}
                                    color={COLORS.primary}
                                />
                            </View>

                            <Text
                                style={{
                                    color:
                                        COLORS.textLight,

                                    fontSize: 20,

                                    fontWeight: '900',

                                    textAlign: 'center',

                                    marginTop: 14,
                                }}
                            >
                                {developmentFeature ===
                                    'export'
                                    ? 'Exportar rutina'
                                    : 'Compartir rutina'}
                            </Text>

                            <Text
                                style={{
                                    color:
                                        COLORS.primary,

                                    fontSize: 13,

                                    fontWeight: '900',

                                    textAlign: 'center',

                                    marginTop: 10,
                                }}
                            >
                                Función en desarrollo
                            </Text>

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
                                Esta opción estará
                                disponible en una próxima
                                versión de la aplicación.
                            </Text>

                            <Pressable
                                onPress={() =>
                                    setDevelopmentFeature(
                                        null
                                    )
                                }
                                style={({ pressed }) => ({
                                    height: 46,

                                    borderRadius: 14,

                                    marginTop: 18,

                                    alignItems: 'center',
                                    justifyContent:
                                        'center',

                                    backgroundColor:
                                        pressed
                                            ? '#B4E800'
                                            : COLORS.primary,
                                })}
                            >
                                <Text
                                    style={{
                                        color: '#101010',
                                        fontSize: 13,
                                        fontWeight: '900',
                                    }}
                                >
                                    Entendido
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={quickEditVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!quickEditSaving) {
                            setQuickEditVisible(
                                false
                            );
                        }
                    }}
                >
                    <View
                        style={{
                            flex: 1,

                            backgroundColor:
                                'rgba(0,0,0,0.74)',

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

                                    marginBottom: 16,
                                }}
                            >
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,

                                        borderRadius: 22,

                                        backgroundColor:
                                            'rgba(198,255,0,0.08)',

                                        borderWidth: 1,

                                        borderColor:
                                            'rgba(198,255,0,0.35)',

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',
                                    }}
                                >
                                    <Ionicons
                                        name="create-outline"
                                        size={23}
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
                                        Editar ejercicio
                                    </Text>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.textMuted,

                                            fontSize: 10,

                                            marginTop: 2,
                                        }}
                                    >
                                        Modificación rápida
                                    </Text>
                                </View>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={
                                    false
                                }
                            >
                                {/* NOMBRE */}

                                <Text
                                    style={{
                                        color: '#888888',
                                        fontSize: 9,
                                        fontWeight: '800',
                                        marginBottom: 5,
                                    }}
                                >
                                    NOMBRE
                                </Text>

                                <TextInput
                                    value={quickEditName}
                                    onChangeText={
                                        setQuickEditName
                                    }
                                    editable={
                                        !quickEditSaving
                                    }
                                    placeholder="Nombre del ejercicio"
                                    placeholderTextColor="#666666"
                                    style={{
                                        backgroundColor:
                                            '#181818',

                                        borderWidth: 1,

                                        borderColor:
                                            '#303030',

                                        borderRadius: 13,

                                        color:
                                            COLORS.textLight,

                                        paddingHorizontal:
                                            12,

                                        paddingVertical:
                                            11,

                                        fontSize: 13,

                                        fontWeight: '800',

                                        marginBottom: 10,
                                    }}
                                />

                                {/* SERIES + REPETICIONES */}

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
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    '#888888',

                                                fontSize: 9,

                                                fontWeight:
                                                    '800',

                                                marginBottom:
                                                    5,
                                            }}
                                        >
                                            SERIES
                                        </Text>

                                        <TextInput
                                            value={
                                                quickEditSets
                                            }
                                            onChangeText={
                                                setQuickEditSets
                                            }
                                            editable={
                                                !quickEditSaving
                                            }
                                            placeholder="4"
                                            placeholderTextColor="#666666"
                                            style={{
                                                backgroundColor:
                                                    '#181818',

                                                borderWidth:
                                                    1,

                                                borderColor:
                                                    '#303030',

                                                borderRadius:
                                                    13,

                                                color:
                                                    COLORS.textLight,

                                                paddingHorizontal:
                                                    12,

                                                paddingVertical:
                                                    11,

                                                fontSize:
                                                    13,

                                                fontWeight:
                                                    '800',
                                            }}
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
                                                    '#888888',

                                                fontSize: 9,

                                                fontWeight:
                                                    '800',

                                                marginBottom:
                                                    5,
                                            }}
                                        >
                                            REPETICIONES
                                        </Text>

                                        <TextInput
                                            value={
                                                quickEditReps
                                            }
                                            onChangeText={
                                                setQuickEditReps
                                            }
                                            editable={
                                                !quickEditSaving
                                            }
                                            placeholder="8 - 10"
                                            placeholderTextColor="#666666"
                                            style={{
                                                backgroundColor:
                                                    '#181818',

                                                borderWidth:
                                                    1,

                                                borderColor:
                                                    '#303030',

                                                borderRadius:
                                                    13,

                                                color:
                                                    COLORS.textLight,

                                                paddingHorizontal:
                                                    12,

                                                paddingVertical:
                                                    11,

                                                fontSize:
                                                    13,

                                                fontWeight:
                                                    '800',
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* DÍA */}

                                <Text
                                    style={{
                                        color: '#888888',

                                        fontSize: 9,

                                        fontWeight: '800',

                                        marginTop: 10,

                                        marginBottom: 5,
                                    }}
                                >
                                    DÍA / GRUPO
                                </Text>

                                <TextInput
                                    value={quickEditDay}
                                    onChangeText={
                                        setQuickEditDay
                                    }
                                    editable={
                                        !quickEditSaving
                                    }
                                    placeholder="Ej: Día 1"
                                    placeholderTextColor="#666666"
                                    style={{
                                        backgroundColor:
                                            '#181818',

                                        borderWidth: 1,

                                        borderColor:
                                            '#303030',

                                        borderRadius: 13,

                                        color:
                                            COLORS.textLight,

                                        paddingHorizontal:
                                            12,

                                        paddingVertical:
                                            11,

                                        fontSize: 13,

                                        fontWeight: '700',
                                    }}
                                />

                                {/* NOTAS */}

                                <Text
                                    style={{
                                        color: '#888888',

                                        fontSize: 9,

                                        fontWeight: '800',

                                        marginTop: 10,

                                        marginBottom: 5,
                                    }}
                                >
                                    NOTAS
                                </Text>

                                <TextInput
                                    value={
                                        quickEditNotes
                                    }
                                    onChangeText={
                                        setQuickEditNotes
                                    }
                                    editable={
                                        !quickEditSaving
                                    }
                                    placeholder="Notas del ejercicio..."
                                    placeholderTextColor="#666666"
                                    multiline
                                    textAlignVertical="top"
                                    style={{
                                        minHeight: 90,

                                        backgroundColor:
                                            '#181818',

                                        borderWidth: 1,

                                        borderColor:
                                            '#303030',

                                        borderRadius: 13,

                                        color:
                                            COLORS.textLight,

                                        paddingHorizontal:
                                            12,

                                        paddingVertical:
                                            11,

                                        fontSize: 12,

                                        lineHeight: 18,
                                    }}
                                />

                                {quickEditError && (
                                    <Text
                                        style={{
                                            color: '#FF8A8A',

                                            fontSize: 10,

                                            textAlign:
                                                'center',

                                            marginTop: 9,
                                        }}
                                    >
                                        {quickEditError}
                                    </Text>
                                )}
                            </ScrollView>

                            {/* ACCIONES */}

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 8,
                                    marginTop: 14,
                                }}
                            >
                                <Pressable
                                    disabled={
                                        quickEditSaving
                                    }
                                    onPress={() =>
                                        setQuickEditVisible(
                                            false
                                        )
                                    }
                                    style={({ pressed }) => ({
                                        flex: 1,

                                        height: 44,

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
                                            quickEditSaving
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
                                        quickEditSaving
                                    }
                                    onPress={
                                        handleSaveQuickExerciseEdit
                                    }
                                    style={({ pressed }) => ({
                                        flex: 1.3,

                                        height: 44,

                                        borderRadius: 13,

                                        backgroundColor:
                                            pressed
                                                ? '#B4E800'
                                                : COLORS.primary,

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',

                                        opacity:
                                            quickEditSaving
                                                ? 0.7
                                                : 1,
                                    })}
                                >
                                    {quickEditSaving ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#111111"
                                        />
                                    ) : (
                                        <Text
                                            style={{
                                                color:
                                                    '#111111',

                                                fontSize:
                                                    11,

                                                fontWeight:
                                                    '900',
                                            }}
                                        >
                                            Guardar cambios
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View >
        </SafeAreaView >
    );
}
