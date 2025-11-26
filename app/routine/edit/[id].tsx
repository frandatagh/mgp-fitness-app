// app/routine/edit/[id].tsx
import React, { useEffect, useState } from "react";
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
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

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

    // modal para borrar ejercicio
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
        null
    );

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

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

                const loadedExercises: RoutineExercise[] = data.exercises ?? [];

                if (loadedExercises.length > 0) {
                    setExercises(
                        loadedExercises
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .map((ex) => ({
                                id: ex.id,
                                name: ex.name ?? "",
                                sets: ex.sets ?? "",
                                reps: ex.reps ?? "",
                                notes: ex.notes ?? "",
                                day: (ex.day as DayOption | null) ?? "",
                            }))
                    );
                } else {
                    // si no hay ejercicios, arrancamos con algunas filas vacías
                    setExercises([EMPTY_EXERCISE, EMPTY_EXERCISE, EMPTY_EXERCISE]);
                }

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
        setExercises((prev) => [...prev, EMPTY_EXERCISE]);
        setSelectedRowIndex(exercises.length); // seleccionamos el nuevo
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

    const handleSave = async () => {
        if (!id) {
            Alert.alert("Error", "No se encontró el ID de la rutina.");
            return;
        }

        if (!title.trim()) {
            Alert.alert("Título requerido", "La rutina debe tener un título.");
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

            // IMPORTANTE: para que esto funcione, hay que permitir "exercises"
            // en el payload de updateRoutine en lib/routines.ts (te lo explico abajo).
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

    // ---------- Render estados de carga / error ----------

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
                    {error ?? "Rutina no encontrada."}
                </Text>
                <Pressable
                    onPress={handleCancel}
                    className="px-4 py-3 rounded-xl"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text style={{ color: "#111111", fontWeight: "600" }}>Volver</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

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
                <ScrollView
                    className="flex-1 px-4 pt-1 pb-4"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxWidth: 800, alignSelf: 'center' }}
                >

                    {/* LOGO + TÍTULO SUPERIOR */}
                    <View className="mb-2">
                        {/* Logo centrado */}
                        <View className="items-center">
                            <Image
                                source={require('../../../assets/img/iconmgp.png')}
                                style={{
                                    width: 130,        // ajustá a gusto
                                    height: 80,
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
                                Editar rutina
                            </Text>
                        </View>
                    </View>

                    {/* Tarjeta principal */}
                    <View
                        className="rounded-3xl px-3 py-4"
                        style={{ borderWidth: 2, borderColor: COLORS.primary }}
                    >
                        {/* Título */}
                        <Text
                            className="mb-2 text-[13px]"
                            style={{ color: COLORS.textMuted }}
                        >
                            Título de rutina
                        </Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Título de la rutina"
                            placeholderTextColor="#666"
                            className="rounded-xl px-3 py-2 text-[14px]"
                            style={{
                                backgroundColor: "#111111",
                                color: COLORS.textLight,
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        />

                        {/* Descripción */}
                        <Text
                            className="mt-4 mb-2 text-[13px]"
                            style={{ color: COLORS.textMuted }}
                        >
                            Descripción / notas
                        </Text>
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Notas o descripción general de la rutina"
                            placeholderTextColor="#666"
                            multiline
                            textAlignVertical="top"
                            className="rounded-xl px-3 py-2 text-[14px]"
                            style={{
                                minHeight: 80,
                                backgroundColor: "#111111",
                                color: COLORS.textLight,
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                            }}
                        />

                        {/* Separador */}
                        <View
                            className="my-4"
                            style={{ height: 1, backgroundColor: COLORS.textMuted }}
                        />

                        {/* Cabecera de tabla de ejercicios */}
                        <View className="flex-row mb-2">
                            <View className="flex-[4]">
                                <Text
                                    className="font-semibold text-[12px]"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Ejercicios.
                                </Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text
                                    className="font-semibold text-[12px]"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Series.
                                </Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text
                                    className="font-semibold text-[12px]"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Reps.
                                </Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text
                                    className="font-semibold text-[12px]"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Día
                                </Text>
                            </View>
                        </View>

                        {/* Filas de ejercicios */}
                        {exercises.map((exercise, index) => {
                            const isSelected = selectedRowIndex === index;

                            return (
                                <View key={exercise.id ?? index} className="mb-2">
                                    <Pressable
                                        onPress={() => setSelectedRowIndex(index)}
                                        style={{
                                            borderRadius: 10,
                                            paddingVertical: 4,
                                            paddingHorizontal: 4,
                                            borderWidth: 1,
                                            borderColor: isSelected ? "#ff4d4d" : "#333333",
                                            backgroundColor: isSelected ? "#1b1010" : "transparent",
                                        }}
                                    >
                                        {/* Fila principal: nombre / series / reps / día */}
                                        <View className="flex-row items-center mb-1">
                                            {/* Nombre */}
                                            <View className="flex-[4] mr-1">
                                                <TextInput
                                                    value={exercise.name}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, "name", text)
                                                    }
                                                    onFocus={() => setSelectedRowIndex(index)}
                                                    placeholder="Press banca"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-xs"
                                                    style={{
                                                        backgroundColor: "#111111",
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: "#333333",
                                                    }}
                                                />
                                            </View>

                                            {/* Series */}
                                            <View className="flex-[2] mx-1">
                                                <TextInput
                                                    value={exercise.sets}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, "sets", text)
                                                    }
                                                    onFocus={() => setSelectedRowIndex(index)}
                                                    keyboardType="numeric"
                                                    placeholder="3"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-xs text-center"
                                                    style={{
                                                        backgroundColor: "#111111",
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: "#333333",
                                                    }}
                                                />
                                            </View>

                                            {/* Reps */}
                                            <View className="flex-[2] mx-1">
                                                <TextInput
                                                    value={exercise.reps}
                                                    onChangeText={(text) =>
                                                        handleChangeExercise(index, "reps", text)
                                                    }
                                                    onFocus={() => setSelectedRowIndex(index)}
                                                    keyboardType="numeric"
                                                    placeholder="10"
                                                    placeholderTextColor={COLORS.textMuted}
                                                    className="px-2 py-1 rounded-lg text-xs text-center"
                                                    style={{
                                                        backgroundColor: "#111111",
                                                        color: COLORS.textLight,
                                                        borderWidth: 1,
                                                        borderColor: "#333333",
                                                    }}
                                                />
                                            </View>

                                            {/* Día: botón + menú flotante */}
                                            <View className="flex-[2]">
                                                <Pressable
                                                    onPress={() =>
                                                        setOpenDayMenuIndex(
                                                            openDayMenuIndex === index ? null : index
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor: "#111111",
                                                        borderWidth: 1,
                                                        borderColor: "#555555",
                                                        borderRadius: 8,
                                                        height: 30,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: exercise.day
                                                                ? COLORS.textLight
                                                                : COLORS.textMuted,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {exercise.day || "Día"}
                                                    </Text>
                                                </Pressable>

                                                {/* Menú flotante de días */}
                                                {openDayMenuIndex === index && (
                                                    <View
                                                        className="absolute"
                                                        style={{
                                                            top: 36,
                                                            right: 0,
                                                            backgroundColor: "#111111",
                                                            borderWidth: 1,
                                                            borderColor: "#555555",
                                                            borderRadius: 8,
                                                            width: 110,
                                                            zIndex: 999,
                                                            elevation: 10,
                                                        }}
                                                    >
                                                        <ScrollView
                                                            style={{ maxHeight: 150 }}
                                                            contentContainerStyle={{ paddingVertical: 4 }}
                                                            nestedScrollEnabled
                                                            keyboardShouldPersistTaps="handled"
                                                            showsVerticalScrollIndicator={false}
                                                        >
                                                            {DAY_OPTIONS.map((opt) => (
                                                                <Pressable
                                                                    key={opt}
                                                                    onPress={() => {
                                                                        handleChangeExercise(index, "day", opt);
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
                                        </View>

                                        {/* Segunda fila: Notas + botón eliminar */}
                                        <View className="flex-row items-center mt-1">
                                            <Text
                                                className="text-[10px] mr-1"
                                                style={{ color: COLORS.textMuted }}
                                            >
                                                Notas:
                                            </Text>
                                            <TextInput
                                                value={exercise.notes}
                                                onChangeText={(text) =>
                                                    handleChangeExercise(index, "notes", text)
                                                }
                                                onFocus={() => setSelectedRowIndex(index)}
                                                placeholder="Tempo, técnica, rango, etc."
                                                placeholderTextColor={COLORS.textMuted}
                                                className="px-2 py-1 rounded-lg text-[11px] flex-1"
                                                style={{
                                                    backgroundColor: "#111111",
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: "#333333",
                                                }}
                                            />

                                            {/* Botón eliminar solo cuando la fila está seleccionada */}
                                            {isSelected && (
                                                <Pressable
                                                    onPress={() => askDeleteExercise(index)}
                                                    style={{
                                                        marginLeft: 6,
                                                        paddingHorizontal: 4,
                                                        paddingVertical: 4,
                                                    }}
                                                >
                                                    <MaterialIcons
                                                        name="delete-outline"
                                                        size={18}
                                                        color="#FFBABA"
                                                    />
                                                </Pressable>
                                            )}
                                        </View>
                                    </Pressable>
                                </View>
                            );
                        })}

                        {/* Botón "Añadir ejercicio" dentro de la tarjeta (opcional) */}
                        <View className="mt-3">
                            <Pressable
                                onPress={handleAddExercise}
                                className="rounded-full py-2 items-center justify-center"
                                style={{ backgroundColor: COLORS.primary }}
                            >
                                <Text
                                    className="text-[13px] font-semibold"
                                    style={{ color: "#111111" }}
                                >
                                    + Añadir ejercicio
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Botones inferiores */}
                    <View className="mt-6 flex-row justify-between">
                        <Pressable
                            onPress={handleCancel}
                            className="flex-1 mr-2 rounded-full py-2 items-center justify-center"
                            style={{ backgroundColor: "#444444" }}
                        >
                            <Text className="text-[14px] font-semibold text-gray-100">
                                Volver atrás
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            className="flex-1 ml-2 rounded-full py-2 items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Text className="text-[14px] font-semibold text-black">
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal de confirmación para borrar ejercicio */}
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
        </SafeAreaView>
    );
}
