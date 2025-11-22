// app/routine/new.tsx
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    View,
    Pressable,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { createRoutine, CreateRoutinePayload } from '../../lib/routines';

type ExerciseRow = {
    name: string;
    sets: string;
    reps: string;
    notes: string;
};

export default function NewRoutineScreen() {
    const { isAuthenticated } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [exercises, setExercises] = useState<ExerciseRow[]>([
        { name: '', sets: '', reps: '', notes: '' },
        { name: '', sets: '', reps: '', notes: '' },
        { name: '', sets: '', reps: '', notes: '' },
    ]);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const handleChangeExercise = (
        index: number,
        field: keyof ExerciseRow,
        value: string,
    ) => {
        setExercises((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleAddExercise = () => {
        setExercises((prev) => [
            ...prev,
            { name: '', sets: '', reps: '', notes: '' },
        ]);
    };

    const handleSave = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            Alert.alert('Falta título', 'Por favor ingresa un título para la rutina.');
            return;
        }

        // Nos quedamos solo con ejercicios que tengan nombre
        const filledExercises = exercises.filter((e) => e.name.trim());

        if (filledExercises.length === 0) {
            Alert.alert(
                'Sin ejercicios',
                'Agrega al menos un ejercicio con nombre para guardar la rutina.',
            );
            return;
        }

        // Normalizamos: todo como string (o undefined), y le damos un order
        const normalizedExercises = filledExercises.map((e, index) => ({
            name: e.name.trim(),
            sets: e.sets.trim() || undefined,
            reps: e.reps.trim() || undefined,
            notes: e.notes.trim() || undefined,
            order: index, // opcional, pero útil para mantener el orden
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
                // En web navegamos directo, sin depender del Alert
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

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 px-4 pt-6 pb-4">
                {/* LOGO / TÍTULO SUPERIOR */}
                <View className="items-center mb-4">
                    <Text
                        className="text-3xl font-extrabold tracking-tight text-center"
                        style={{ color: COLORS.accent }}
                    >
                        MGP <Text style={{ color: COLORS.primary }}>RUTINA FITNESS</Text>
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: COLORS.textLight }}>
                        Crear rutina
                    </Text>
                </View>

                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* TÍTULO DE RUTINA */}
                        <View className="mb-3">
                            <Text
                                className="text-sm font-semibold mb-1"
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

                        {/* LÍNEA DIVISORIA */}
                        <View
                            className="my-2"
                            style={{ height: 1, backgroundColor: COLORS.textMuted }}
                        />

                        {/* CABECERA DE TABLA */}
                        <View className="flex-row mb-2">
                            <View className="flex-[4]">
                                <Text
                                    className="font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Ejercicios.
                                </Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text
                                    className="font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Series.
                                </Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text
                                    className="font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Reps.
                                </Text>
                            </View>
                            <View className="flex-[4]">
                                <Text
                                    className="font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Notas.
                                </Text>
                            </View>
                        </View>

                        {/* FILAS DE EJERCICIOS */}
                        {exercises.map((exercise, index) => (
                            <View key={index} className="flex-row items-center mb-2">
                                <View className="flex-[4] mr-1">
                                    <TextInput
                                        value={exercise.name}
                                        onChangeText={(text) =>
                                            handleChangeExercise(index, 'name', text)
                                        }
                                        placeholder="Press banca"
                                        placeholderTextColor={COLORS.textMuted}
                                        className="px-2 py-1 rounded-lg text-xs"
                                        style={{
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                        }}
                                    />
                                </View>

                                <View className="flex-[2] mx-1">
                                    <TextInput
                                        value={exercise.sets}
                                        onChangeText={(text) =>
                                            handleChangeExercise(index, 'sets', text)
                                        }
                                        keyboardType="numeric"
                                        placeholder="3"
                                        placeholderTextColor={COLORS.textMuted}
                                        className="px-2 py-1 rounded-lg text-xs text-center"
                                        style={{
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                        }}
                                    />
                                </View>

                                <View className="flex-[2] mx-1">
                                    <TextInput
                                        value={exercise.reps}
                                        onChangeText={(text) =>
                                            handleChangeExercise(index, 'reps', text)
                                        }
                                        keyboardType="numeric"
                                        placeholder="10"
                                        placeholderTextColor={COLORS.textMuted}
                                        className="px-2 py-1 rounded-lg text-xs text-center"
                                        style={{
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                        }}
                                    />
                                </View>

                                <View className="flex-[4] ml-1">
                                    <TextInput
                                        value={exercise.notes}
                                        onChangeText={(text) =>
                                            handleChangeExercise(index, 'notes', text)
                                        }
                                        placeholder="Al fallo, tempo, etc."
                                        placeholderTextColor={COLORS.textMuted}
                                        className="px-2 py-1 rounded-lg text-xs"
                                        style={{
                                            backgroundColor: '#111111',
                                            color: COLORS.textLight,
                                            borderWidth: 1,
                                            borderColor: '#333333',
                                        }}
                                    />
                                </View>
                            </View>
                        ))}

                        {/* DESCRIPCIÓN */}
                        <View className="mt-4">
                            <Text
                                className="text-sm font-semibold mb-1"
                                style={{ color: COLORS.textLight }}
                            >
                                Descripción:
                            </Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholder="Notas generales de la rutina, frecuencia semanal, recomendaciones..."
                                placeholderTextColor={COLORS.textMuted}
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                    backgroundColor: '#111111',
                                    color: COLORS.textLight,
                                    borderWidth: 1,
                                    borderColor: '#333333',
                                }}
                            />
                        </View>
                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="flex-row justify-between mt-4">
                    <Pressable
                        className="flex-1 mr-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: COLORS.primary }}
                        onPress={handleAddExercise}
                    >
                        <Text className="font-semibold" style={{ color: '#111111' }}>
                            + Agregar ejercicio
                        </Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 mx-1 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={handleBack}
                    >
                        <Text style={{ color: COLORS.textLight }}>Volver atrás</Text>
                    </Pressable>

                    <Pressable
                        className="flex-1 ml-2 px-4 py-3 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={handleSave}
                    >
                        <Text style={{ color: COLORS.textLight }}>Guardar rutina</Text>
                    </Pressable>

                </View>

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
        </SafeAreaView>
    );
}
