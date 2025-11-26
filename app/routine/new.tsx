// app/routine/new.tsx
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    View,
    Pressable,
    Platform,
    Modal,
    Image,
    KeyboardAvoidingView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { createRoutine, CreateRoutinePayload } from '../../lib/routines';

import { Feather } from '@expo/vector-icons';

// -------------------- TIPOS Y OPCIONES --------------------
// Día de entrenamiento permitido
export type DayOption =
    | 'Lunes'
    | 'Martes'
    | 'Miércoles'
    | 'Jueves'
    | 'Viernes'
    | 'Sábado'
    | 'Domingo'
    | 'Día 1'
    | 'Día 2'
    | 'Día 3'
    | 'Día 4'
    | 'Día 5'
    | 'Día 6'
    | 'Día 7';

// Lista de días para el menú
const DAY_OPTIONS: DayOption[] = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
    'Día 1',
    'Día 2',
    'Día 3',
    'Día 4',
    'Día 5',
    'Día 6',
    'Día 7',
];

type ExerciseRow = {
    name: string;
    sets: string;
    reps: string;
    notes: string;
    // string vacío = sin día asignado todavía
    day: DayOption | '';
};

// fila vacía base (OJO: luego la clonamos)
const EMPTY_EXERCISE: ExerciseRow = {
    name: '',
    sets: '',
    reps: '',
    notes: '',
    day: '',
};

// ----------------------------------------------------------

export default function NewRoutineScreen() {
    const { isAuthenticated } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [exercises, setExercises] = useState<ExerciseRow[]>([
        { name: '', sets: '', reps: '', notes: '', day: '' },
        { name: '', sets: '', reps: '', notes: '', day: '' },
        { name: '', sets: '', reps: '', notes: '', day: '' },
    ]);

    // índice de la fila cuyo menú de día está abierto (o null)
    const [openDayMenuIndex, setOpenDayMenuIndex] = useState<number | null>(null);

    // 👇 agregar estos dos
    const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

    const [backModalVisible, setBackModalVisible] = useState(false);
    const [saveModalVisible, setSaveModalVisible] = useState(false);


    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    // Helpers de actualización de filas ----------------------

    const handleChangeExercise = (
        index: number,
        field: keyof ExerciseRow,
        value: string,
    ) => {
        setExercises(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };


    const updateExercise = (index: number, patch: Partial<ExerciseRow>) => {
        setExercises((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...patch };
            return copy;
        });
    };

    const handleDeleteSelectedExercise = () => {
        if (selectedExerciseIndex === null) return;

        setExercises(prev =>
            prev.filter((_, idx) => idx !== selectedExerciseIndex)
        );

        setSelectedExerciseIndex(null);
        setDeleteModalVisible(false);
    };



    const handleAddExercise = () => {
        setExercises(prev => [...prev, { ...EMPTY_EXERCISE }]);
        setSelectedExerciseIndex(null);
    };

    // Guardar rutina ----------------------------------------

    const handleSave = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            Alert.alert('Falta título', 'Por favor ingresa un título para la rutina.');
            return;
        }

        // Solo ejercicios con nombre
        const filledExercises = exercises.filter(e => e.name.trim());

        if (filledExercises.length === 0) {
            Alert.alert(
                'Sin ejercicios',
                'Agrega al menos un ejercicio con nombre para guardar la rutina.',
            );
            return;
        }

        const normalizedExercises = filledExercises.map((e, index) => ({
            name: e.name.trim(),
            sets: e.sets.trim() || undefined,
            reps: e.reps.trim() || undefined,
            notes: e.notes.trim() || undefined,
            day: e.day?.trim() || undefined,
            order: index,
        }));



        const payload: CreateRoutinePayload = {
            title: trimmedTitle,
            notes: description.trim() || undefined,
            exercises: normalizedExercises,
        };

        try {
            console.log('Enviando rutina al backend:', payload);
            const created = await createRoutine(payload);
            console.log('Rutina creada en servidor:', created);

            if (Platform.OS === 'web') {
                router.replace('/home');
            } else {
                Alert.alert('Rutina guardada', 'La rutina se guardó correctamente.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace('/home');
                        },
                    },
                ]);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Ocurrió un error al guardar la rutina.';
            console.log('Error creando rutina:', error);
            Alert.alert('Error', message);
        }
    };

    const handleBack = () => {
        router.replace('/home');
    };

    // -------------------------------------------------------

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.select({
                    ios: 80,      // levanta un poco más en iOS
                    android: 0,
                    default: 0,
                })}
            >

                <View className="flex-1 px-4 pb-4"
                    style={{ maxWidth: 800, alignSelf: 'center' }}>

                    {/* LOGO + TÍTULO SUPERIOR */}
                    <View className="mb-2">
                        {/* Logo centrado */}
                        <View className="items-center">
                            <Image
                                source={require('../../assets/img/icontwist.png')}
                                style={{
                                    width: 180,        // ajustá a gusto
                                    height: 100,
                                    resizeMode: 'contain',
                                }}
                            />
                        </View>

                        {/* Subtítulo alineado a la izquierda */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text
                                className="text-base font-light px-4"
                                style={{ color: COLORS.textMuted }}
                            >
                                Crear rutina
                            </Text>
                        </View>
                    </View>

                    <View
                        className="flex-1 rounded-3xl px-3 py-4"
                        style={{ borderWidth: 2, borderColor: COLORS.primary, overflow: 'visible' }}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled={true}
                            scrollEnabled={Platform.OS === 'web' ? openDayMenuIndex === null : true}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            {/* TÍTULO DE RUTINA */}
                            <View className="mb-3">
                                <Text
                                    className="text-base font-semibold mb-1"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Título de rutina:
                                </Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Ej: Pecho y bíceps"
                                    placeholderTextColor={COLORS.textMuted}
                                    className="px-3 py-2 rounded-xl"
                                    style={{
                                        backgroundColor: '#111111',
                                        color: COLORS.textLight,
                                        borderWidth: 1,
                                        borderColor: '#333333',
                                    }}
                                />
                            </View>
                            {/* DESCRIPCIÓN */}
                            <View className="mb-2">
                                <Text
                                    className="text-base font-semibold mb-1"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Descripción:
                                </Text>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    placeholder="Notas generales de la rutina, frecuencia semanal, recomendaciones..."
                                    placeholderTextColor={COLORS.textMuted}
                                    className="px-3 py-2 rounded-xl text-base"
                                    style={{
                                        backgroundColor: '#111111',
                                        color: COLORS.textLight,
                                        borderWidth: 1,
                                        borderColor: '#333333',
                                    }}
                                />
                            </View>

                            {/* LÍNEA DIVISORIA */}
                            <View
                                className="my-2"
                                style={{ height: 1, backgroundColor: COLORS.textMuted }}
                            />

                            {/* CABECERA DE TABLA */}
                            <View className="flex-row mb-2">
                                <View className="flex-[4]">
                                    <Text
                                        className="font-semibold px-2"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Ejercicios
                                    </Text>
                                </View>
                                <View className="flex-[2] items-center">
                                    <Text
                                        className="font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Series
                                    </Text>
                                </View>
                                <View className="flex-[2] items-center">
                                    <Text
                                        className="font-semibold"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Reps
                                    </Text>
                                </View>

                                <View className="flex-[2] items-center">
                                    <Text className="font-semibold" style={{ color: COLORS.textLight }}>
                                        Día
                                    </Text>
                                </View>
                            </View>

                            {/* FILAS DE EJERCICIOS */}
                            {/* FILAS DE EJERCICIOS */}
                            {exercises.map((exercise, index) => {
                                const isSelected = selectedExerciseIndex === index;

                                return (
                                    <View
                                        key={index}
                                        className="mb-3 rounded-xl px-2 py-2"
                                        style={{
                                            borderWidth: 1,
                                            borderColor: isSelected ? '#ff5555' : '#333333',
                                            backgroundColor: isSelected ? '#1a0000' : '#111111',
                                        }}
                                    >
                                        {/* PRIMERA LÍNEA: nombre, series, reps, día */}
                                        <View className="flex-row items-center mb-1">
                                            {/* Nombre */}
                                            <View className="flex-[4] mr-1">
                                                <TextInput
                                                    value={exercise.name}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, 'name', text)
                                                    }
                                                    onFocus={() => setSelectedExerciseIndex(index)}
                                                    placeholder="Press banca"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-sm"
                                                    style={{
                                                        backgroundColor: '#111111',
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: '#333333',
                                                    }}
                                                />
                                            </View>

                                            {/* Series */}
                                            <View className="flex-[2] mx-1">
                                                <TextInput
                                                    value={exercise.sets}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, 'sets', text)
                                                    }
                                                    onFocus={() => setSelectedExerciseIndex(index)}
                                                    keyboardType="numeric"
                                                    placeholder="3"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-sm text-center"
                                                    style={{
                                                        backgroundColor: '#111111',
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: '#333333',
                                                    }}
                                                />
                                            </View>

                                            {/* Reps */}
                                            <View className="flex-[2] mx-1">
                                                <TextInput
                                                    value={exercise.reps}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, 'reps', text)
                                                    }
                                                    onFocus={() => setSelectedExerciseIndex(index)}
                                                    keyboardType="numeric"
                                                    placeholder="10"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-sm text-center"
                                                    style={{
                                                        backgroundColor: '#111111',
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: '#333333',
                                                    }}
                                                />
                                            </View>

                                            {/* Día (botón que abre el menú) */}
                                            <View className="flex-[2] ml-1">
                                                <Pressable
                                                    onPress={() => {
                                                        setSelectedExerciseIndex(index);
                                                        setOpenDayMenuIndex(
                                                            openDayMenuIndex === index ? null : index
                                                        );
                                                    }}
                                                    style={{
                                                        backgroundColor: '#111111',
                                                        borderWidth: 1,
                                                        borderColor: '#555555',
                                                        borderRadius: 8,
                                                        paddingVertical: 4,
                                                        paddingHorizontal: 6,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: exercise.day
                                                                ? COLORS.textLight
                                                                : COLORS.textMuted,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        {exercise.day || 'Día'}
                                                    </Text>
                                                </Pressable>
                                            </View>

                                            {/* MENÚ DÍAS (igual al que ya tenías) */}
                                            {openDayMenuIndex === index && (
                                                <View
                                                    className="absolute"
                                                    style={{
                                                        top: 32,
                                                        right: 0,
                                                        backgroundColor: '#111111',
                                                        borderWidth: 1,
                                                        borderColor: '#555555',
                                                        borderRadius: 8,
                                                        width: 100,
                                                        zIndex: 999,
                                                        elevation: 10,
                                                    }}
                                                >
                                                    <ScrollView
                                                        style={{ maxHeight: 130 }}
                                                        contentContainerStyle={{ paddingVertical: 4 }}
                                                        nestedScrollEnabled
                                                        keyboardShouldPersistTaps="handled"
                                                        showsVerticalScrollIndicator={false}
                                                    >
                                                        {DAY_OPTIONS.map((opt) => (
                                                            <Pressable
                                                                key={opt}
                                                                onPress={() => {
                                                                    handleChangeExercise(index, 'day', opt);
                                                                    setOpenDayMenuIndex(null);
                                                                }}
                                                                style={{
                                                                    paddingVertical: 4,
                                                                    paddingHorizontal: 8,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            exercise.day === opt
                                                                                ? COLORS.primary
                                                                                : COLORS.textLight,
                                                                        fontSize: 11,
                                                                    }}
                                                                >
                                                                    {opt}
                                                                </Text>
                                                            </Pressable>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>

                                        {/* SEGUNDA LÍNEA: notas + botón borrar */}
                                        <View className="flex-row items-center mt-1">
                                            <View className="flex-1 mr-2">

                                                <TextInput
                                                    value={exercise.notes}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, 'notes', text)
                                                    }
                                                    onFocus={() => setSelectedExerciseIndex(index)}
                                                    placeholder="Notas: peso, tempo, técnica, rango, etc."
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-sm"
                                                    style={{
                                                        backgroundColor: '#111111',
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: '#333333',
                                                    }}
                                                />
                                            </View>

                                            {/* Botón borrar: solo si la fila está seleccionada */}
                                            {isSelected && (
                                                <Pressable
                                                    onPress={() => {
                                                        setPendingDeleteIndex(index);
                                                        setDeleteModalVisible(true);
                                                    }}
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 999,
                                                        backgroundColor: '#ff5555',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                    hitSlop={{ top: 2, bottom: 2, left: 6, right: 6 }}
                                                >
                                                    <Feather
                                                        name="trash-2"      // icono de tacho
                                                        size={15}
                                                        color={isSelected ? '#FFFFFF' : '#111111'}
                                                    />
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}


                            <Modal
                                visible={deleteModalVisible}
                                transparent
                                animationType="fade"
                                onRequestClose={() => setDeleteModalVisible(false)}
                            >
                                <View className="flex-1 items-center justify-center bg-black/60">
                                    <View
                                        className="w-72 rounded-2xl p-4"
                                        style={{
                                            backgroundColor: '#111111',
                                            borderWidth: 1,
                                            borderColor: COLORS.primary,
                                        }}
                                    >
                                        <Text
                                            className="text-base font-semibold mb-3"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            ¿Realmente quieres borrar el ejercicio?
                                        </Text>

                                        <View className="flex-row justify-center mt-2">
                                            <Pressable
                                                onPress={() => setDeleteModalVisible(false)}
                                                className="px-8 py-2 rounded-full mr-2"
                                                style={{ backgroundColor: '#333333' }}
                                            >
                                                <Text style={{ color: COLORS.textLight }}>Cancelar</Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={handleDeleteSelectedExercise}
                                                className="px-8 py-2 rounded-full"
                                                style={{ backgroundColor: '#FF4B4B' }}
                                            >
                                                <Text
                                                    style={{ color: '#111111', fontWeight: '600' }}
                                                >
                                                    Aceptar
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            </Modal>





                        </ScrollView>
                    </View>

                    {/* BOTONES INFERIORES */}
                    <View className="flex-row justify-between mt-4">
                        {/* 1) VOLVER ATRÁS */}
                        <Pressable
                            className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: '#444444' }}
                            onPress={() => setBackModalVisible(true)}
                        >
                            <Text
                                className="font-semibold text-center"
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 14,
                                    lineHeight: 16,   // 👈 centra mejor verticalmente
                                }}
                            >
                                Volver atrás
                            </Text>
                        </Pressable>

                        {/* 2) AÑADIR EJERCICIO (+) */}
                        <Pressable
                            className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                            onPress={handleAddExercise}
                        >
                            <Text
                                className="font-semibold text-center"
                                style={{
                                    color: '#111111',
                                    fontSize: 14,
                                    lineHeight: 16,
                                }}
                            >
                                + Añadir ejercicio
                            </Text>
                        </Pressable>

                        {/* 3) GUARDAR RUTINA */}
                        <Pressable
                            className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: '#444444' }}
                            onPress={() => setSaveModalVisible(true)}
                        >
                            <Text
                                className="font-semibold text-center"
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 14,
                                    lineHeight: 16,
                                }}
                            >
                                Guardar rutina
                            </Text>
                        </Pressable>
                    </View>

                    {/* MODAL CONFIRMAR VOLVER ATRÁS */}
                    <Modal
                        visible={backModalVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setBackModalVisible(false)}
                    >
                        <View
                            className="flex-1 items-center justify-center"
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                            <View
                                className="w-10/11 rounded-2xl p-4"
                                style={{
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: COLORS.primary,
                                }}
                            >
                                <Text
                                    className="text-base font-semibold mb-2 text-center"
                                    style={{ color: COLORS.textLight }}
                                >
                                    ¿Realmente quieres volver al menú principal?
                                </Text>

                                <Text
                                    className="text-xs text-center mb-4"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Se perderán los cambios que no hayas guardado.
                                </Text>

                                <View className="flex-row mt-2">
                                    <Pressable
                                        className="flex-1 mr-2 py-2 rounded-full items-center justify-center"
                                        style={{ backgroundColor: '#333333' }}
                                        onPress={() => setBackModalVisible(false)}
                                    >
                                        <Text style={{ color: COLORS.textLight, fontWeight: '600' }}>
                                            Cancelar
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        className="flex-1 ml-2 py-2 rounded-full items-center justify-center"
                                        style={{ backgroundColor: COLORS.primary }}
                                        onPress={() => {
                                            setBackModalVisible(false);
                                            handleBack();
                                        }}
                                    >
                                        <Text style={{ color: '#111111', fontWeight: '700' }}>
                                            Aceptar
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </Modal>
                    {/* MODAL CONFIRMAR GUARDAR */}
                    <Modal
                        visible={saveModalVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setSaveModalVisible(false)}
                    >
                        <View
                            className="flex-1 items-center justify-center"
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                            <View
                                className="w-10/11 rounded-2xl p-4"
                                style={{
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: COLORS.primary,
                                }}
                            >
                                <Text
                                    className="text-base font-semibold mb-2 text-center"
                                    style={{ color: COLORS.textLight }}
                                >
                                    ¿Quieres guardar esta rutina?
                                </Text>

                                <Text
                                    className="text-xs text-center mb-4"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Podrás editarla más adelante desde el menú principal.
                                </Text>

                                <View className="flex-row mt-2">
                                    <Pressable
                                        className="flex-1 mr-2 py-2 rounded-full items-center justify-center"
                                        style={{ backgroundColor: '#333333' }}
                                        onPress={() => setSaveModalVisible(false)}
                                    >
                                        <Text style={{ color: COLORS.textLight, fontWeight: '600' }}>
                                            Cancelar
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        className="flex-1 ml-2 py-2 rounded-full items-center justify-center"
                                        style={{ backgroundColor: COLORS.primary }}
                                        onPress={async () => {
                                            setSaveModalVisible(false);
                                            await handleSave();
                                        }}
                                    >
                                        <Text style={{ color: '#111111', fontWeight: '700' }}>
                                            Aceptar
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </Modal>


                    {/* FOOTER */}
                    <View className="items-center mt-4">
                        <Text className="font-bold" style={{ color: COLORS.accent }}>
                            MGP <Text style={{ color: COLORS.primary }}>RUTINA FITNESS</Text>
                        </Text>
                        <Text style={{ color: COLORS.textLight }}>
                            ¡Tu entrenamiento al instante!
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
