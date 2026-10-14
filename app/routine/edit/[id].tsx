import React, {
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    View,
    Pressable,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
    Feather,
    Ionicons,
} from "@expo/vector-icons";
import AppHeader from '../../../components/AppHeader';
import { COLORS } from "../../../constants/colors";
import { useAuth } from "../../../context/AuthContext";
import {
    getRoutine,
    updateRoutine,
    Routine,
    RoutineExercise,
} from "../../../lib/routines";

// ---- Tipos y constantes para ejercicios / días ----

type DayOption =
    | "Lunes"
    | "Martes"
    | "Miércoles"
    | "Jueves"
    | "Viernes"
    | "Sábado"
    | "Domingo"
    | "Día 1"
    | "Día 2"
    | "Día 3"
    | "Día 4"
    | "Día 5"
    | "Día 6"
    | "Día 7";

const DAY_OPTIONS: DayOption[] = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
    "Día 1",
    "Día 2",
    "Día 3",
    "Día 4",
    "Día 5",
    "Día 6",
    "Día 7",
];

type ExerciseRow = {
    id?: string;               // para que el backend pueda saber cuál es cuál
    name: string;
    sets: string;
    reps: string;
    notes: string;
    day: DayOption | "";
};

const EMPTY_EXERCISE: ExerciseRow = {
    name: "",
    sets: "",
    reps: "",
    notes: "",
    day: "",
};

const buildRoutineSnapshot = (
    title: string,
    notes: string,
    exercises: ExerciseRow[]
) =>
    JSON.stringify({
        title: title.trim(),

        notes: notes.trim(),

        exercises:
            exercises.map(
                (exercise) => ({
                    id:
                        exercise.id ?? null,

                    name:
                        exercise.name.trim(),

                    sets:
                        exercise.sets.trim(),

                    reps:
                        exercise.reps.trim(),

                    notes:
                        exercise.notes.trim(),

                    day:
                        exercise.day,
                })
            ),
    });

function EditRoutineNavButton({
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

export default function EditRoutineScreen() {
    const { isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [routine, setRoutine] = useState<Routine | null>(null);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");

    const [exercises, setExercises] = useState<ExerciseRow[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // selección de fila y menú de día (igual que en "crear rutina")
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
    const [openDayMenuIndex, setOpenDayMenuIndex] = useState<number | null>(null);

    const [
        dayPickerVisible,
        setDayPickerVisible,
    ] = useState(false);

    // modal para borrar ejercicio
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
        null
    );

    const [
        homeModalVisible,
        setHomeModalVisible,
    ] = useState(false);

    const [
        backModalVisible,
        setBackModalVisible,
    ] = useState(false);

    const [
        saveModalVisible,
        setSaveModalVisible,
    ] = useState(false);

    const [
        titleError,
        setTitleError,
    ] = useState<string | null>(
        null
    );

    const exercisesScrollRef =
        useRef<ScrollView | null>(
            null
        );

    const initialSnapshotRef =
        useRef<string>('');



    // ---------- Cargar la rutina actual ----------
    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                if (!id) return;
                console.log("EditRoutineScreen -> cargando rutina id:", id);
                const data = await getRoutine(String(id));
                if (!isMounted) return;

                setRoutine(data);
                setTitle(data.title ?? "");
                setNotes(data.notes ?? "");

                const loadedExercises:
                    RoutineExercise[] =
                    [
                        ...(data.exercises ?? [])
                    ];

                const nextExercises:
                    ExerciseRow[] =
                    loadedExercises.length > 0
                        ? loadedExercises
                            .sort(
                                (a, b) =>
                                    (a.order ?? 0) -
                                    (b.order ?? 0)
                            )
                            .map((ex) => ({
                                id: ex.id,

                                name:
                                    ex.name ?? "",

                                sets:
                                    ex.sets ?? "",

                                reps:
                                    ex.reps ?? "",

                                notes:
                                    ex.notes ?? "",

                                day:
                                    (
                                        ex.day as
                                        | DayOption
                                        | null
                                    ) ?? "",
                            }))
                        : [
                            { ...EMPTY_EXERCISE },
                            { ...EMPTY_EXERCISE },
                            { ...EMPTY_EXERCISE },
                        ];

                setExercises(
                    nextExercises
                );

                initialSnapshotRef.current =
                    buildRoutineSnapshot(
                        data.title ?? "",
                        data.notes ?? "",
                        nextExercises
                    );

                setError(null);
            } catch (err) {
                console.log("Error cargando rutina para edición:", err);
                if (isMounted) setError("No se pudo cargar la rutina.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => {
            isMounted = false;
        };
    }, [id]);

    const hasUnsavedChanges =
        !!routine &&
        buildRoutineSnapshot(
            title,
            notes,
            exercises
        ) !==
        initialSnapshotRef.current;

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    // ---------- Helpers para ejercicios ----------

    const handleChangeExercise = (
        index: number,
        field: keyof ExerciseRow,
        value: string
    ) => {
        setExercises((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });

        // 👇 cada vez que escribís, esa fila queda “activa”
        setSelectedRowIndex(index);
    };

    const handleAddExercise = () => {
        setExercises(
            (prev) => [
                ...prev,
                { ...EMPTY_EXERCISE },
            ]
        );

        setSelectedRowIndex(
            exercises.length
        );

        setTimeout(() => {
            exercisesScrollRef.current
                ?.scrollToEnd({
                    animated: true,
                });
        }, 80);
    };

    const askDeleteExercise = (index: number) => {
        setPendingDeleteIndex(index);
        setDeleteModalVisible(true);
    };

    const handleDeleteExercise = () => {
        if (pendingDeleteIndex == null) {
            setDeleteModalVisible(false);
            return;
        }

        setExercises((prev) => prev.filter((_, i) => i !== pendingDeleteIndex));

        // reajustar selección
        setSelectedRowIndex((current) => {
            if (current == null) return null;
            if (current === pendingDeleteIndex) return null;
            if (current > pendingDeleteIndex) return current - 1;
            return current;
        });

        setPendingDeleteIndex(null);
        setDeleteModalVisible(false);
    };

    const handleCancelDelete = () => {
        setPendingDeleteIndex(null);
        setDeleteModalVisible(false);
    };

    const handleCancel = () => {
        if (!id) {
            router.replace("/home");
            return;
        }

        router.replace({
            pathname: "/routine/[id]",
            params: { id: String(id) },
        });
    };

    const handleHomePress = () => {
        if (hasUnsavedChanges) {
            setHomeModalVisible(true);
            return;
        }

        router.replace('/home');
    };


    const handleBackPress = () => {
        if (hasUnsavedChanges) {
            setBackModalVisible(true);
            return;
        }

        handleCancel();
    };

    const handleSave = async () => {
        if (!id) {
            Alert.alert("Error", "No se encontró el ID de la rutina.");
            return;
        }

        setTitleError(null);

        if (!title.trim()) {
            setTitleError(
                'La rutina debe tener un título.'
            );

            return;
        }

        console.log("Guardando cambios en rutina id:", id);

        // limpiamos ejercicios sin nombre
        const filledExercises = exercises.filter((e) => e.name.trim());

        const normalizedExercises = filledExercises.map((e, index) => ({
            id: e.id,
            name: e.name.trim(),
            sets: e.sets.trim() || undefined,
            reps: e.reps.trim() || undefined,
            notes: e.notes.trim() || undefined,
            day: e.day || undefined,
            order: index,
        }));

        try {
            setSaving(true);

            await updateRoutine(String(id), {
                title: title.trim(),
                notes: notes.trim() || undefined,
                // @ts-ignore
                exercises: normalizedExercises,
            });

            console.log("Rutina actualizada en backend");

            router.replace({
                pathname: "/routine/[id]",
                params: { id: String(id) },
            });
        } catch (err) {
            console.log("Error actualizando rutina:", err);
            Alert.alert(
                "Error",
                "No se pudieron guardar los cambios. Intenta de nuevo."
            );
        } finally {
            setSaving(false);
        }
    };

    // ---------- Render principal ----------
    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
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
                    {/* HEADER FIJO: LOGO + TÍTULO */}
                    <View className="px-2">
                        <AppHeader
                            showProfile={true}
                        />
                    </View>

                    <Text
                        className="ml-5 pl-1 text-md text-gray-500"
                    >
                        Editar rutina
                    </Text>

                    {/* ZONA CENTRAL: TARJETA CON SCROLL INTERNO */}
                    <View
                        style={{
                            borderWidth: 2,

                            borderColor:
                                COLORS.primary,

                            borderRadius: 22,

                            backgroundColor:
                                '#101010',

                            marginHorizontal: 8,

                            marginTop: 10,

                            flex: 1,

                            minHeight: 0,

                            overflow: 'hidden',

                            paddingHorizontal: 12,

                            paddingVertical: 16,
                        }}
                    >
                        {loading ? (

                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="large"
                                    color={COLORS.primary}
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        fontSize: 13,

                                        fontWeight: '900',

                                        marginTop: 10,
                                    }}
                                >
                                    Cargando tu rutina
                                </Text>

                                <Text
                                    style={{
                                        color:
                                            COLORS.textMuted,

                                        fontSize: 10,

                                        marginTop: 5,
                                    }}
                                >
                                    Preparando la edición...
                                </Text>
                            </View>

                        ) : error || !routine ? (

                            <View
                                style={{
                                    flex: 1,

                                    alignItems: 'center',

                                    justifyContent: 'center',

                                    paddingHorizontal: 20,
                                }}
                            >
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={36}
                                    color="#FF6B6B"
                                />

                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,

                                        textAlign: 'center',

                                        marginTop: 10,
                                    }}
                                >
                                    {error ??
                                        'Rutina no encontrada.'}
                                </Text>
                            </View>

                        ) : (

                            <>


                                {/* TÍTULO DE RUTINA */}

                                <View className="mb-3">
                                    <Text
                                        className="text-base font-semibold mb-1"
                                        style={{
                                            color: COLORS.textLight,
                                        }}
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

                                        placeholderTextColor={
                                            COLORS.textMuted
                                        }

                                        className="px-3 py-2 rounded-xl"

                                        style={{
                                            backgroundColor:
                                                '#111111',

                                            color:
                                                COLORS.textLight,

                                            borderWidth: 1,

                                            borderColor:
                                                '#333333',
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
                                        style={{
                                            color: COLORS.textLight,
                                        }}
                                    >
                                        Descripción:
                                    </Text>

                                    <TextInput
                                        value={notes}
                                        onChangeText={setNotes}

                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"

                                        placeholder="Notas generales de la rutina, frecuencia semanal, recomendaciones..."

                                        placeholderTextColor={
                                            COLORS.textMuted
                                        }

                                        className="px-3 py-2 rounded-xl text-sm"

                                        style={{
                                            backgroundColor:
                                                '#111111',

                                            color:
                                                COLORS.textLight,

                                            borderWidth: 1,

                                            borderColor:
                                                '#333333',
                                        }}
                                    />
                                </View>


                                <View
                                    className="my-3"
                                    style={{
                                        height: 1,
                                        backgroundColor:
                                            COLORS.textMuted,
                                    }}
                                />



                                {/* Cabecera de tabla de ejercicios */}
                                <View className="flex-row mb-2">

                                    <View className="flex-[4]">
                                        <Text
                                            className="font-semibold px-2"
                                            style={{
                                                color:
                                                    COLORS.textLight,
                                            }}
                                        >
                                            Ejercicios
                                        </Text>
                                    </View>

                                    <View className="flex-[2] items-center">
                                        <Text
                                            className="font-semibold"
                                            style={{
                                                color:
                                                    COLORS.textLight,
                                            }}
                                        >
                                            Series
                                        </Text>
                                    </View>

                                    <View className="flex-[2] items-center">
                                        <Text
                                            className="font-semibold"
                                            style={{
                                                color:
                                                    COLORS.textLight,
                                            }}
                                        >
                                            Reps
                                        </Text>
                                    </View>

                                    <View className="flex-[2] items-center">
                                        <Text
                                            className="font-semibold"
                                            style={{
                                                color:
                                                    COLORS.textLight,
                                            }}
                                        >
                                            Día
                                        </Text>
                                    </View>

                                </View>

                                {/* SCROLL SOLO DENTRO DEL CUADRANTE */}
                                <View style={{ flex: 1 }}>
                                    <ScrollView
                                        ref={exercisesScrollRef}
                                        className="no-scrollbar"
                                        showsVerticalScrollIndicator={false}
                                        nestedScrollEnabled
                                        keyboardShouldPersistTaps="handled"
                                        contentContainerStyle={{
                                            paddingBottom: 8,
                                        }}
                                    >
                                        {exercises.map((exercise, index) => {
                                            const isSelected =
                                                selectedRowIndex === index;

                                            return (
                                                <View
                                                    key={
                                                        exercise.id ??
                                                        index
                                                    }

                                                    className="mb-3 rounded-xl px-2 py-2"

                                                    style={{
                                                        borderWidth: 1,

                                                        borderColor:
                                                            isSelected
                                                                ? '#ff5555'
                                                                : '#333333',

                                                        backgroundColor:
                                                            isSelected
                                                                ? '#1a0000'
                                                                : '#111111',
                                                    }}
                                                >
                                                    {/* =============================== */}
                                                    {/* PRIMERA LÍNEA                  */}
                                                    {/* =============================== */}

                                                    <View className="flex-row items-center mb-1">

                                                        {/* NOMBRE */}

                                                        <View className="flex-[4] mr-1">
                                                            <TextInput
                                                                value={
                                                                    exercise.name
                                                                }

                                                                onChangeText={(text) =>
                                                                    handleChangeExercise(
                                                                        index,
                                                                        'name',
                                                                        text
                                                                    )
                                                                }

                                                                onFocus={() =>
                                                                    setSelectedRowIndex(
                                                                        index
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

                                                                    color:
                                                                        COLORS.textLight,

                                                                    borderWidth: 1,

                                                                    borderColor:
                                                                        '#333333',
                                                                }}
                                                            />
                                                        </View>


                                                        {/* SERIES */}

                                                        <View className="flex-[2] mx-1">
                                                            <TextInput
                                                                value={
                                                                    exercise.sets
                                                                }

                                                                onChangeText={(text) =>
                                                                    handleChangeExercise(
                                                                        index,
                                                                        'sets',
                                                                        text
                                                                    )
                                                                }

                                                                onFocus={() =>
                                                                    setSelectedRowIndex(
                                                                        index
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

                                                                    color:
                                                                        COLORS.textLight,

                                                                    borderWidth: 1,

                                                                    borderColor:
                                                                        '#333333',
                                                                }}
                                                            />
                                                        </View>


                                                        {/* REPETICIONES */}

                                                        <View className="flex-[2] mx-1">
                                                            <TextInput
                                                                value={
                                                                    exercise.reps
                                                                }

                                                                onChangeText={(text) =>
                                                                    handleChangeExercise(
                                                                        index,
                                                                        'reps',
                                                                        text
                                                                    )
                                                                }

                                                                onFocus={() =>
                                                                    setSelectedRowIndex(
                                                                        index
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

                                                                    color:
                                                                        COLORS.textLight,

                                                                    borderWidth: 1,

                                                                    borderColor:
                                                                        '#333333',
                                                                }}
                                                            />
                                                        </View>


                                                        {/* DÍA */}

                                                        <View
                                                            className="flex-[2] ml-1"
                                                            style={{
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Pressable
                                                                onPress={() => {
                                                                    setSelectedRowIndex(
                                                                        index
                                                                    );

                                                                    setOpenDayMenuIndex(
                                                                        index
                                                                    );

                                                                    setDayPickerVisible(
                                                                        true
                                                                    );
                                                                }}

                                                                style={{
                                                                    width: '100%',

                                                                    minWidth: 0,

                                                                    backgroundColor:
                                                                        '#111111',

                                                                    borderWidth: 1,

                                                                    borderColor:
                                                                        '#555555',

                                                                    borderRadius: 8,

                                                                    paddingVertical: 4,

                                                                    paddingHorizontal: 5,

                                                                    alignItems:
                                                                        'center',

                                                                    justifyContent:
                                                                        'center',

                                                                    overflow:
                                                                        'hidden',
                                                                }}
                                                            >
                                                                <Text
                                                                    numberOfLines={1}
                                                                    ellipsizeMode="tail"

                                                                    style={{
                                                                        width: '100%',

                                                                        color:
                                                                            exercise.day
                                                                                ? COLORS.textLight
                                                                                : COLORS.textMuted,

                                                                        fontSize: 14,

                                                                        textAlign:
                                                                            'center',

                                                                        flexShrink: 1,
                                                                    }}
                                                                >
                                                                    {exercise.day || 'Día'}
                                                                </Text>
                                                            </Pressable>
                                                        </View>

                                                    </View>


                                                    {/* =============================== */}
                                                    {/* SEGUNDA LÍNEA                  */}
                                                    {/* =============================== */}

                                                    <View className="flex-row items-center mt-1">

                                                        <View className="flex-1 mr-2">
                                                            <TextInput
                                                                value={
                                                                    exercise.notes
                                                                }

                                                                onChangeText={(text) =>
                                                                    handleChangeExercise(
                                                                        index,
                                                                        'notes',
                                                                        text
                                                                    )
                                                                }

                                                                onFocus={() =>
                                                                    setSelectedRowIndex(
                                                                        index
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

                                                                    color:
                                                                        COLORS.textLight,

                                                                    borderWidth: 1,

                                                                    borderColor:
                                                                        '#333333',
                                                                }}
                                                            />
                                                        </View>


                                                        {/* BORRAR */}

                                                        {isSelected && (
                                                            <Pressable
                                                                onPress={() =>
                                                                    askDeleteExercise(
                                                                        index
                                                                    )
                                                                }

                                                                style={{
                                                                    width: 28,
                                                                    height: 28,

                                                                    borderRadius:
                                                                        999,

                                                                    backgroundColor:
                                                                        '#ff5555',

                                                                    alignItems:
                                                                        'center',

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
                                                                    color="#FFFFFF"
                                                                />
                                                            </Pressable>
                                                        )}

                                                    </View>
                                                </View>
                                            );
                                        })}

                                    </ScrollView>
                                </View>
                            </>
                        )}
                    </View>

                    {/* BOTONES INFERIORES FIJOS (4 BOTONES) */}
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

                        <EditRoutineNavButton
                            onPress={
                                handleHomePress
                            }

                            disabled={saving}

                            icon={
                                <Ionicons
                                    name="home-outline"
                                    size={27}
                                    color="#FFFFFF"
                                />
                            }
                        />


                        {/* 2 — ATRÁS */}

                        <EditRoutineNavButton
                            onPress={
                                handleBackPress
                            }

                            disabled={saving}

                            icon={
                                <Ionicons
                                    name="arrow-back-outline"
                                    size={28}
                                    color="#FFFFFF"
                                />
                            }
                        />


                        {/* 3 — GUARDAR */}

                        <EditRoutineNavButton
                            onPress={() =>
                                setSaveModalVisible(true)
                            }

                            disabled={
                                saving ||
                                loading ||
                                !!error ||
                                !routine
                            }

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

                        <EditRoutineNavButton
                            onPress={
                                handleAddExercise
                            }

                            disabled={
                                saving ||
                                loading ||
                                !!error ||
                                !routine
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
            </KeyboardAvoidingView>

            {/* ========================================= */}
            {/* MODAL SELECTOR DE DÍA                    */}
            {/* ========================================= */}

            <Modal
                visible={
                    dayPickerVisible
                }

                transparent

                animationType="fade"

                onRequestClose={() => {
                    setDayPickerVisible(
                        false
                    );

                    setOpenDayMenuIndex(
                        null
                    );
                }}
            >
                <View
                    className="flex-1 items-center justify-center"

                    style={{
                        backgroundColor:
                            'rgba(0,0,0,0.6)',
                    }}
                >
                    <View
                        className="w-60 rounded-2xl p-4"

                        style={{
                            backgroundColor:
                                '#111111',

                            borderWidth: 1,

                            borderColor:
                                COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-base font-semibold mb-3 text-center"

                            style={{
                                color:
                                    COLORS.textLight,
                            }}
                        >
                            Selecciona un día
                        </Text>


                        <ScrollView
                            style={{
                                maxHeight: 250,
                            }}

                            showsVerticalScrollIndicator={
                                false
                            }
                        >
                            {DAY_OPTIONS.map(
                                (opt) => {

                                    const selectedDay =
                                        openDayMenuIndex !==
                                            null
                                            ? exercises[
                                                openDayMenuIndex
                                            ]?.day
                                            : '';

                                    return (
                                        <Pressable
                                            key={opt}

                                            onPress={() => {
                                                if (
                                                    openDayMenuIndex !==
                                                    null
                                                ) {
                                                    handleChangeExercise(
                                                        openDayMenuIndex,
                                                        'day',
                                                        opt
                                                    );
                                                }

                                                setDayPickerVisible(
                                                    false
                                                );

                                                setOpenDayMenuIndex(
                                                    null
                                                );
                                            }}

                                            className="py-2 rounded-lg mb-2 mx-8"

                                            style={{
                                                backgroundColor:
                                                    selectedDay ===
                                                        opt
                                                        ? '#1f3d1f'
                                                        : '#1a1a1a',

                                                borderWidth: 1,

                                                borderColor:
                                                    selectedDay ===
                                                        opt
                                                        ? COLORS.primary
                                                        : '#333333',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        selectedDay ===
                                                            opt
                                                            ? COLORS.primary
                                                            : COLORS.textLight,

                                                    fontSize: 14,

                                                    textAlign:
                                                        'center',
                                                }}
                                            >
                                                {opt}
                                            </Text>
                                        </Pressable>
                                    );
                                }
                            )}
                        </ScrollView>


                        <Pressable
                            onPress={() => {
                                setDayPickerVisible(
                                    false
                                );

                                setOpenDayMenuIndex(
                                    null
                                );
                            }}

                            className="mt-3 py-3 rounded-full items-center justify-center"

                            style={{
                                backgroundColor:
                                    '#333333',
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        COLORS.textLight,

                                    fontWeight:
                                        '600',
                                }}
                            >
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* MODAL CONFIRMAR ELIMINAR EJERCICIO (igual que antes) */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDelete}
            >
                <View className="flex-1 items-center justify-center bg-black/60">
                    <View
                        className="w-72 rounded-2xl p-4"
                        style={{
                            backgroundColor: "#111111",
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-[16px] font-semibold mb-2"
                            style={{ color: COLORS.textLight }}
                        >
                            ¿Eliminar ejercicio?
                        </Text>
                        <Text
                            className="text-[13px] mb-4"
                            style={{ color: COLORS.textMuted }}
                        >
                            Esta acción no se puede deshacer.
                        </Text>

                        <View className="flex-row justify-between">
                            <Pressable
                                onPress={handleCancelDelete}
                                className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                                style={{ backgroundColor: "#444444" }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleDeleteExercise}
                                className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                                style={{ backgroundColor: "#FF4D4D" }}
                            >
                                <Text
                                    className="text-[14px] font-semibold"
                                    style={{ color: "#111111" }}
                                >
                                    Eliminar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={homeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setHomeModalVisible(false)
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
                        <Text
                            className="text-base font-semibold mb-2 text-center"
                            style={{
                                color:
                                    COLORS.textLight,
                            }}
                        >
                            ¿Volver al menú principal?
                        </Text>

                        <Text
                            className="text-xs text-center mb-4"
                            style={{
                                color:
                                    COLORS.textMuted,
                            }}
                        >
                            Hay cambios en esta rutina que todavía no fueron guardados.
                        </Text>

                        <View className="flex-row">
                            <Pressable
                                onPress={() =>
                                    setHomeModalVisible(
                                        false
                                    )
                                }
                                className="flex-1 mr-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        '#333333',
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setHomeModalVisible(
                                        false
                                    );

                                    router.replace(
                                        '/home'
                                    );
                                }}
                                className="flex-1 ml-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        COLORS.primary,
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
                                    Ir al home
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={backModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setBackModalVisible(false)
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
                        <Text
                            className="text-base font-semibold mb-2 text-center"
                            style={{
                                color:
                                    COLORS.textLight,
                            }}
                        >
                            ¿Volver a la rutina?
                        </Text>

                        <Text
                            className="text-xs text-center mb-4"
                            style={{
                                color:
                                    COLORS.textMuted,
                            }}
                        >
                            Los cambios realizados en esta edición se perderán.
                        </Text>

                        <View className="flex-row">
                            <Pressable
                                onPress={() =>
                                    setBackModalVisible(
                                        false
                                    )
                                }
                                className="flex-1 mr-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        '#333333',
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setBackModalVisible(
                                        false
                                    );

                                    handleCancel();
                                }}
                                className="flex-1 ml-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        COLORS.primary,
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
                                    Volver
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={saveModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setSaveModalVisible(false)
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
                        <Text
                            className="text-base font-semibold mb-2 text-center"
                            style={{
                                color:
                                    COLORS.textLight,
                            }}
                        >
                            ¿Guardar los cambios?
                        </Text>

                        <Text
                            className="text-xs text-center mb-4"
                            style={{
                                color:
                                    COLORS.textMuted,
                            }}
                        >
                            Se actualizará esta rutina con la información actual.
                        </Text>

                        <View className="flex-row">
                            <Pressable
                                onPress={() =>
                                    setSaveModalVisible(
                                        false
                                    )
                                }
                                className="flex-1 mr-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        '#333333',
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            COLORS.textLight,
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={saving}
                                onPress={async () => {
                                    setSaveModalVisible(
                                        false
                                    );

                                    await handleSave();
                                }}
                                className="flex-1 ml-2 py-2 rounded-full items-center"
                                style={{
                                    backgroundColor:
                                        COLORS.primary,
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
                                    Guardar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );

}


