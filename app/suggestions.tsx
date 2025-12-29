// app/suggestions.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { Routine, getSuggestedRoutines } from "../lib/routines";
import { RoutineCard } from "../components/RoutineCard";

export default function SuggestionsScreen() {
    const { isAuthenticated, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [routines, setRoutines] = useState<Routine[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                setError(null);
                setLoading(true);
                const data = await getSuggestedRoutines();
                setRoutines(data);
            } catch (err) {
                console.error(err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudieron cargar las sugerencias"
                );
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-4  w-full"
                style={{ maxWidth: 800, alignSelf: "center" }}
            >
                {/* Logo */}
                <View className="items-center">
                    <Image
                        source={require("../assets/img/iconhome.png")}
                        style={{ width: 110, height: 110, resizeMode: "contain" }}
                    />
                </View>

                {/* Título */}
                <View className="self-start px-3 mb-1">
                    <Text className="text-md text-gray-500">
                        Sugerencias para {user?.name ?? "tu entrenamiento"}
                    </Text>
                </View>

                {/* Cuadrante verde */}
                <View
                    className="flex-1 mt-2 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text
                            className="text-[13px] mb-3"
                            style={{ color: COLORS.textMuted }}
                        >
                            Aquí encontrarás rutinas recomendadas listas para usar. Explora
                            las opciones, revisa los detalles y copia la rutina que más se
                            adapte a tus objetivos.
                        </Text>

                        {loading && (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        )}

                        {error && (
                            <Text
                                className="text-[13px] mt-2"
                                style={{ color: "#FFBABA" }}
                            >
                                {error}
                            </Text>
                        )}

                        {!loading &&
                            !error &&
                            routines.map((routine) => (
                                <RoutineCard
                                    key={routine.id}
                                    title={routine.title}
                                    description={routine.notes}
                                    highlighted={false}
                                    exercisesPreview={routine.exercises ?? []}
                                    onOpen={() =>
                                        router.push({
                                            pathname: "/suggestions/[id]",
                                            params: { id: routine.id },
                                        })
                                    }
                                    onEdit={() => {
                                        // en sugerencias no se edita
                                        console.log("Editar rutina sugerida (no disponible)");
                                    }}
                                    onDelete={() => {
                                        // no se elimina una sugerida desde aquí
                                        return;
                                    }}
                                    onShare={() => {
                                        console.log("Compartir sugerencia", routine.id);
                                    }}
                                />
                            ))}
                    </ScrollView>

                </View>
                {/* Botón inferior para volver al home */}
                <View className="mt-3 flex-row justify-center">
                    <Pressable
                        className="px-6 py-3 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                        onPress={() => router.replace('/home')}
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver al inicio
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
