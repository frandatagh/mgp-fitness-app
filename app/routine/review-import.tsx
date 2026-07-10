import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AppHeader from '../../components/AppHeader';
import { createRoutine } from '../../lib/routines';

type ImportedExercise = {
    id: string;
    name: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
};

const mockDetectedExercises: ImportedExercise[] = [
    {
        id: '1',
        name: 'Press banca',
        sets: '4',
        reps: '10',
        weight: '',
        notes: 'Detectado desde imagen',
    },
    {
        id: '2',
        name: 'Press inclinado',
        sets: '3',
        reps: '12',
        weight: '',
        notes: 'Detectado desde imagen',
    },
    {
        id: '3',
        name: 'Banco apertura',
        sets: '3',
        reps: '12',
        weight: '',
        notes: 'Detectado desde imagen',
    },
];

export default function ReviewImportRoutineScreen() {
    const params = useLocalSearchParams<{
        imageUri?: string;
        title?: string;
        parsedExercises?: string;
        source?: string;
    }>();

    const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;

    const [routineTitle, setRoutineTitle] = useState(
        typeof params.title === 'string' ? params.title : 'Rutina importada'
    );
    const getInitialExercises = (): ImportedExercise[] => {
        if (typeof params.parsedExercises === 'string') {
            try {
                const parsed = JSON.parse(params.parsedExercises);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((exercise, index) => ({
                        id: `${Date.now()}-${index}`,
                        name: exercise.name ?? '',
                        sets: exercise.sets ?? '',
                        reps: exercise.reps ?? '',
                        weight: exercise.weight ?? '',
                        notes: exercise.notes ?? '',
                    }));
                }
            } catch (error) {
                console.log('Error leyendo ejercicios parseados:', error);
            }
        }

        return mockDetectedExercises;
    };

    const [exercises, setExercises] = useState<ImportedExercise[]>(
        getInitialExercises
    );
    const [saving, setSaving] = useState(false);

    const validExercises = useMemo(
        () => exercises.filter((exercise) => exercise.name.trim().length > 0),
        [exercises]
    );

    const updateExercise = (
        id: string,
        field: keyof Omit<ImportedExercise, 'id'>,
        value: string
    ) => {
        setExercises((prev) =>
            prev.map((exercise) =>
                exercise.id === id
                    ? {
                        ...exercise,
                        [field]: value,
                    }
                    : exercise
            )
        );
    };

    const removeExercise = (id: string) => {
        setExercises((prev) => prev.filter((exercise) => exercise.id !== id));
    };

    const addExercise = () => {
        setExercises((prev) => [
            ...prev,
            {
                id: String(Date.now()),
                name: '',
                sets: '',
                reps: '',
                weight: '',
                notes: '',
            },
        ]);
    };

    const handleSaveRoutine = async () => {
        try {
            if (!routineTitle.trim()) {
                Alert.alert('Falta el nombre', 'Ingresá un nombre para la rutina.');
                return;
            }

            if (validExercises.length === 0) {
                Alert.alert(
                    'Faltan ejercicios',
                    'La rutina necesita al menos un ejercicio válido.'
                );
                return;
            }

            setSaving(true);



            console.log('Guardando rutina importada...');

            const createdRoutineResponse = await createRoutine({
                title: routineTitle.trim(),
                notes: 'Rutina creada desde escaneo/importación.',
                exercises: validExercises.map((exercise, index) => {
                    const details = [
                        exercise.weight ? `Peso: ${exercise.weight} kg` : null,
                        exercise.notes ? exercise.notes.trim() : null,
                    ]
                        .filter(Boolean)
                        .join(' · ');

                    return {
                        name: exercise.name.trim(),
                        sets: exercise.sets?.trim() || '',
                        reps: exercise.reps?.trim() || '',
                        notes: details || '',
                        order: index + 1,
                        day: '',
                    };
                }),
            });

            console.log('Respuesta createRoutine:', createdRoutineResponse);

            const responseAsAny = createdRoutineResponse as any;

            const routineId =
                responseAsAny?.id ??
                responseAsAny?.routine?.id ??
                null;

            setSaving(false);

            if (routineId) {
                router.replace({
                    pathname: '/routine/[id]',
                    params: { id: routineId },
                });
                return;
            }

            router.replace('/home');
        } catch (error) {
            console.log('Error guardando rutina importada:', error);

            setSaving(false);

            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar la rutina importada.'
            );
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#111111' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 28,
                }}
            >
                <AppHeader showProfile={false} />

                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 26,
                        borderWidth: 1,
                        borderColor: 'rgba(198,255,0,0.35)',
                        padding: 16,
                        marginTop: 8,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 16,
                                backgroundColor: '#111111',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                                borderWidth: 1,
                                borderColor: '#333333',
                            }}
                        >
                            <Ionicons
                                name="scan-outline"
                                size={26}
                                color={COLORS.primary}
                            />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: COLORS.primary,
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Revisión de importación
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 21,
                                    fontWeight: '900',
                                    marginTop: 2,
                                }}
                            >
                                Revisá tu rutina
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 13,
                            lineHeight: 20,
                        }}
                    >
                        Antes de guardar, revisá que los ejercicios detectados sean correctos.
                        Podés corregir nombres, series, repeticiones, peso o notas.
                    </Text>
                </View>

                {imageUri ? (
                    <View
                        style={{
                            backgroundColor: '#1A1A1A',
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#2F2F2F',
                            padding: 14,
                            marginTop: 14,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 15,
                                fontWeight: '900',
                                marginBottom: 10,
                            }}
                        >
                            Imagen original
                        </Text>

                        <Image
                            source={{ uri: imageUri }}
                            style={{
                                width: '100%',
                                height: 210,
                                borderRadius: 18,
                                backgroundColor: '#111111',
                            }}
                            resizeMode="cover"
                        />
                    </View>
                ) : null}

                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: '#2F2F2F',
                        padding: 14,
                        marginTop: 14,
                    }}
                >
                    <Text
                        style={{
                            color: COLORS.textLight,
                            fontSize: 15,
                            fontWeight: '900',
                            marginBottom: 8,
                        }}
                    >
                        Nombre de rutina
                    </Text>

                    <TextInput
                        value={routineTitle}
                        onChangeText={setRoutineTitle}
                        placeholder="Ej: Rutina pecho y tríceps"
                        placeholderTextColor={COLORS.textMuted}
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: '#333333',
                            borderRadius: 16,
                            color: COLORS.textLight,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            fontSize: 15,
                            fontWeight: '800',
                        }}
                    />
                </View>

                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: '#2F2F2F',
                        padding: 14,
                        marginTop: 14,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 10,
                        }}
                    >
                        <View>
                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 15,
                                    fontWeight: '900',
                                }}
                            >
                                Ejercicios detectados
                            </Text>

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 12,
                                    marginTop: 2,
                                }}
                            >
                                {validExercises.length} ejercicios válidos
                            </Text>
                        </View>

                        <Pressable
                            onPress={addExercise}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: COLORS.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="add" size={22} color="#111111" />
                        </Pressable>
                    </View>

                    {exercises.map((exercise, index) => (
                        <View
                            key={exercise.id}
                            style={{
                                backgroundColor: '#111111',
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: '#333333',
                                padding: 12,
                                marginBottom: 12,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.primary,
                                        fontSize: 13,
                                        fontWeight: '900',
                                    }}
                                >
                                    Ejercicio {index + 1}
                                </Text>

                                <Pressable
                                    onPress={() => removeExercise(exercise.id)}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 15,
                                        backgroundColor: '#2A2A2A',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={16}
                                        color="#FFBABA"
                                    />
                                </Pressable>
                            </View>

                            <TextInput
                                value={exercise.name}
                                onChangeText={(value) =>
                                    updateExercise(exercise.id, 'name', value)
                                }
                                placeholder="Nombre del ejercicio"
                                placeholderTextColor={COLORS.textMuted}
                                style={inputStyle}
                            />

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    value={exercise.sets}
                                    onChangeText={(value) =>
                                        updateExercise(exercise.id, 'sets', value)
                                    }
                                    placeholder="Series"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    style={[inputStyle, { flex: 1 }]}
                                />

                                <TextInput
                                    value={exercise.reps}
                                    onChangeText={(value) =>
                                        updateExercise(exercise.id, 'reps', value)
                                    }
                                    placeholder="Reps"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    style={[inputStyle, { flex: 1 }]}
                                />

                                <TextInput
                                    value={exercise.weight}
                                    onChangeText={(value) =>
                                        updateExercise(exercise.id, 'weight', value)
                                    }
                                    placeholder="Kg"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="numeric"
                                    style={[inputStyle, { flex: 1 }]}
                                />
                            </View>

                            <TextInput
                                value={exercise.notes}
                                onChangeText={(value) =>
                                    updateExercise(exercise.id, 'notes', value)
                                }
                                placeholder="Notas opcionales"
                                placeholderTextColor={COLORS.textMuted}
                                multiline
                                style={[
                                    inputStyle,
                                    {
                                        minHeight: 70,
                                        textAlignVertical: 'top',
                                    },
                                ]}
                            />
                        </View>
                    ))}
                </View>

                <View
                    style={{
                        backgroundColor: 'rgba(255,193,7,0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,193,7,0.25)',
                        borderRadius: 18,
                        padding: 13,
                        marginTop: 14,
                    }}
                >
                    <Text
                        style={{
                            color: '#FFD36A',
                            fontSize: 13,
                            fontWeight: '900',
                            marginBottom: 5,
                        }}
                    >
                        Revisión necesaria
                    </Text>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 12,
                            lineHeight: 18,
                        }}
                    >
                        El escaneo puede fallar si la imagen está borrosa, tiene sombras,
                        letra manuscrita difícil o una tabla muy compleja. Revisá siempre los
                        ejercicios antes de guardar.
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Pressable
                        onPress={() => router.back()}
                        disabled={saving}
                        style={({ pressed }) => ({
                            flex: 1,
                            backgroundColor: pressed ? '#333333' : '#2A2A2A',
                            borderRadius: 16,
                            paddingVertical: 14,
                            alignItems: 'center',
                            opacity: saving ? 0.6 : 1,
                        })}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 14,
                                fontWeight: '900',
                            }}
                        >
                            Volver
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleSaveRoutine}
                        disabled={saving}
                        style={({ pressed }) => ({
                            flex: 1.4,
                            backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                            borderRadius: 16,
                            paddingVertical: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: saving ? 0.7 : 1,
                        })}
                    >
                        {saving ? (
                            <ActivityIndicator color="#111111" />
                        ) : (
                            <Text
                                style={{
                                    color: '#111111',
                                    fontSize: 14,
                                    fontWeight: '900',
                                }}
                            >
                                Guardar rutina
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const inputStyle = {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 14,
    color: COLORS.textLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 8,
};