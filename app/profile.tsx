import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    const [goalText, setGoalText] = useState(
        'Mejorar mi constancia semanal, ganar fuerza progresivamente y mantener una rutina equilibrada.'
    );
    const [isEditingGoal, setIsEditingGoal] = useState(false);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const displayName = user?.name ?? 'Tu nombre';
    const email = user?.email ?? 'correo@ejemplo.com';

    const initials = useMemo(() => {
        return (
            displayName
                .split(' ')
                .filter(Boolean)
                .map(word => word[0]?.toUpperCase())
                .join('')
                .slice(0, 2) || 'U'
        );
    }, [displayName]);

    const handleBack = () => {
        router.replace('/home');
    };

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                {/* LOGO SUPERIOR */}
                <View className="items-center mb-2">
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 85, height: 85, resizeMode: 'contain' }}
                    />
                </View>

                {/* TÍTULO */}
                <View className="self-start px-4 mb-3">
                    <Text className="text-md text-gray-500">
                        Perfil de usuario
                    </Text>
                </View>

                {/* PANEL PRINCIPAL */}
                <View
                    className="flex-1 rounded-3xl px-3 py-4"
                    style={{ borderWidth: 2, borderColor: COLORS.primary }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="px-2"
                    >
                        {/* DATOS DEL PERFIL */}
                        <View className="mb-4">
                            <View
                                className="rounded-2xl px-2 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                {/* Cabecera */}
                                <View className="flex-row items-center mb-4">
                                    <View
                                        className="w-16 h-16 rounded-full items-center justify-center mr-4"
                                        style={{ backgroundColor: COLORS.primary }}
                                    >
                                        <Text
                                            className="text-[20px] font-bold"
                                            style={{ color: '#111111' }}
                                        >
                                            {initials}
                                        </Text>
                                    </View>

                                    <View className="flex-1">
                                        <Text
                                            className="text-[16px] font-semibold"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            {displayName}
                                        </Text>
                                        <Text
                                            className="text-[13px] mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            {email}
                                        </Text>
                                        <Text
                                            className="text-[12px] font-medium mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            fecha de creación: 01/01/2024
                                        </Text>
                                    </View>
                                </View>

                                {/* Peso / Altura / Plan en horizontal */}
                                <View className="flex-row justify-between mb-4">
                                    <View className="flex-1 mr-2">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Peso
                                        </Text>
                                        <Text
                                            className="text-[14px] mt-1"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            80kg
                                        </Text>
                                    </View>

                                    <View className="flex-1 mx-2">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Altura
                                        </Text>
                                        <Text
                                            className="text-[14px] mt-1"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            175cm
                                        </Text>
                                    </View>

                                    <View className="flex-1 ml-2">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Plan
                                        </Text>
                                        <Text
                                            className="text-[14px] mt-1"
                                            style={{ color: COLORS.textLight }}
                                        >
                                            Estandar
                                        </Text>
                                    </View>
                                </View>

                                {/* Kilómetros */}
                                <View>
                                    <Text
                                        className="text-[12px] font-semibold"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Total kilómetros recorridos por semana
                                    </Text>
                                    <Text
                                        className="text-[14px] mt-1"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Próximamente disponible
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* TU OBJETIVO */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold px-2"
                                style={{ color: COLORS.accent }}
                            >
                                Tu objetivo
                            </Text>

                            <View
                                className="rounded-2xl px-2 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[13px] mb-2"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Escribe aquí tus objetivos actuales de entrenamiento.
                                </Text>

                                <TextInput
                                    value={goalText}
                                    onChangeText={setGoalText}
                                    editable={isEditingGoal}
                                    multiline
                                    textAlignVertical="top"
                                    placeholder="Ejemplo: mejorar mi resistencia, ganar masa muscular, entrenar 3 veces por semana..."
                                    placeholderTextColor={COLORS.textMuted}
                                    className="rounded-xl px-3 py-3"
                                    style={{
                                        minHeight: 110,
                                        backgroundColor: '#1A1A1A',
                                        color: COLORS.textLight,
                                        borderWidth: 1,
                                        borderColor: '#2F2F2F',
                                    }}
                                />

                                <View className="mt-3">
                                    <Pressable
                                        onPress={() => setIsEditingGoal(prev => !prev)}
                                        className="px-4 py-3 rounded-xl items-center justify-center"
                                        style={{
                                            backgroundColor: isEditingGoal ? COLORS.primary : '#444444',
                                        }}
                                    >
                                        <Text
                                            className="text-[14px] font-semibold"
                                            style={{
                                                color: isEditingGoal ? '#111111' : COLORS.textLight,
                                            }}
                                        >
                                            {isEditingGoal ? 'Guardar objetivo' : 'Editar objetivo'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        {/* TUS ESTADÍSTICAS */}
                        <View className="mb-4">
                            <Text
                                className="text-[15px] font-semibold px-2 "
                                style={{ color: COLORS.accent }}
                            >
                                Tus estadísticas
                            </Text>

                            <View
                                className="rounded-2xl px-2 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <View
                                    className="rounded-xl"
                                    style={{
                                        height: 110,
                                        backgroundColor: '#1A1A1A',
                                        borderWidth: 1,
                                        borderColor: '#2F2F2F',
                                    }}
                                />

                                <Text
                                    className="text-[12px] mt-2 leading-5"
                                    style={{ color: COLORS.textMuted }}
                                >
                                    Recuerda completar tus rutinas con “realizado” para que tus
                                    estadísticas permanezcan actualizadas.
                                </Text>
                            </View>
                        </View>

                        {/* Línea divisoria */}
                        <View
                            className="h-px mb-4 mx-1"
                            style={{ backgroundColor: '#3A3A3A' }}
                        />

                        {/* TIPO DE CUENTA */}
                        <View className="mb-3">
                            <View
                                className="rounded-2xl px-4 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <Text
                                    className="text-[15px] font-semibold"
                                    style={{ color: COLORS.textLight }}
                                >
                                    Tipo de cuenta: Plan Estandar
                                </Text>

                                <Text
                                    className="text-[12px] mt-2"
                                    style={{
                                        color: COLORS.textMuted,
                                        textDecorationLine: 'underline',
                                    }}
                                >
                                    cambiar tipo plan
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>

                {/* BOTONES INFERIORES */}
                <View className="mt-2 flex-row justify-between px-2">
                    <Pressable
                        onPress={handleBack}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Volver al inicio
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            console.log('Editar perfil (próximamente)');
                        }}
                        className="flex-1 px-4 py-4 rounded-xl items-center justify-center"
                        style={{ backgroundColor: '#444444' }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            Editar perfil
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}