// app/routine/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    View,
    Pressable,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getRoutine, Routine, RoutineExercise } from '../../lib/routines';

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

    const handleBack = () => {
        // No dependemos del historial; siempre volvemos al home
        router.replace('/home');
    };

    const handleDone = () => {
        console.log('Rutina marcada como realizada:', routine?.id);
        router.replace('/home');
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

    const exercises: RoutineExercise[] = routine.exercises ?? [];

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 px-4 pt-6 pb-4">
                {/* Encabezado superior */}
                <View className="items-center mb-4">
                    <Text
                        className="text-3xl font-extrabold tracking-tight text-center"
                        style={{ color: COLORS.accent }}
                    >
                        MGP <Text style={{ color: COLORS.primary }}>RUTINA FITNESS</Text>
                    </Text>
                    <Text
                        className="text-xs mt-1"
                        style={{ color: COLORS.textLight }}
                    >
                        Detalle de rutina
                    </Text>
                </View>

                {/* Contenedor principal de la tarjeta */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Título + botón menú */}
                        <View className="flex-row items-center justify-between mb-4 px-4">
                            <View>
                                <Text className="text-[14px] text-gray-300">Detalle de rutina</Text>
                                <Text className="text-[16px] font-semibold text-white mt-1">
                                    {routine.title}
                                </Text>
                            </View>

                            {/* Botón tres puntos */}
                            <Pressable
                                onPress={() => setMenuVisible(true)}
                                className="w-10 h-10 rounded-full bg-neutral-800 items-center justify-center border border-lime-400"
                                hitSlop={8}
                            >
                                <Text className="text-[20px] text-lime-300">⋯</Text>
                            </Pressable>
                        </View>

                        {/* Descripción */}
                        {routine.notes && (
                            <Text
                                className="text-[16px] leading-5 text-gray-200 mb-4 px-4"
                                style={{ color: COLORS.textMuted }}
                            >
                                {routine.notes}
                            </Text>
                        )}

                        {/* Cabecera de “tabla” */}
                        <View className="mt-3 px-4">
                            <View className="flex-row border-b border-lime-400 pb-1 mb-1">
                                <Text
                                    style={colName}
                                    className="text-[16px] font-semibold text-gray-100"
                                >
                                    Ejercicios
                                </Text>
                                <Text
                                    style={colSets}
                                    className="text-[16px] font-semibold text-gray-100 text-center"
                                >
                                    Series
                                </Text>
                                <Text
                                    style={colReps}
                                    className="text-[16px] font-semibold text-gray-100 text-center"
                                >
                                    Reps.
                                </Text>
                                <Text
                                    style={colNotes}
                                    className="text-[16px] font-semibold text-gray-100 text-right"
                                >
                                    Notas
                                </Text>
                            </View>

                            {/* Filas de ejercicios */}
                            {exercises.map((ex, index) => (
                                <View
                                    key={ex.id ?? index}
                                    className="flex-row py-1 border-b border-neutral-800"
                                >
                                    <Text
                                        style={colName}
                                        className="text-[16px] text-gray-200"
                                        numberOfLines={1}
                                    >
                                        {ex.name}
                                    </Text>

                                    <Text
                                        style={colSets}
                                        className="text-[16px] text-gray-300 text-center"
                                    >
                                        {ex.sets ?? '-'}
                                    </Text>

                                    <Text
                                        style={colReps}
                                        className="text-[16px] text-gray-300 text-center"
                                    >
                                        {ex.reps ?? '-'}
                                    </Text>

                                    <Text
                                        style={colNotes}
                                        className="text-[16px] text-gray-300 text-right"
                                        numberOfLines={1}
                                    >
                                        {ex.notes ?? '-'}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Menú de opciones (modal) */}
                        <Modal
                            visible={menuVisible}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setMenuVisible(false)}
                        >
                            {/* Fondo oscurecido */}
                            <Pressable
                                className="flex-1 bg-black/50"
                                onPress={() => setMenuVisible(false)}
                            >
                                {/* Contenedor del menú */}
                                <View className="absolute right-4 top-16 w-52 bg-neutral-900 rounded-xl border border-neutral-700 shadow-lg">
                                    {[
                                        { label: 'Editar rutina', action: 'edit' },
                                        { label: 'Borrar rutina', action: 'delete' },
                                        { label: 'Exportar', action: 'export' },
                                        { label: 'Compartir', action: 'share' },
                                        { label: 'Salir de rutina', action: 'close' },
                                    ].map((item, index) => (
                                        <Pressable
                                            key={item.action}
                                            onPress={() => {
                                                setMenuVisible(false);
                                                if (item.action === 'edit' && routine?.id) {
                                                    console.log('Editar rutina', routine.id);
                                                    router.push({
                                                        pathname: "/routine/edit/[id]",
                                                        params: { id: routine.id },
                                                    });
                                                }
                                                if (item.action === 'close') {
                                                    handleBack();
                                                }
                                            }}
                                            className={`px-4 py-2 ${index !== 0 ? 'border-t border-neutral-800' : ''
                                                }`}
                                        >
                                            <Text className="text-[14px] text-gray-100">
                                                {item.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </Pressable>
                        </Modal>
                    </ScrollView>
                </View>

                {/* Botones inferiores */}
                <View className="mt-4 flex-row justify-between px-4 pb-4">
                    <Pressable
                        onPress={handleDone}
                        className="flex-1 mr-2 bg-lime-400 rounded-full py-2 items-center justify-center"
                    >
                        <Text className="text-[14px] font-semibold text-black">
                            Realizada
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleBack}
                        className="flex-1 ml-2 bg-neutral-700 rounded-full py-2 items-center justify-center"
                    >
                        <Text className="text-[14px] font-semibold text-gray-100">
                            Volver atrás
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
