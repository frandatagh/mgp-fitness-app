// components/RoutineCard.tsx
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../constants/colors';
import type { RoutineExercise } from '../lib/routines';

type RoutineCardProps = {
    title: string;
    description?: string | null;
    highlighted?: boolean;
    exercisesPreview?: RoutineExercise[];

    // acciones desde el Home
    onOpen?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
};

export const RoutineCard: React.FC<RoutineCardProps> = ({
    title,
    description,
    highlighted = false,
    exercisesPreview = [],
    onOpen,
    onEdit,
    onDelete,
    onShare,
}) => {
    const [menuVisible, setMenuVisible] = useState(false);

    const handleOpen = () => {
        setMenuVisible(false);
        onOpen && onOpen();
    };

    const handleEdit = () => {
        setMenuVisible(false);
        onEdit && onEdit();
    };

    const handleDelete = () => {
        setMenuVisible(false);
        onDelete && onDelete();
    };

    const handleShare = () => {
        setMenuVisible(false);
        onShare && onShare();
    };

    return (
        <Pressable
            onPress={handleOpen}
            className="mb-3 rounded-2xl"
            style={{
                borderWidth: 1,
                borderColor: highlighted ? COLORS.primary : '#555555',
                backgroundColor: '#111111',
                paddingHorizontal: 12,
                paddingVertical: 10,
            }}
        >
            {/* FILA SUPERIOR: título + botón menú */}
            <View className="flex-row justify-between items-center mb-1">
                <Text
                    className="text-[15px] font-semibold"
                    style={{ color: COLORS.textLight }}
                    numberOfLines={1}
                >
                    {title}
                </Text>

                {/* Botón tres puntos */}
                <Pressable
                    onPress={() => setMenuVisible(prev => !prev)}
                    className="w-7 h-4 rounded-full items-center justify-center"
                    style={{
                        backgroundColor: highlighted ? COLORS.primary : '#222222',
                        borderWidth: 1,
                        borderColor: highlighted ? COLORS.primary : COLORS.textMuted,
                    }}
                >
                    <Text
                        className="text-[20px]"
                        style={{ color: highlighted ? '#111111' : COLORS.textLight }}
                    >
                        ⋯
                    </Text>
                </Pressable>
            </View>

            {/* Descripción */}
            {description && (
                <Text
                    className="text-[12px] mb-2"
                    style={{ color: COLORS.textMuted }}
                    numberOfLines={2}
                >
                    {description}
                </Text>
            )}

            {/* Preview de hasta 3 ejercicios */}
            {exercisesPreview.length > 0 && (
                <View className="mt-1">
                    {exercisesPreview.slice(0, 3).map((ex, idx) => (
                        <Text
                            key={ex.id ?? idx}
                            className="text-[11px]"
                            style={{ color: COLORS.textLight }}
                            numberOfLines={1}
                        >
                            • {ex.name}
                        </Text>
                    ))}

                    {exercisesPreview.length > 3 && (
                        <Text className="text-[10px]" style={{ color: COLORS.textMuted }}>
                            + {exercisesPreview.length - 3} ejercicios más
                        </Text>
                    )}
                </View>
            )}

            {/* ETIQUETA "VISTO RECIENTEMENTE" – abajo a la derecha */}
            {highlighted && (
                <View className="mt-3 flex-row justify-end">
                    <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: COLORS.primary }}
                    >
                        <Text
                            className="text-[10px] font-semibold"
                            style={{ color: '#111111' }}
                        >
                            Visto recientemente
                        </Text>
                    </View>
                </View>
            )}

            {/* MENÚ DESPLEGABLE DEL BOTÓN '...' */}
            {menuVisible && (
                <View
                    className="absolute rounded-xl"
                    style={{
                        top: 6,
                        right: 6,
                        backgroundColor: '#111111',
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                        paddingVertical: 4,
                        width: 150,
                        zIndex: 20,
                        alignSelf: 'flex-start', // ayuda a que no se corte en tarjetas bajitas
                    }}
                >
                    <Pressable
                        className="px-3 py-2"
                        onPress={() => {
                            setMenuVisible(false);
                            handleOpen();
                        }}
                    >
                        <Text className="text-[12px]" style={{ color: COLORS.textLight }}>
                            Abrir
                        </Text>
                    </Pressable>

                    <Pressable
                        className="px-3 py-2 border-t border-neutral-800"
                        onPress={() => {
                            setMenuVisible(false);
                            handleEdit();
                        }}
                    >
                        <Text className="text-[12px]" style={{ color: COLORS.textLight }}>
                            Editar rutina
                        </Text>
                    </Pressable>

                    <Pressable
                        className="px-3 py-2 border-t border-neutral-800"
                        onPress={() => {
                            setMenuVisible(false);
                            handleDelete();
                        }}
                    >
                        <Text className="text-[12px]" style={{ color: '#FFBABA' }}>
                            Borrar rutina
                        </Text>
                    </Pressable>

                    <Pressable
                        className="px-3 py-2 border-t border-neutral-800"
                        onPress={() => {
                            setMenuVisible(false);
                            handleShare();
                        }}
                    >
                        <Text className="text-[12px]" style={{ color: COLORS.textLight }}>
                            Exportar / Compartir
                        </Text>
                    </Pressable>
                </View>
            )}
        </Pressable>
    );


};
