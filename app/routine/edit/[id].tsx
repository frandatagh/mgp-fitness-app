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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { COLORS } from "../../../constants/colors";
import { useAuth } from "../../../context/AuthContext";
import { getRoutine, updateRoutine, Routine } from "../../../lib/routines";

export default function EditRoutineScreen() {
    const { isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [routine, setRoutine] = useState<Routine | null>(null);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    // Cargar la rutina actual
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

        try {
            setSaving(true);

            const updated = await updateRoutine(String(id), {
                title: title.trim(),
                notes: notes.trim() || undefined,
            });

            console.log("Rutina actualizada en backend:", updated);

            // En lugar de Alert, vamos directo al detalle
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

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <ScrollView
                className="flex-1 px-4 pt-6 pb-4"
                showsVerticalScrollIndicator={false}
            >
                <View className="items-center mb-4">
                    <Text className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        Editar rutina
                    </Text>
                </View>

                {/* Tarjeta de edición */}
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
                            minHeight: 120,
                            backgroundColor: "#111111",
                            color: COLORS.textLight,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    />
                </View>

                {/* Botones inferiores */}
                <View className="mt-6 flex-row justify-between">
                    <Pressable
                        onPress={handleSave}
                        disabled={saving}
                        className="flex-1 mr-2 bg-lime-400 rounded-full py-2 items-center justify-center"
                    >
                        <Text className="text-[14px] font-semibold text-black">
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleCancel}
                        className="flex-1 ml-2 bg-neutral-700 rounded-full py-2 items-center justify-center"
                    >
                        <Text className="text-[14px] font-semibold text-gray-100">
                            Cancelar
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
