// components/RoutineCard.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import type { RoutineExercise } from '../lib/routines';

type RoutineCardProps = {
    title: string;
    description?: string | null;
    highlighted?: boolean;
    exercisesPreview?: RoutineExercise[] | null;
    isRecent?: boolean;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => Promise<void> | void; // se llama al backend
    onShare: () => void;
};

export const RoutineCard: React.FC<RoutineCardProps> = ({
    title,
    description,
    highlighted,
    exercisesPreview,
    isRecent,
    onOpen,
    onEdit,
    onDelete,
    onShare,
}) => {
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleOpenOptions = () => {
        setOptionsVisible(true);
    };

    const handleCloseOptions = () => {
        setOptionsVisible(false);
    };

    const handleAskDelete = () => {
        // cerrar el menú y abrir confirmación
        setOptionsVisible(false);
        setConfirmVisible(true);
    };

    const handleCancelDelete = () => {
        setConfirmVisible(false);
    };

    const handleConfirmDelete = async () => {
        try {
            setDeleting(true);
            await onDelete(); // 🔥 llama a handleDeleteRoutine del Home
            setConfirmVisible(false); // cerrar modal si todo fue bien
        } catch (error) {
            console.error('Error eliminando rutina', error);
        } finally {
            setDeleting(false);
        }
    };

    const exerciseCount = exercisesPreview?.length ?? 0;

    // Tomamos solo los dos primeros ejercicios para mostrar en la tarjeta
    const firstExercises = useMemo(
        () => (exercisesPreview ?? []).slice(0, 3),
        [exercisesPreview]
    );

    return (
        <>
            {/* TARJETA */}
            <Pressable
                className="mb-3 rounded-2xl p-3"
                style={{
                    backgroundColor: '#1A1A1A',
                    borderWidth: highlighted ? 2 : 1,
                    borderColor: highlighted ? COLORS.primary : '#333333',
                }}
                onPress={onOpen}
            >
                <View className="flex-row justify-between items-start">
                    {/* Contenido izquierdo: título, descripción y preview de ejercicios */}
                    <View className="flex-1 pr-2">
                        {/* Título */}
                        <Text
                            className="text-base font-semibold"
                            style={{ color: COLORS.textLight }}
                            numberOfLines={1}
                        >
                            {title}
                        </Text>

                        {/* Descripción corta de la rutina */}
                        {description ? (
                            <Text
                                className="text-xs mt-1"
                                style={{ color: COLORS.textMuted }}
                                numberOfLines={3}
                            >
                                {description}
                            </Text>
                        ) : null}

                        {/* Preview de ejercicios (máx. 3) */}
                        {firstExercises.length > 0 && (
                            <View className="mt-2">
                                {firstExercises.map((ex, index) => (
                                    <View
                                        key={ex.id ?? index}
                                        className="flex-row justify-between items-center mb-1"
                                    >
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textLight }}
                                            numberOfLines={1}
                                        >
                                            . {ex.name}
                                        </Text>


                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Total de ejercicios */}
                        {exerciseCount > 0 && (
                            <Text
                                className="text-[11px] mt-2"
                                style={{ color: COLORS.textMuted }}
                            >
                                {exerciseCount} ejercicio
                                {exerciseCount !== 1 && 's'} en total
                            </Text>
                        )}
                    </View>

                    {/* Botón de opciones (tres puntos) */}
                    <Pressable
                        className="p-1 rounded-full"
                        hitSlop={10}
                        onPress={(e) => {
                            e.stopPropagation(); // para que no dispare onOpen
                            handleOpenOptions();
                        }}
                    >
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={18}
                            color={COLORS.textLight}
                        />
                    </Pressable>
                </View>
                {isRecent && (
                    <View className="mt-2 flex-row justify-end">
                        <Text
                            className="text-[10px] font-semibold"
                            style={{ color: COLORS.primary }}
                        >
                            Actividad reciente
                        </Text>
                    </View>
                )}

            </Pressable>

            {/* MODAL DE OPCIONES */}
            <Modal
                visible={optionsVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseOptions}
            >
                <View
                    className="flex-1 justify-center items-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    {/* Cerrar al tocar fuera */}
                    <Pressable
                        className="absolute inset-0"
                        onPress={handleCloseOptions}
                    />

                    <View
                        className="w-11/12 max-w-xs rounded-2xl p-4"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-center text-base font-semibold mb-3"
                            style={{ color: COLORS.textLight }}
                        >
                            Opciones de rutina
                        </Text>

                        <Pressable
                            className="py-2"
                            onPress={() => {
                                handleCloseOptions();
                                onOpen();
                            }}
                        >
                            <Text style={{ color: COLORS.textLight }}>Ver rutina</Text>
                        </Pressable>

                        <Pressable
                            className="py-2"
                            onPress={() => {
                                handleCloseOptions();
                                onEdit();
                            }}
                        >
                            <Text style={{ color: COLORS.textLight }}>Editar rutina</Text>
                        </Pressable>

                        <Pressable
                            className="py-2"
                            onPress={() => {
                                handleCloseOptions();
                                onShare();
                            }}
                        >
                            <Text style={{ color: COLORS.textLight }}>
                                Compartir / exportar
                            </Text>
                        </Pressable>

                        <View
                            className="h-px my-2"
                            style={{ backgroundColor: COLORS.textMuted }}
                        />

                        <Pressable className="py-2" onPress={handleAskDelete}>
                            <Text
                                style={{
                                    color: '#FFBABA',
                                    fontWeight: '600',
                                }}
                            >
                                Eliminar rutina
                            </Text>
                        </Pressable>

                        <Pressable
                            className="mt-3 py-2 items-center"
                            onPress={handleCloseOptions}
                        >
                            <Text style={{ color: COLORS.textMuted }}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
            <Modal
                visible={confirmVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDelete}
            >
                <View
                    className="flex-1 justify-center items-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                    <View
                        className="w-11/12 max-w-xs rounded-2xl p-4"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-center text-base font-semibold mb-1"
                            style={{ color: COLORS.textLight }}
                        >
                            ¿Eliminar rutina?
                        </Text>
                        <Text
                            className="text-center text-xs mb-4"
                            style={{ color: COLORS.textMuted }}
                        >
                            Esta acción no se puede deshacer.
                        </Text>

                        <View className="flex-row justify-center mt-1">
                            <Pressable
                                className="px-4 py-2 rounded-full mr-2 border"
                                style={{
                                    borderColor: COLORS.textLight,
                                    backgroundColor: '#222222',
                                }}
                                onPress={handleCancelDelete}
                                disabled={deleting}
                            >
                                <Text style={{ color: COLORS.textLight }}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                className="px-4 py-2 rounded-full"
                                style={{ backgroundColor: '#FF4B4B' }}
                                onPress={handleConfirmDelete}
                                disabled={deleting}
                            >
                                <Text
                                    style={{
                                        color: 'white',
                                        fontWeight: '600',
                                    }}
                                >
                                    {deleting ? 'Eliminando...' : 'Eliminar'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};
