// app/routine/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    View,
    Pressable,
    Modal,
    Image,
    Animated,
    Easing,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getRoutine, Routine, RoutineExercise, markRoutineDone, saveExerciseCheckin, saveRoutineCheckin } from '../../lib/routines';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import {
    saveExerciseCheckinWithOfflineSupport,
    saveRoutineCheckinWithOfflineSupport,
} from '../../lib/offlineActions';


// Columnas alineadas para la “tabla”
const colName = { flex: 4 };   // nombre ejercicio
const colSets = { flex: 1.2 }; // series
const colReps = { flex: 1.2 }; // reps
const colNotes = { flex: 3 };  // notas

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
    const [routineUiPhase, setRoutineUiPhase] = useState<
        'idle' | 'survey' | 'savingAnswer' | 'successLoading' | 'saved'
    >('idle');
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<RoutineExercise | null>(null);
    const [selectedExerciseDay, setSelectedExerciseDay] = useState<string | null>(null);
    const surveyAnim = React.useRef(new Animated.Value(0)).current;
    const successAnim = React.useRef(new Animated.Value(0)).current;
    const successIconAnim = React.useRef(new Animated.Value(0.85)).current;


    const [exerciseScore, setExerciseScore] = useState<number | null>(null);

    const [exerciseUiPhase, setExerciseUiPhase] = useState<
        'idle' | 'openingSurvey' | 'survey' | 'savingAnswer' | 'successLoading' | 'saved'
    >('idle');

    const [doneMarked, setDoneMarked] = useState(false);

    const routineSuccessAnim = React.useRef(new Animated.Value(0)).current;
    const routineSuccessIconAnim = React.useRef(new Animated.Value(0.85)).current;

    const AnimatedView = cssInterop(Animated.View, {
        className: "style",
    });


    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

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

    const handleBack = () => {
        // No dependemos del historial; siempre volvemos al home
        router.replace('/home');
    };


    const handleDonePress = () => {
        setRoutineScore(null);
        setRoutineUiPhase('idle');
        setRoutineSurveyVisible(true);
    };



    const animateSuccessIcon = () => {
        successIconAnim.setValue(0.85);

        Animated.sequence([
            Animated.timing(successIconAnim, {
                toValue: 1.12,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
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
                useNativeDriver: true,
            }),
            Animated.spring(routineSuccessIconAnim, {
                toValue: 1,
                friction: 5,
                tension: 120,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const routineSuccessAnimatedStyle: Animated.WithAnimatedObject<any> = {
        opacity: routineSuccessAnim,
        transform: [
            {
                translateY: routineSuccessAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
            {
                scale: routineSuccessAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                }),
            },
        ],
    };





    const handleOpenRoutineSurvey = () => {
        setRoutineUiPhase('survey');
    };


    const handleSelectRoutineScore = async (score: number) => {
        if (!routine?.id) return;

        try {
            setRoutineScore(score);
            setRoutineUiPhase('savingAnswer');

            await wait(2000);

            const updatedRoutine = await markRoutineDone(routine.id);
            const result = await saveRoutineCheckinWithOfflineSupport(routine.id, { score });
            console.log('Resultado checkin rutina:', result);

            setRoutine(updatedRoutine);
            setDoneMarked(true);

            routineSuccessAnim.setValue(0);
            setRoutineUiPhase('successLoading');

            requestAnimationFrame(() => {
                animateIn(routineSuccessAnim);
            });

            await wait(2000);

            setRoutineUiPhase('saved');

            requestAnimationFrame(() => {
                animateRoutineSuccessIcon();
            });
        } catch (error) {
            console.error('Error guardando feedback de la rutina:', error);
            setRoutineUiPhase('survey');
        }
    };

    const closeRoutineSurveyModal = () => {
        if (routineUiPhase === 'saved' || routineUiPhase === 'successLoading') {
            animateOut(routineSuccessAnim, () => {
                setRoutineSurveyVisible(false);

                setTimeout(() => {
                    routineSuccessAnim.setValue(0);
                    routineSuccessIconAnim.setValue(0.85);
                    setRoutineScore(null);
                    setRoutineUiPhase('idle');
                }, 220);
            });
            return;
        }

        setRoutineSurveyVisible(false);

        setTimeout(() => {
            setRoutineScore(null);
            setRoutineUiPhase('idle');
        }, 0);
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

    const openExerciseModal = (exercise: RoutineExercise, day: string) => {
        setSelectedExercise(exercise);
        setSelectedExerciseDay(day);
        setExerciseScore(null);
        setExerciseUiPhase('idle');
        setExerciseModalVisible(true);
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

    const handleOpenExerciseSurvey = async () => {
        setExerciseUiPhase('openingSurvey');
        await wait(2000);
        setExerciseUiPhase('survey');

        requestAnimationFrame(() => {
            animateIn(surveyAnim);
        });
    };

    const handleCancelExerciseSurvey = () => {
        animateOut(surveyAnim, () => {
            setExerciseScore(null);
            setExerciseUiPhase('idle');
        });
    };

    const handleSelectExerciseScore = async (score: number) => {
        if (!selectedExercise?.id || !routine?.id) return;

        try {
            setExerciseScore(score);
            setExerciseUiPhase('savingAnswer');

            await wait(2000);

            const result = await saveExerciseCheckinWithOfflineSupport(selectedExercise.id, {
                routineId: routine.id,
                score,
            });
            console.log('Resultado checkin ejercicio:', result);

            successAnim.setValue(0);
            setExerciseUiPhase('successLoading');

            requestAnimationFrame(() => {
                animateIn(successAnim);
            });

            await wait(2000);

            setExerciseUiPhase('saved');

            requestAnimationFrame(() => {
                animateSuccessIcon();
            });
        } catch (error) {
            console.error('Error guardando feedback del ejercicio:', error);
            setExerciseUiPhase('survey');
        }
    };

    const closeExerciseModal = () => {
        if (exerciseUiPhase === 'survey') {
            animateOut(surveyAnim, () => {
                setExerciseModalVisible(false);
                setSelectedExercise(null);
                setSelectedExerciseDay(null);
                setExerciseScore(null);
                setExerciseUiPhase('idle');
            });
            return;
        }

        if (exerciseUiPhase === 'saved' || exerciseUiPhase === 'successLoading') {
            animateOut(successAnim, () => {
                setExerciseModalVisible(false);
                setSelectedExercise(null);
                setSelectedExerciseDay(null);
                setExerciseScore(null);
                setExerciseUiPhase('idle');
            });
            return;
        }

        setExerciseModalVisible(false);
        setSelectedExercise(null);
        setSelectedExerciseDay(null);
        setExerciseScore(null);
        setExerciseUiPhase('idle');
    };

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const animateIn = (animValue: Animated.Value) => {
        animValue.setValue(0);

        Animated.parallel([
            Animated.timing(animValue, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateOut = (animValue: Animated.Value, onEnd?: () => void) => {
        Animated.parallel([
            Animated.timing(animValue, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
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

            <View className="flex-1 px-4 pt-1"
                style={{
                    maxWidth: 800,
                    alignSelf: 'center',
                    width: '100%',
                    minHeight: 0,
                }}>
                {/* Encabezado superior */}
                {/* LOGO + TÍTULO SUPERIOR */}
                <View className="mb-1">
                    {/* Logo centrado */}
                    <View className="items-center">
                        <Image
                            source={require('../../assets/img/icontwist.png')}
                            style={{
                                width: 180,        // ajustá a gusto
                                height: 90,
                            }}
                            resizeMode="contain"
                        />
                    </View>


                </View>

                {/* Contenedor principal de la tarjeta */}
                <View
                    className="flex-1 rounded-3xl py-3"
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

                            {/* TABLA AGRUPADA POR DÍA */}
                            <View className="mt-3 px-4">
                                {Object.entries(groupedByDay).map(([day, exs]) => (
                                    <View key={day} className="mb-3">
                                        {/* Día */}
                                        <View className="mb-1">
                                            <Text
                                                className="text-left text-[13px] font-bold text-gray-400"
                                            >
                                                {day}
                                            </Text>
                                        </View>

                                        {/* Encabezados */}
                                        <View className="flex-row border-b border-lime-400 pb-1 mb-1">
                                            <Text
                                                style={colName}
                                                className="text-[14px] font-semibold text-gray-100"
                                            >
                                                Ejercicios
                                            </Text>
                                            <Text
                                                style={colSets}
                                                className="text-[14px] font-semibold text-gray-100 text-center"
                                            >
                                                Series
                                            </Text>
                                            <Text
                                                style={colReps}
                                                className="text-[14px] font-semibold text-gray-100 text-center"
                                            >
                                                Reps.
                                            </Text>
                                            <Text
                                                style={colNotes}
                                                className="text-[14px] font-semibold text-gray-100 text-right"
                                            >
                                                Notas
                                            </Text>
                                        </View>

                                        {/* Filas */}
                                        {exs.map((ex, index) => (
                                            <Pressable
                                                key={ex.id ?? `${day}-${index}`}
                                                className="flex-row py-1 border-b border-neutral-800"
                                                onPress={() => openExerciseModal(ex, day)}
                                            >
                                                <Text
                                                    style={colName}
                                                    className="text-[14px] text-gray-200"
                                                    numberOfLines={1}
                                                >
                                                    {ex.name}
                                                </Text>

                                                <Text
                                                    style={colSets}
                                                    className="text-[14px] text-gray-300 text-center"
                                                >
                                                    {ex.sets ?? '-'}
                                                </Text>

                                                <Text
                                                    style={colReps}
                                                    className="text-[14px] text-gray-300 text-center"
                                                >
                                                    {ex.reps ?? '-'}
                                                </Text>

                                                <Text
                                                    style={colNotes}
                                                    className="text-[14px] text-gray-300 text-right"
                                                    numberOfLines={1}
                                                >
                                                    {ex.notes ?? '-'}
                                                </Text>
                                            </Pressable>
                                        ))}

                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>


                {/* Modal: detalle de ejercicio + encuesta */}
                <Modal
                    visible={exerciseModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeExerciseModal}
                >
                    <View
                        className="flex-1 justify-center items-center px-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
                    >

                        {/* ======================= */}
                        {/* MODAL DE ÉXITO */}
                        {/* ======================= */}
                        {(exerciseUiPhase === 'successLoading' || exerciseUiPhase === 'saved') ? (
                            <View style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>
                                <Animated.View
                                    style={[
                                        {
                                            width: '100%',
                                            alignItems: 'center',
                                        },
                                        successAnimatedStyle,
                                    ]}
                                >
                                    <Pressable
                                        onPress={closeExerciseModal}
                                        style={{ marginBottom: 10 }}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close" size={28} color="#d1d5db" />
                                    </Pressable>

                                    <View
                                        className="w-full rounded-3xl px-5 py-6 items-center"
                                        style={{
                                            backgroundColor: COLORS.background,
                                            borderWidth: 2,
                                            borderColor: '#C6FF00',
                                            minHeight: 220,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {exerciseUiPhase === 'successLoading' ? (
                                            <>
                                                <ActivityIndicator size="large" color="#A3E635" />
                                                <Text
                                                    className="text-[16px] font-semibold mt-4"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    Guardando resultado...
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Animated.View
                                                    style={{
                                                        transform: [{ scale: successIconAnim }],
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="checkmark-circle-outline"
                                                        size={72}
                                                        color="#A3E635"
                                                    />
                                                </Animated.View>

                                                <Text
                                                    className="text-[22px] font-bold mt-3 mb-2"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    ¡Muy bien!
                                                </Text>

                                                <Text
                                                    className="text-center text-[13px]"
                                                    style={{ color: '#f3f4f6' }}
                                                >
                                                    ¡Tus datos han sido guardados con éxito! Respira dos minutos y continúa con la rutina.
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </Animated.View>
                            </View>
                        ) : (

                            /* ======================= */
                            /* MODAL NORMAL */
                            /* ======================= */
                            <View style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>

                                {/* Cerrar */}
                                <Pressable
                                    onPress={closeExerciseModal}
                                    style={{ marginBottom: 10 }}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close" size={28} color="#d1d5db" />
                                </Pressable>

                                {selectedExercise && (
                                    <>
                                        {/* Tarjeta principal */}
                                        <View
                                            className="w-full rounded-3xl px-4 py-4 mb-4"
                                            style={{
                                                backgroundColor: COLORS.background,
                                                borderWidth: 2,
                                                borderColor: '#C6FF00',
                                            }}
                                        >
                                            <Text
                                                className="text-[28px] font-bold text-center underline mb-2"
                                                style={{ color: '#ffffff' }}
                                                numberOfLines={2}
                                            >
                                                {selectedExercise.name}
                                            </Text>

                                            <Pressable onPress={handleSearchExerciseOnYoutube}>
                                                <Text
                                                    className="text-center text-[11px] mb-2 underline"
                                                    style={{ color: '#9ca3af' }}
                                                >
                                                    ¿Buscar cómo hacer ejercicio?
                                                </Text>
                                            </Pressable>

                                            <View className="flex-row justify-between mb-2 px-4">
                                                <Text className="text-[19px]" style={{ color: '#ffffff' }}>
                                                    Series: {selectedExercise.sets ?? '-'}
                                                </Text>
                                                <Text className="text-[19px]" style={{ color: '#ffffff' }}>
                                                    Repeticiones: {selectedExercise.reps ?? '-'}
                                                </Text>
                                            </View>

                                            <View
                                                className="rounded-2xl px-4 py-3 mb-2 mx-2"
                                                style={{ backgroundColor: '#2a2a2a' }}
                                            >
                                                <Text className="text-[13px] mb-1" style={{ color: '#ffffff' }}>
                                                    Notas:
                                                </Text>

                                                <Text className="text-[13px]" style={{ color: '#d1d5db' }}>
                                                    {selectedExercise.notes && selectedExercise.notes.trim().length > 0
                                                        ? selectedExercise.notes
                                                        : 'Sin notas adicionales.'}
                                                </Text>
                                            </View>

                                            {/* Estados del botón */}
                                            {exerciseUiPhase === 'idle' && (
                                                <Pressable
                                                    onPress={handleOpenExerciseSurvey}
                                                    className="rounded-full py-3 items-center justify-center m-4"
                                                    style={{ backgroundColor: '#6b7280' }}
                                                >
                                                    <Text className="text-[15px] font-semibold" style={{ color: '#ffffff' }}>
                                                        Marcar como realizado
                                                    </Text>
                                                </Pressable>
                                            )}

                                            {exerciseUiPhase === 'openingSurvey' && (
                                                <View
                                                    className="rounded-full py-3 items-center justify-center m-4 flex-row"
                                                    style={{ backgroundColor: '#2a2a2a' }}
                                                >
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                    <Text className="text-[15px] font-semibold ml-2" style={{ color: '#ffffff' }}>
                                                        Cargando...
                                                    </Text>
                                                </View>
                                            )}

                                            {exerciseUiPhase === 'survey' && (
                                                <Pressable
                                                    onPress={handleCancelExerciseSurvey}
                                                    className="rounded-full py-3 items-center justify-center m-4"
                                                    style={{ backgroundColor: '#2a2a2a' }}
                                                >
                                                    <Text className="text-[15px] font-semibold" style={{ color: '#ffffff' }}>
                                                        Cancelar estado
                                                    </Text>
                                                </Pressable>
                                            )}

                                            {exerciseUiPhase === 'savingAnswer' && (
                                                <View
                                                    className="rounded-full py-3 items-center justify-center m-4 flex-row"
                                                    style={{ backgroundColor: '#2a2a2a' }}
                                                >
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                    <Text className="text-[15px] font-semibold ml-2" style={{ color: '#ffffff' }}>
                                                        Guardando...
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Encuesta */}
                                        {(exerciseUiPhase === 'survey' || exerciseUiPhase === 'savingAnswer') && (
                                            <Animated.View
                                                className="w-full rounded-2xl px-4 py-3"
                                                style={[
                                                    {
                                                        backgroundColor: COLORS.background,
                                                        borderWidth: 2,
                                                        borderColor: '#C6FF00',
                                                    },
                                                    surveyAnimatedStyle,
                                                ]}
                                            >
                                                <Text
                                                    className="text-[13px] text-center font-semibold mb-2"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    ¿Cómo te fue con este ejercicio?
                                                </Text>

                                                <View className="flex-row flex-wrap justify-between mb-2">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
                                                        const bg = value <= 3 ? '#ff4d4f' : value <= 7 ? '#8b8b8b' : '#7cb342';

                                                        return (
                                                            <Pressable
                                                                key={value}
                                                                onPress={() => handleSelectExerciseScore(value)}
                                                                style={{
                                                                    width: 27,
                                                                    height: 27,
                                                                    borderRadius: 3,
                                                                    backgroundColor: bg,
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    marginBottom: 6,
                                                                    opacity:
                                                                        exerciseUiPhase === 'savingAnswer'
                                                                            ? exerciseScore === value
                                                                                ? 1
                                                                                : 0.35
                                                                            : 1,
                                                                    borderWidth: exerciseScore === value ? 2 : 0,
                                                                    borderColor: exerciseScore === value ? '#ffffff' : 'transparent',
                                                                }}
                                                            >
                                                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                                                                    {value}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>

                                                <Text
                                                    className="text-center text-[10px] font-semibold"
                                                    style={{ color: '#f3f4f6' }}
                                                >
                                                    Al calificar aportas datos a tus estadísticas
                                                </Text>
                                            </Animated.View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}
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
                                        } else if (item.action === 'export') {
                                            console.log('Exportar rutina', routine?.id);
                                        } else if (item.action === 'share') {
                                            console.log('Compartir rutina', routine?.id);
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

                <View className="flex-row justify-between mb-2">
                    {/* REALIZADA - más grande (2x) */}
                    <Pressable
                        onPress={handleDonePress}
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{
                            backgroundColor: doneMarked ? COLORS.primary : '#444444',
                        }}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons
                                name={doneMarked ? 'checkmark-circle' : 'checkmark'}
                                size={18}
                                color={doneMarked ? '#111111' : COLORS.textLight}
                            />
                            <Text
                                className="text-[14px] font-normal ml-2"
                                style={{ color: doneMarked ? '#111111' : COLORS.textLight }}
                            >
                                {doneMarked ? 'Rutina realizada' : 'Realizada'}
                            </Text>
                        </View>
                    </Pressable>

                    {/* EDITAR RUTINA */}
                    <Pressable
                        onPress={handleEditPress}
                        className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons name="create-outline" size={18} style={{ color: COLORS.textLight }} />
                            <Text
                                className="text-[14px] font-normal ml-2"
                                style={{ color: COLORS.textLight }}
                            >
                                Editar rutina
                            </Text>
                        </View>
                    </Pressable>

                    {/* VOLVER ATRÁS */}
                    <Pressable
                        onPress={handleBack}
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver atrás
                        </Text>
                    </Pressable>
                </View>



                {/* Modal: rutina finalizada + encuesta + éxito */}
                <Modal
                    visible={routineSurveyVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeRoutineSurveyModal}
                >
                    <View
                        className="flex-1 justify-center items-center px-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
                    >
                        {(routineUiPhase === 'successLoading' || routineUiPhase === 'saved') ? (
                            <View style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>
                                <Animated.View
                                    style={[
                                        {
                                            width: '100%',
                                            alignItems: 'center',
                                        },
                                        routineSuccessAnimatedStyle,
                                    ]}
                                >
                                    <Pressable
                                        onPress={closeRoutineSurveyModal}
                                        style={{ marginBottom: 10 }}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close" size={28} color="#d1d5db" />
                                    </Pressable>

                                    <View
                                        className="w-full rounded-3xl px-5 py-6 items-center"
                                        style={{
                                            backgroundColor: COLORS.background,
                                            borderWidth: 2,
                                            borderColor: '#C6FF00',
                                            minHeight: 220,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {routineUiPhase === 'successLoading' ? (
                                            <>
                                                <ActivityIndicator size="large" color="#A3E635" />
                                                <Text
                                                    className="text-[16px] font-semibold mt-4"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    Guardando resultado...
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Animated.View
                                                    style={{
                                                        transform: [{ scale: routineSuccessIconAnim }],
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="checkmark-circle-outline"
                                                        size={72}
                                                        color="#A3E635"
                                                    />
                                                </Animated.View>

                                                <Text
                                                    className="text-[22px] font-bold mt-3 mb-2"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    ¡Muy bien!
                                                </Text>

                                                <Text
                                                    className="text-center text-[13px]"
                                                    style={{ color: '#f3f4f6' }}
                                                >
                                                    ¡Tu rutina fue guardada con éxito! Respira dos minutos y continúa.
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </Animated.View>
                            </View>
                        ) : (
                            <View style={{ width: '100%', maxWidth: 340, alignItems: 'center' }}>
                                <Pressable
                                    onPress={closeRoutineSurveyModal}
                                    style={{ marginBottom: 10 }}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close" size={28} color="#d1d5db" />
                                </Pressable>

                                <View
                                    className="w-full rounded-3xl px-4 py-4 mb-4"
                                    style={{
                                        backgroundColor: COLORS.background,
                                        borderWidth: 2,
                                        borderColor: '#C6FF00',
                                    }}
                                >
                                    <Text
                                        className="text-[22px] font-bold text-center mb-6"
                                        style={{ color: '#ffffff' }}
                                    >
                                        ¿Rutina finalizada?
                                    </Text>



                                    <Text
                                        className="text-[14px] text-center mb-3 px-6"
                                        style={{ color: '#d1d5db' }}
                                    >
                                        Marca como hecho tu rutina y guárdalo para mantener tus estadísticas actualizadas.
                                    </Text>

                                    <Text
                                        className="text-[12px] text-center mb-3 px-4"
                                        style={{ color: '#6B7280' }}
                                    >
                                        (Se guardará el ultimo estado del dia)
                                    </Text>

                                    {routineUiPhase === 'idle' && (
                                        <Pressable
                                            onPress={handleOpenRoutineSurvey}
                                            className="rounded-full py-3 items-center justify-center m-4"
                                            style={{ backgroundColor: '#6b7280' }}
                                        >
                                            <Text
                                                className="text-[15px] font-semibold"
                                                style={{ color: '#ffffff' }}
                                            >
                                                Marcar como realizada
                                            </Text>
                                        </Pressable>
                                    )}

                                    {routineUiPhase === 'survey' && (
                                        <Pressable
                                            onPress={closeRoutineSurveyModal}
                                            className="rounded-full py-3 items-center justify-center m-4"
                                            style={{ backgroundColor: '#2a2a2a' }}
                                        >
                                            <Text
                                                className="text-[15px] font-semibold"
                                                style={{ color: '#ffffff' }}
                                            >
                                                Cancelar estado
                                            </Text>
                                        </Pressable>
                                    )}

                                    {routineUiPhase === 'savingAnswer' && (
                                        <View
                                            className="rounded-full py-3 items-center justify-center m-4 flex-row"
                                            style={{ backgroundColor: '#2a2a2a' }}
                                        >
                                            <ActivityIndicator size="small" color="#ffffff" />
                                            <Text
                                                className="text-[15px] font-semibold ml-2"
                                                style={{ color: '#ffffff' }}
                                            >
                                                Guardando...
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {(routineUiPhase === 'survey' || routineUiPhase === 'savingAnswer') && (
                                    <View
                                        className="w-full rounded-2xl px-4 py-3"
                                        style={{
                                            backgroundColor: COLORS.background,
                                            borderWidth: 2,
                                            borderColor: '#C6FF00',
                                        }}
                                    >
                                        <Text
                                            className="text-[13px] text-center font-semibold mb-2"
                                            style={{ color: '#ffffff' }}
                                        >
                                            ¿Cómo terminaste la rutina?
                                        </Text>

                                        <View className="flex-row flex-wrap justify-between mb-2">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
                                                const bg =
                                                    value <= 3 ? '#ff4d4f' : value <= 7 ? '#8b8b8b' : '#7cb342';

                                                return (
                                                    <Pressable
                                                        key={value}
                                                        disabled={routineUiPhase === 'savingAnswer'}
                                                        onPress={() => handleSelectRoutineScore(value)}
                                                        style={{
                                                            width: 27,
                                                            height: 27,
                                                            borderRadius: 3,
                                                            backgroundColor: bg,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginBottom: 6,
                                                            opacity:
                                                                routineUiPhase === 'savingAnswer'
                                                                    ? routineScore === value
                                                                        ? 1
                                                                        : 0.35
                                                                    : 1,
                                                            borderWidth: routineScore === value ? 2 : 0,
                                                            borderColor: routineScore === value ? '#ffffff' : 'transparent',
                                                            transform: [{ scale: routineScore === value ? 1.08 : 1 }],
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                fontWeight: '700',
                                                            }}
                                                        >
                                                            {value}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>

                                        <Text
                                            className="text-center text-[10px] font-semibold"
                                            style={{ color: '#f3f4f6' }}
                                        >
                                            Al calificar aportas datos a tus estadísticas
                                        </Text>
                                    </View>
                                )}


                            </View>
                        )}
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


            </View >
        </SafeAreaView >
    );
}
