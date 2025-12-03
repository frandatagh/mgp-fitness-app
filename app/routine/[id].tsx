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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getRoutine, Routine, RoutineExercise } from '../../lib/routines';
import { Ionicons } from '@expo/vector-icons';


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

    const [doneModalVisible, setDoneModalVisible] = useState(false);
    const [doneMarked, setDoneMarked] = useState(false);

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

    // NUEVO: al apretar el botón “Realizada” abrimos modal
    const handleDonePress = () => {
        setDoneModalVisible(true);
    };

    // NUEVO: confirmar rutina realizada
    const handleConfirmDone = () => {
        setDoneMarked(true);
        setDoneModalVisible(false);

        // Más adelante: acá podemos mandar al backend, registrar estadísticas, etc.
        console.log('Rutina marcada como realizada:', routine?.id);
    };

    // NUEVO: cerrar modal sin marcar como realizada
    const handleContinue = () => {
        setDoneModalVisible(false);
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

            <View className="flex-1 px-4 pt-1 pb-4"
                style={{ maxWidth: 800, alignSelf: 'center' }}>
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
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Título + botón menú */}
                        <View className="flex-row items-center justify-between mb-4 px-4">
                            <View >
                                <Text className=" text-[16px] underline font-semibold text-white">
                                    {routine.title}
                                </Text>
                            </View>

                            {/* Botón tres puntos, minimal */}
                            <Pressable
                                onPress={() => setMenuVisible(true)}
                                hitSlop={8}
                                style={({ pressed }) => ({
                                    width: 32,
                                    height: 32,
                                    borderRadius: 9999,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: pressed ? '#3f3f3f' : 'transparent', // gris al presionar (podés usar COLORS.primary si lo querés verde)
                                })}
                            >
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>⋯</Text>
                            </Pressable>
                        </View>


                        {/* Descripción */}
                        {routine.notes && (
                            <Text
                                className="text-[16px] leading-5 text-gray-200 mb-2 px-4"
                                style={{ color: COLORS.textMuted }}
                            >
                                {routine.notes}
                            </Text>
                        )}

                        {/* TABLA AGRUPADA POR DÍA */}
                        <View className="mt-3 px-4">
                            {Object.entries(groupedByDay).map(([day, exs]) => (
                                <View key={day} className="mb-3">
                                    {/* “Chip” con el día */}
                                    <View className="mb-1">
                                        <Text
                                            className="text-left text-[13px] font-bold text-gray-400"

                                        >
                                            {day}
                                        </Text>
                                    </View>

                                    {/* Cabecera de columnas */}
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

                                    {/* Filas de ese día */}
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
                                                    // Ir a pantalla de edición
                                                    router.push({
                                                        pathname: '/routine/edit/[id]',
                                                        params: { id: routine.id },
                                                    });
                                                } else if (item.action === 'delete' && routine?.id) {
                                                    // TODO: más adelante: confirm + borrar rutina real
                                                    console.log('Borrar rutina', routine.id);
                                                } else if (item.action === 'export') {
                                                    console.log('Exportar rutina', routine?.id);
                                                } else if (item.action === 'share') {
                                                    console.log('Compartir rutina', routine?.id);
                                                } else if (item.action === 'close') {
                                                    handleBack();
                                                }
                                            }}
                                            className={`py-2 ${index !== 0 ? 'border-t border-neutral-800' : ''}`}
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

                    </ScrollView>
                </View>

                {/* Botones inferiores */}
                <View className="mt-2 flex-row justify-between px-2 pb-2">
                    {/* Botón "Realizada" - 2x más ancho */}
                    <Pressable
                        onPress={handleDonePress}
                        className="flex-[2] mr-2 px-4 py-4 rounded-xl items-center justify-center"
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
                                Realizada por hoy
                            </Text>
                        </View>
                    </Pressable>

                    {/* Botón "Volver atrás" - tamaño normal */}
                    <Pressable
                        onPress={handleBack}
                        className="flex-1  px-4 py-4 rounded-xl items-center justify-center"
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

                {/* Modal: confirmar rutina realizada */}
                <Modal
                    visible={doneModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={handleContinue}
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
                                ¿Has terminado con el entrenamiento de hoy?
                            </Text>

                            <Text
                                className="text-xs mb-4 text-center"
                                style={{
                                    color: COLORS.textMuted,
                                    textDecorationLine: 'underline',
                                }}
                            >
                                ver estadísticas (próximamente)
                            </Text>

                            <View className="flex-row justify-between mt-4">
                                {/* Botón verde: Rutina realizada */}
                                <Pressable
                                    onPress={handleConfirmDone}
                                    className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: COLORS.primary }}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: '#111111' }}
                                    >
                                        Rutina realizada
                                    </Text>
                                </Pressable>

                                {/* Botón gris: Continuar */}
                                <Pressable
                                    onPress={handleContinue}
                                    className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                                    style={{ backgroundColor: '#444444' }}
                                >
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Continuar
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

            </View>
        </SafeAreaView >
    );
}
