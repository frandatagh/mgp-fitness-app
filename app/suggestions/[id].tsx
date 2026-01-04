// app/suggestions/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    View,
    Pressable,
    Modal,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import {
    Routine,
    RoutineExercise,
    getSuggestedRoutine,
    createRoutine,
    CreateRoutinePayload,
} from '../../lib/routines';

// Columnas alineadas para la “tabla”
const colName = { flex: 4 };   // nombre ejercicio
const colSets = { flex: 1.2 }; // series
const colReps = { flex: 1.2 }; // reps
const colNotes = { flex: 3 };  // notas

export default function SuggestedRoutineDetailScreen() {
    const { isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [routine, setRoutine] = useState<Routine | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [copying, setCopying] = useState(false);
    const [tipsVisible, setTipsVisible] = useState(false);

    const [copyConfirmVisible, setCopyConfirmVisible] = useState(false);

    // 👇 Hooks SIEMPRE antes de cualquier return condicional
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                if (!id) return;
                const data = await getSuggestedRoutine(String(id));
                if (isMounted) {
                    setRoutine(data);
                    setError(null);
                }
            } catch (err) {
                console.log('Error cargando rutina sugerida:', err);
                if (isMounted) {
                    setError(
                        err instanceof Error ? err.message : 'No se pudo cargar la rutina.'
                    );
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

    const handleBack = () => {
        router.replace('/suggestions');
    };

    // Abre el modal de confirmación
    const handleRequestCopy = () => {
        setCopyConfirmVisible(true);
    };

    // Confirma: copia la rutina y va al home
    const handleConfirmCopy = async () => {
        if (!routine) return;

        const payload: CreateRoutinePayload = {
            title: routine.title,
            notes: routine.notes ?? null,
            exercises: (routine.exercises ?? []).map((ex, index) => ({
                name: ex.name,
                sets: ex.sets ?? null,
                reps: ex.reps ?? null,
                notes: ex.notes ?? null,
                day: ex.day ?? null,
                order: index + 1,
            })),
        };

        try {
            setCopying(true);
            await createRoutine(payload);

            // cerramos el modal
            setCopyConfirmVisible(false);

            // 👉 llevar al home para que vea la rutina en su lista
            router.replace('/home');
        } catch (err) {
            console.error('Error copiando rutina sugerida:', err);
        } finally {
            setCopying(false);
        }
    };

    const handleCancelCopy = () => {
        setCopyConfirmVisible(false);
    };


    // 👉 returns condicionales (después de los hooks)
    if (!isAuthenticated) {
        return <Redirect href="/" />;
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

    if (error || !routine) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-4"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text style={{ color: COLORS.textLight, marginBottom: 12 }}>
                    {error ?? 'Rutina sugerida no encontrada.'}
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

    // 👉 Calculamos ejercicios y agrupado SIN hooks (esto no rompe nada)
    const exercises: RoutineExercise[] = (routine.exercises ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const groupedByDay: Record<string, RoutineExercise[]> = {};
    for (const ex of exercises) {
        const key = ex.day || 'Sin día';
        if (!groupedByDay[key]) groupedByDay[key] = [];
        groupedByDay[key].push(ex);
    }

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-2 w-full"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* LOGO + TÍTULO SUPERIOR */}
                <View className="mb-2">
                    <View className="items-center">
                        <Image
                            source={require('../../assets/img/icontwist.png')}
                            style={{ width: 180, height: 90 }}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* CONTENEDOR PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Título */}
                        <View className="flex-row items-center justify-between mb-4 px-4">
                            <View>
                                <Text className="text-[16px] underline font-semibold text-white">
                                    {routine.title}
                                </Text>
                                <Text
                                    className="text-[11px] mt-1"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Rutina sugerida · solo lectura
                                </Text>
                            </View>
                        </View>

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
                                    <View className="mb-1">
                                        <Text className="text-left text-[13px] font-bold text-gray-400">
                                            {day}
                                        </Text>
                                    </View>

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

                                    {exs.map((ex, index) => (
                                        <View
                                            key={ex.id ?? `${day}-${index}`}
                                            className="flex-row py-1 border-b border-neutral-800"
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
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Botones inferiores */}
                <View className="mt-2 flex-row justify-between px-2">
                    {/* Volver atrás */}
                    <Pressable
                        onPress={handleBack}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver atrás
                        </Text>
                    </Pressable>

                    {/* Copiar rutina -> abre modal */}
                    <Pressable
                        onPress={handleRequestCopy}
                        className="flex-1  px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: COLORS.primary }}
                        disabled={copying}
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: '#111111' }}
                        >
                            {copying ? 'Copiando...' : 'Copiar rutina'}
                        </Text>
                    </Pressable>
                </View>

                {/* MODAL: confirmar guardado de rutina sugerida */}
                <Modal
                    visible={copyConfirmVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={handleCancelCopy}
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
                                ¿Guardar esta rutina en tu cuenta?
                            </Text>

                            <Text
                                className="text-xs mb-4 text-center"
                                style={{ color: COLORS.textMuted }}
                            >
                                Se copiará como una nueva rutina en tu lista personal. Luego podrás
                                editarla cuando quieras.
                            </Text>

                            <View className="flex-row justify-between mt-2">
                                {/* Cancelar */}
                                <Pressable
                                    onPress={handleCancelCopy}
                                    className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: '#444444' }}
                                    disabled={copying}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Cancelar
                                    </Text>
                                </Pressable>

                                {/* Guardar / Copiar */}
                                <Pressable
                                    onPress={handleConfirmCopy}
                                    className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: COLORS.primary }}
                                    disabled={copying}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: '#111111' }}
                                    >
                                        {copying ? 'Guardando...' : 'Guardar rutina'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>


                {/* MODAL opcional de cuidados (podés quitarlo si no lo usás) */}
                <Modal
                    visible={tipsVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setTipsVisible(false)}
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
                                Cuidados y recomendaciones
                            </Text>

                            <Text
                                className="text-xs mb-3"
                                style={{ color: COLORS.textMuted }}
                            >
                                • Calentá siempre 5–10 minutos antes de entrenar.
                            </Text>
                            <Text
                                className="text-xs mb-3"
                                style={{ color: COLORS.textMuted }}
                            >
                                • Ajustá pesos y repeticiones a tu nivel actual.
                            </Text>
                            <Text
                                className="text-xs mb-3"
                                style={{ color: COLORS.textMuted }}
                            >
                                • Si tenés lesiones o dudas médicas, consultá con un
                                profesional.
                            </Text>

                            <Pressable
                                onPress={() => setTipsVisible(false)}
                                className="mt-3 py-2 rounded-full items-center"
                                style={{ backgroundColor: COLORS.primary }}
                            >
                                <Text
                                    className="text-[13px] font-semibold"
                                    style={{ color: '#111111' }}
                                >
                                    Cerrar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}
