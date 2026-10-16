import React, {
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    View,
    Pressable,
    Platform,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { CreateRoutinePayload } from '../../lib/routines';
import { createRoutineWithOfflineSupport } from '../../lib/offlineActions';
import {
    Feather,
    Ionicons,
} from '@expo/vector-icons';

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

function NewRoutineNavButton({
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

    const [backModalVisible, setBackModalVisible] = useState(false);
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [
        suggestionsModalVisible,
        setSuggestionsModalVisible,
    ] = useState(false);

    const [dayPickerVisible, setDayPickerVisible] = useState(false);

    const [saving, setSaving] = useState(false);

    const [
        titleError,
        setTitleError,
    ] =
        useState<string | null>(
            null
        );


    const [
        exerciseError,
        setExerciseError,
    ] =
        useState<string | null>(
            null
        );

    const exercisesScrollRef =
        useRef<ScrollView | null>(
            null
        );

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    // Helpers de actualización de filas ----------------------

    const hasUnsavedChanges =
        title.trim().length > 0 ||
        description.trim().length > 0 ||
        exercises.some(
            (exercise) =>
                exercise.name.trim().length > 0 ||
                exercise.sets.trim().length > 0 ||
                exercise.reps.trim().length > 0 ||
                exercise.notes.trim().length > 0 ||
                Boolean(exercise.day)
        );

    const handleChangeExercise = (
        index: number,
        field: keyof ExerciseRow,
        value: string,
    ) => {
        setExercises(prev => {
            const copy = [...prev];

            copy[index] = {
                ...copy[index],
                [field]: value,
            };

            return copy;
        });

        /*
         * Si el usuario empieza a escribir
         * un nombre válido, quitamos el
         * mensaje de error inmediatamente.
         */
        if (
            field === 'name' &&
            value.trim().length > 0 &&
            exerciseError
        ) {
            setExerciseError(null);
        }
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
        setExercises(
            (prev) => [
                ...prev,
                { ...EMPTY_EXERCISE },
            ]
        );

        setSelectedExerciseIndex(
            null
        );

        setExerciseError(
            null
        );

        /*
         * Esperamos brevemente a que
         * React dibuje la nueva fila.
         */
        setTimeout(() => {
            exercisesScrollRef.current
                ?.scrollToEnd({
                    animated: true,
                });
        }, 80);
    };

    // Guardar rutina ----------------------------------------

    const handleSave = async () => {
        const trimmedTitle =
            title.trim();

        setTitleError(null);
        setExerciseError(null);


        if (!trimmedTitle) {
            setTitleError(
                'Ingresa un título para la rutina.'
            );

            return;
        }


        const filledExercises =
            exercises.filter(
                (exercise) =>
                    exercise.name.trim()
            );


        if (
            filledExercises.length === 0
        ) {
            setExerciseError(
                'Agrega al menos un ejercicio con nombre.'
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
            setSaving(true);

            console.log(
                'Enviando rutina al backend:',
                payload
            );

            const result =
                await createRoutineWithOfflineSupport(
                    payload
                );

            console.log(
                'Resultado guardado rutina:',
                result
            );

            router.replace('/home');

        } catch (error) {

            const message =
                error instanceof Error
                    ? error.message
                    : 'Ocurrió un error al guardar la rutina.';

            console.log(
                'Error creando rutina:',
                error
            );

            Alert.alert(
                'Error',
                message
            );

        } finally {

            setSaving(false);
        }
    };

    const handleBack = () => {
        router.replace('/home');
    };

    const handleHomeNavPress = () => {
        if (hasUnsavedChanges) {
            setBackModalVisible(true);
            return;
        }

        handleBack();
    };


    const handleSuggestionsNavPress =
        () => {
            if (hasUnsavedChanges) {
                setSuggestionsModalVisible(
                    true
                );

                return;
            }

            router.replace(
                '/suggestions'
            );
        };

    // -------------------------------------------------------

    return (
        <SafeAreaView
            edges={[
                'left',
                'right',
                'bottom',
            ]}
            className="flex-1"
            style={{
                backgroundColor:
                    COLORS.background,
            }}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.select({
                    ios: 80,
                    android: 0,
                    default: 0,
                })}
            >
                {/* CONTENEDOR CENTRAL */}
                <View
                    className="flex-1 w-full px-2"
                    style={{
                        maxWidth: 800,
                        alignSelf: 'center',
                        minHeight: 0,
                    }}
                >

                    <Text
                        className="ml-5 pl-1 text-md text-gray-500"
                    >
                        Crear rutina
                    </Text>

                    {/* ZONA CENTRAL: PANEL CON SCROLL INTERNO */}
                    <View
                        style={{
                            borderWidth: 2,
                            borderColor: COLORS.primary,

                            borderRadius: 22,

                            backgroundColor: '#101010',

                            marginHorizontal: 8,
                            marginTop: 10,

                            flex: 1,
                            minHeight: 0,

                            overflow: 'hidden',

                            paddingHorizontal: 12,
                            paddingVertical: 16,
                        }}
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
                                onChangeText={(text) => {
                                    setTitle(text);

                                    if (titleError) {
                                        setTitleError(null);
                                    }
                                }}
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
                            {titleError && (
                                <Text
                                    style={{
                                        color: '#FF8A8A',
                                        fontSize: 10,
                                        marginTop: 5,
                                    }}
                                >
                                    {titleError}
                                </Text>
                            )}
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
                                className="px-3 py-2 rounded-xl text-sm"
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
                                <Text
                                    className="font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Día
                                </Text>
                            </View>
                        </View>

                        {/* 👇 SCROLL INTERNO SOLO PARA LA LISTA DE EJERCICIOS */}
                        <View style={{ flex: 1 }}>
                            {exerciseError && (
                                <Text
                                    style={{
                                        color: '#FF8A8A',

                                        fontSize: 10,

                                        marginBottom: 8,

                                        paddingHorizontal: 2,
                                    }}
                                >
                                    {exerciseError}
                                </Text>
                            )}
                            <ScrollView
                                ref={exercisesScrollRef}

                                className="no-scrollbar"

                                showsVerticalScrollIndicator={
                                    false
                                }

                                nestedScrollEnabled

                                keyboardShouldPersistTaps="handled"

                                contentContainerStyle={{
                                    paddingBottom: 8,
                                }}
                            >
                                {exercises.map((exercise, index) => {
                                    const isSelected =
                                        selectedExerciseIndex === index;

                                    return (
                                        <View
                                            key={index}
                                            className="mb-3 rounded-xl px-2 py-2"
                                            style={{
                                                borderWidth: 1,
                                                borderColor: isSelected
                                                    ? '#ff5555'
                                                    : '#333333',
                                                backgroundColor: isSelected
                                                    ? '#1a0000'
                                                    : '#111111',
                                            }}
                                        >
                                            {/* PRIMERA LÍNEA: nombre, series, reps, día */}
                                            <View className="flex-row items-center mb-1">
                                                {/* Nombre */}
                                                <View className="flex-[4] mr-1">
                                                    <TextInput
                                                        value={exercise.name}
                                                        onChangeText={(text) =>
                                                            handleChangeExercise(
                                                                index,
                                                                'name',
                                                                text,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setSelectedExerciseIndex(
                                                                index,
                                                            )
                                                        }
                                                        placeholder="Press banca"
                                                        placeholderTextColor={
                                                            COLORS.textMuted
                                                        }
                                                        className="px-2 py-1 rounded-lg text-sm"
                                                        style={{
                                                            backgroundColor:
                                                                '#111111',
                                                            color: COLORS.textLight,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                '#333333',
                                                        }}
                                                    />
                                                </View>

                                                {/* Series */}
                                                <View className="flex-[2] mx-1">
                                                    <TextInput
                                                        value={exercise.sets}
                                                        onChangeText={(text) =>
                                                            handleChangeExercise(
                                                                index,
                                                                'sets',
                                                                text,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setSelectedExerciseIndex(
                                                                index,
                                                            )
                                                        }
                                                        keyboardType="numeric"
                                                        placeholder="3"
                                                        placeholderTextColor={
                                                            COLORS.textMuted
                                                        }
                                                        className="px-2 py-1 rounded-lg text-sm text-center"
                                                        style={{
                                                            backgroundColor:
                                                                '#111111',
                                                            color: COLORS.textLight,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                '#333333',
                                                        }}
                                                    />
                                                </View>

                                                {/* Reps */}
                                                <View className="flex-[2] mx-1">
                                                    <TextInput
                                                        value={exercise.reps}
                                                        onChangeText={(text) =>
                                                            handleChangeExercise(
                                                                index,
                                                                'reps',
                                                                text,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setSelectedExerciseIndex(
                                                                index,
                                                            )
                                                        }
                                                        keyboardType="numeric"
                                                        placeholder="10"
                                                        placeholderTextColor={
                                                            COLORS.textMuted
                                                        }
                                                        className="px-2 py-1 rounded-lg text-sm text-center"
                                                        style={{
                                                            backgroundColor:
                                                                '#111111',
                                                            color: COLORS.textLight,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                '#333333',
                                                        }}
                                                    />
                                                </View>

                                                {/* Día (botón que abre el menú) */}
                                                <View className="flex-[2] ml-1">
                                                    <Pressable
                                                        onPress={() => {
                                                            setSelectedExerciseIndex(index);
                                                            setOpenDayMenuIndex(index);
                                                            setDayPickerVisible(true);
                                                        }}
                                                        style={{
                                                            backgroundColor:
                                                                '#111111',
                                                            borderWidth: 1,
                                                            borderColor:
                                                                '#555555',
                                                            borderRadius: 8,
                                                            paddingVertical: 4,
                                                            paddingHorizontal: 6,
                                                            alignItems: 'center',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: exercise.day
                                                                    ? COLORS
                                                                        .textLight
                                                                    : COLORS
                                                                        .textMuted,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            {exercise.day || 'Día'}
                                                        </Text>
                                                    </Pressable>
                                                </View>


                                            </View>

                                            {/* SEGUNDA LÍNEA: notas + botón borrar */}
                                            <View className="flex-row items-center mt-1">
                                                <View className="flex-1 mr-2">
                                                    <TextInput
                                                        value={exercise.notes}
                                                        onChangeText={(text) =>
                                                            handleChangeExercise(
                                                                index,
                                                                'notes',
                                                                text,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setSelectedExerciseIndex(
                                                                index,
                                                            )
                                                        }
                                                        placeholder="Notas: peso, tempo, técnica, rango, etc."
                                                        placeholderTextColor={
                                                            COLORS.textMuted
                                                        }
                                                        className="px-2 py-1 rounded-lg text-sm"
                                                        style={{
                                                            backgroundColor:
                                                                '#111111',
                                                            color: COLORS.textLight,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                '#333333',
                                                        }}
                                                    />
                                                </View>

                                                {/* Botón borrar: solo si la fila está seleccionada */}
                                                {isSelected && (
                                                    <Pressable
                                                        onPress={() => {
                                                            setDeleteModalVisible(
                                                                true,
                                                            );
                                                        }}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 999,
                                                            backgroundColor:
                                                                '#ff5555',
                                                            alignItems: 'center',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                        hitSlop={{
                                                            top: 2,
                                                            bottom: 2,
                                                            left: 6,
                                                            right: 6,
                                                        }}
                                                    >
                                                        <Feather
                                                            name="trash-2"
                                                            size={15}
                                                            color={
                                                                isSelected
                                                                    ? '#FFFFFF'
                                                                    : '#111111'
                                                            }
                                                        />
                                                    </Pressable>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>

                        </View>
                    </View>

                    {/* BOTONES INFERIORES FIJOS */}
                    {/* ========================================= */}
                    {/* NAVEGACIÓN INFERIOR                      */}
                    {/* ========================================= */}

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

                        <NewRoutineNavButton
                            onPress={
                                handleHomeNavPress
                            }

                            icon={
                                <Ionicons
                                    name="home-outline"
                                    size={27}
                                    color="#FFFFFF"
                                />
                            }
                        />


                        {/* 2 — SUGERENCIAS */}

                        <NewRoutineNavButton
                            onPress={
                                handleSuggestionsNavPress
                            }

                            icon={
                                <Ionicons
                                    name="bulb-outline"
                                    size={28}
                                    color="#FFFFFF"
                                />
                            }
                        />


                        {/* 3 — GUARDAR RUTINA */}

                        <NewRoutineNavButton
                            onPress={() =>
                                setSaveModalVisible(true)
                            }

                            disabled={saving}

                            icon={
                                saving ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Ionicons
                                        name="save-outline"
                                        size={27}
                                        color="#FFFFFF"
                                    />
                                )
                            }
                        />


                        {/* 4 — AGREGAR EJERCICIO */}

                        <NewRoutineNavButton
                            onPress={
                                handleAddExercise
                            }

                            icon={
                                <Ionicons
                                    name="add"
                                    size={34}
                                    color="#FFFFFF"
                                />
                            }
                        />
                    </View>
                </View>

                {/* MODALES (fuera del panel, pero da igual visualmente) */}

                {/* MODAL BORRAR EJERCICIO */}
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
                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                        }}
                                    >
                                        Cancelar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleDeleteSelectedExercise}
                                    className="px-8 py-2 rounded-full"
                                    style={{ backgroundColor: '#FF4B4B' }}
                                >
                                    <Text
                                        style={{
                                            color: '#111111',
                                            fontWeight: '600',
                                        }}
                                    >
                                        Aceptar
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

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
                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontWeight: '600',
                                        }}
                                    >
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
                                    <Text
                                        style={{
                                            color: '#111111',
                                            fontWeight: '700',
                                        }}
                                    >
                                        Aceptar
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ========================================= */}
                {/* MODAL CONFIRMAR IR A SUGERENCIAS         */}
                {/* ========================================= */}

                <Modal
                    visible={
                        suggestionsModalVisible
                    }
                    transparent
                    animationType="fade"
                    onRequestClose={() =>
                        setSuggestionsModalVisible(false)
                    }
                >
                    <View
                        className="flex-1 items-center justify-center"
                        style={{
                            backgroundColor:
                                'rgba(0,0,0,0.6)',
                        }}
                    >
                        <View
                            className="w-10/11 rounded-2xl p-4"
                            style={{
                                backgroundColor:
                                    '#111111',

                                borderWidth: 1,

                                borderColor:
                                    COLORS.primary,
                            }}
                        >
                            <View
                                style={{
                                    alignItems:
                                        'center',

                                    marginBottom: 10,
                                }}
                            >
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,

                                        borderRadius: 24,

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center',

                                        backgroundColor:
                                            'rgba(198,255,0,0.08)',

                                        borderWidth: 1,

                                        borderColor:
                                            'rgba(198,255,0,0.30)',
                                    }}
                                >
                                    <Ionicons
                                        name="bulb-outline"
                                        size={25}
                                        color={
                                            COLORS.primary
                                        }
                                    />
                                </View>
                            </View>


                            <Text
                                className="text-base font-semibold mb-2 text-center"
                                style={{
                                    color:
                                        COLORS.textLight,
                                }}
                            >
                                ¿Quieres ir a las sugerencias?
                            </Text>


                            <Text
                                className="text-xs text-center mb-4"
                                style={{
                                    color:
                                        COLORS.textMuted,
                                }}
                            >
                                Los cambios de esta rutina todavía no están guardados.
                                Si continúas, abandonarás esta creación para explorar
                                las rutinas sugeridas.
                            </Text>


                            <View
                                className="flex-row mt-2"
                            >
                                {/* CANCELAR */}

                                <Pressable
                                    className="flex-1 mr-2 py-2 rounded-full items-center justify-center"

                                    style={{
                                        backgroundColor:
                                            '#333333',
                                    }}

                                    onPress={() =>
                                        setSuggestionsModalVisible(
                                            false
                                        )
                                    }
                                >
                                    <Text
                                        style={{
                                            color:
                                                COLORS.textLight,

                                            fontWeight:
                                                '600',
                                        }}
                                    >
                                        Cancelar
                                    </Text>
                                </Pressable>


                                {/* CONTINUAR */}

                                <Pressable
                                    className="flex-1 ml-2 py-2 rounded-full items-center justify-center"

                                    style={{
                                        backgroundColor:
                                            COLORS.primary,
                                    }}

                                    onPress={() => {
                                        setSuggestionsModalVisible(
                                            false
                                        );

                                        router.replace(
                                            '/suggestions'
                                        );
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                '#111111',

                                            fontWeight:
                                                '700',
                                        }}
                                    >
                                        Ir a sugerencias
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* MODAL SELECTOR DE DÍA */}
                <Modal
                    visible={dayPickerVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setDayPickerVisible(false);
                        setOpenDayMenuIndex(null);
                    }}
                >
                    <View
                        className="flex-1 items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                        <View
                            className="w-60 rounded-2xl p-4"
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
                                Selecciona un día
                            </Text>

                            <ScrollView
                                style={{ maxHeight: 250 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {DAY_OPTIONS.map((opt) => {
                                    const selectedDay =
                                        openDayMenuIndex !== null
                                            ? exercises[openDayMenuIndex]?.day
                                            : '';

                                    return (
                                        <Pressable
                                            key={opt}
                                            onPress={() => {
                                                if (openDayMenuIndex !== null) {
                                                    handleChangeExercise(openDayMenuIndex, 'day', opt);
                                                }
                                                setDayPickerVisible(false);
                                                setOpenDayMenuIndex(null);
                                            }}
                                            className="py-2 rounded-lg mb-2 mx-8"
                                            style={{
                                                backgroundColor:
                                                    selectedDay === opt ? '#1f3d1f' : '#1a1a1a',
                                                borderWidth: 1,
                                                borderColor:
                                                    selectedDay === opt ? COLORS.primary : '#333333',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        selectedDay === opt
                                                            ? COLORS.primary
                                                            : COLORS.textLight,
                                                    fontSize: 14,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {opt}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            <Pressable
                                onPress={() => {
                                    setDayPickerVisible(false);
                                    setOpenDayMenuIndex(null);
                                }}
                                className="mt-3 py-3 rounded-full items-center justify-center"
                                style={{ backgroundColor: '#333333' }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontWeight: '600',
                                    }}
                                >
                                    Cerrar
                                </Text>
                            </Pressable>
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
                                Podrás editarla más adelante desde el menú
                                principal.
                            </Text>

                            <View className="flex-row mt-2">
                                <Pressable
                                    className="flex-1 mr-2 py-2 rounded-full items-center justify-center"
                                    style={{ backgroundColor: '#333333' }}
                                    onPress={() => setSaveModalVisible(false)}
                                >
                                    <Text
                                        style={{
                                            color: COLORS.textLight,
                                            fontWeight: '600',
                                        }}
                                    >
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
                                    <Text
                                        style={{
                                            color: '#111111',
                                            fontWeight: '700',
                                        }}
                                    >
                                        Aceptar
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );


}
