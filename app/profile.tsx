import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateMyProfile, type MyProfileResponse } from '../lib/profile';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImageToCloudinary } from '../lib/cloudinary';

function formatCreatedAt(dateString?: string | null) {
    if (!dateString) return 'No disponible';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No disponible';

    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function formatPlanType(planType?: string | null) {
    switch (planType) {
        case 'professional':
            return 'Profesional';
        case 'pro':
            return 'Pro';
        case 'standard':
        default:
            return 'Estandar';
    }
}

function shouldShowCompleteProfileNotice(profileData?: MyProfileResponse | null) {
    if (!profileData) return true;

    const goal = profileData.profile.goal?.trim() ?? '';
    const hasHeight = typeof profileData.profile.heightCm === 'number';
    const hasWeight = typeof profileData.profile.weightKg === 'number';

    const missingGoal = goal.length === 0;
    const missingHeight = !hasHeight;
    const missingWeight = !hasWeight;

    return missingGoal || missingHeight || missingWeight;
}

export default function ProfileScreen() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [savingGoal, setSavingGoal] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [screenError, setScreenError] = useState<string | null>(null);

    const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);

    const [goalText, setGoalText] = useState('');
    const [isEditingGoal, setIsEditingGoal] = useState(false);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [heightInput, setHeightInput] = useState('');
    const [weightInput, setWeightInput] = useState('');

    const [noticeDismissed, setNoticeDismissed] = useState(false);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const loadProfile = async () => {
        try {
            setLoading(true);
            setScreenError(null);

            const data = await getMyProfile();
            setProfileData(data);

            setGoalText(data.profile.goal ?? '');
            setNameInput(data.user.name ?? '');
            setHeightInput(
                typeof data.profile.heightCm === 'number'
                    ? String(data.profile.heightCm)
                    : ''
            );
            setWeightInput(
                typeof data.profile.weightKg === 'number'
                    ? String(data.profile.weightKg)
                    : ''
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'No se pudo cargar el perfil.';
            setScreenError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const displayName = profileData?.user.name ?? user?.name ?? 'Tu nombre';
    const displayEmail = profileData?.user.email ?? user?.email ?? 'correo@ejemplo.com';
    const displayCreatedAt = formatCreatedAt(profileData?.user.createdAt);

    const displayPlan = formatPlanType(profileData?.profile.planType);
    const displayWeight =
        typeof profileData?.profile.weightKg === 'number'
            ? `${profileData.profile.weightKg} kg`
            : 'No disponible';

    const displayHeight =
        typeof profileData?.profile.heightCm === 'number'
            ? `${profileData.profile.heightCm} cm`
            : 'No disponible';

    const displayWeeklyKm =
        typeof profileData?.profile.weeklyKmGoal === 'number'
            ? `${profileData.profile.weeklyKmGoal} km`
            : 'Próximamente disponible';

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

    const showEmptyProfileNotice =
        !noticeDismissed && shouldShowCompleteProfileNotice(profileData);

    const handleBack = () => {
        router.replace('/home');
    };

    const handleSaveGoal = async () => {
        try {
            setSavingGoal(true);

            const response = await updateMyProfile({
                goal: goalText.trim() ? goalText.trim() : null,
            });

            setProfileData({
                user: response.user,
                profile: response.profile,
            });

            setGoalText(response.profile.goal ?? '');
            setIsEditingGoal(false);
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar el objetivo.'
            );
        } finally {
            setSavingGoal(false);
        }
    };

    const handleEditGoalPress = async () => {
        if (!isEditingGoal) {
            setIsEditingGoal(true);
            return;
        }

        await handleSaveGoal();
    };

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);

            const parsedHeight =
                heightInput.trim() === '' ? null : Number(heightInput.replace(',', '.'));
            const parsedWeight =
                weightInput.trim() === '' ? null : Number(weightInput.replace(',', '.'));

            if (parsedHeight !== null && Number.isNaN(parsedHeight)) {
                Alert.alert('Dato inválido', 'La altura debe ser un número válido.');
                return;
            }

            if (parsedWeight !== null && Number.isNaN(parsedWeight)) {
                Alert.alert('Dato inválido', 'El peso debe ser un número válido.');
                return;
            }

            const response = await updateMyProfile({
                name: nameInput.trim() ? nameInput.trim() : '',
                heightCm: parsedHeight,
                weightKg: parsedWeight,
            });

            setProfileData({
                user: response.user,
                profile: response.profile,
            });

            setNameInput(response.user.name ?? '');
            setHeightInput(
                typeof response.profile.heightCm === 'number'
                    ? String(response.profile.heightCm)
                    : ''
            );
            setWeightInput(
                typeof response.profile.weightKg === 'number'
                    ? String(response.profile.weightKg)
                    : ''
            );

            setIsEditingProfile(false);
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar el perfil.'
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleEditProfilePress = async () => {
        if (!isEditingProfile) {
            setIsEditingProfile(true);
            return;
        }

        await handleSaveProfile();
    };

    const handleCancelEditProfile = () => {
        if (!profileData) return;

        // restaurar valores originales
        setNameInput(profileData.user.name ?? '');
        setHeightInput(
            typeof profileData.profile.heightCm === 'number'
                ? String(profileData.profile.heightCm)
                : ''
        );
        setWeightInput(
            typeof profileData.profile.weightKg === 'number'
                ? String(profileData.profile.weightKg)
                : ''
        );

        setIsEditingProfile(false);
    };

    const handlePickProfileImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Necesitamos acceso a tu galería para elegir una imagen.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                Alert.alert('Error', 'No se pudo procesar la imagen seleccionada.');
                return;
            }

            setUploadingPhoto(true);

            const upload = await uploadProfileImageToCloudinary({
                uri: asset.uri,
                file: (asset as any).file ?? null,
            });

            const response = await updateMyProfile({
                profileImageUrl: upload.secure_url,
            });

            setProfileData({
                user: response.user,
                profile: response.profile,
            });
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar la foto de perfil.'
            );
        } finally {
            setUploadingPhoto(false);
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

    if (screenError) {
        return (
            <SafeAreaView
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: COLORS.background }}
            >
                <Text
                    className="text-center text-[14px] mb-4"
                    style={{ color: COLORS.textLight }}
                >
                    {screenError}
                </Text>

                <Pressable
                    onPress={loadProfile}
                    className="px-4 py-3 rounded-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text
                        className="text-[14px] font-semibold"
                        style={{ color: '#111111' }}
                    >
                        Reintentar
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

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
                        horizontal={false}
                        contentContainerStyle={{ paddingHorizontal: 8 }}
                    >
                        {/* NOTIFICACIÓN PERFIL VACÍO */}
                        {showEmptyProfileNotice && (
                            <View
                                className="rounded-2xl px-4 py-3 mb-4"
                                style={{
                                    backgroundColor: '#1A1A1A',
                                    borderWidth: 1,
                                    borderColor: '#2F2F2F',
                                }}
                            >
                                <View className="flex-row items-start justify-between">
                                    <Text
                                        className="text-[13px] leading-5 flex-1 pr-3"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        Actualiza los datos de tu perfil para ver mejores resultados.
                                    </Text>

                                    <Pressable onPress={() => setNoticeDismissed(true)}>
                                        <Text
                                            className="text-[16px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            ✕
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* DATOS DEL PERFIL */}
                        <View className="mb-4">
                            <View
                                className="rounded-2xl px-2 py-2"
                                style={{ backgroundColor: '#111111' }}
                            >
                                {/* Cabecera */}
                                <View className="flex-row items-center mb-4">
                                    <View className="mr-4 items-center">
                                        <View
                                            className="w-20 h-20 rounded-full items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: COLORS.primary, borderWidth: 4, borderColor: '#2F2F2F' }}
                                        >
                                            {profileData?.profile.profileImageUrl ? (
                                                <Image
                                                    source={{ uri: profileData.profile.profileImageUrl }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Text
                                                    className="text-[20px] font-bold"
                                                    style={{ color: '#111111' }}
                                                >
                                                    {initials}
                                                </Text>
                                            )}
                                        </View>

                                        {isEditingProfile && (
                                            <Pressable
                                                onPress={handlePickProfileImage}
                                                disabled={uploadingPhoto}
                                                className="mt-2 px-3 py-2 rounded-xl items-center justify-center"
                                                style={{ backgroundColor: '#444444' }}
                                            >
                                                <Text
                                                    className="text-[11px]"
                                                    style={{ color: COLORS.textLight }}
                                                >
                                                    {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>

                                    <View className="flex-1">
                                        {isEditingProfile ? (
                                            <TextInput
                                                value={nameInput}
                                                onChangeText={setNameInput}
                                                placeholder="Tu nombre"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mb-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[16px] font-semibold"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayName}
                                            </Text>
                                        )}

                                        <Text
                                            className="text-[13px] mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            {displayEmail}
                                        </Text>

                                        <Text
                                            className="text-[12px] font-medium mt-1"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            fecha de creación: {displayCreatedAt}
                                        </Text>
                                    </View>
                                </View>

                                {/* Línea divisoria */}
                                <View
                                    className="h-px mb-4 mx-1"
                                    style={{ backgroundColor: '#3A3A3A' }}
                                />

                                {/* Peso / Altura / Plan en horizontal */}
                                <View className="flex-row items-start mb-4">
                                    <View className="flex-1 mr-2 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Peso
                                        </Text>

                                        {isEditingProfile ? (
                                            <TextInput
                                                value={weightInput}
                                                onChangeText={setWeightInput}
                                                keyboardType="numeric"
                                                placeholder="Ej: 80"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mt-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                    width: '100%',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[14px] mt-1"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayWeight}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="flex-1 mr-2 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Altura
                                        </Text>

                                        {isEditingProfile ? (
                                            <TextInput
                                                value={heightInput}
                                                onChangeText={setHeightInput}
                                                keyboardType="numeric"
                                                placeholder="Ej: 175"
                                                placeholderTextColor={COLORS.textMuted}
                                                className="rounded-xl px-3 py-2 mt-2"
                                                style={{
                                                    backgroundColor: '#1A1A1A',
                                                    color: COLORS.textLight,
                                                    borderWidth: 1,
                                                    borderColor: '#2F2F2F',
                                                    width: '100%',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className="text-[14px] mt-1"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                {displayHeight}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="flex-1 min-w-0">
                                        <Text
                                            className="text-[12px] font-semibold"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            Plan
                                        </Text>
                                        <Text
                                            className="text-[14px] mt-1"
                                            style={{ color: COLORS.textLight }}
                                            numberOfLines={1}
                                        >
                                            {displayPlan}
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
                                        {displayWeeklyKm}
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
                                        fontSize: 13,
                                        backgroundColor: '#1A1A1A',
                                        color: COLORS.textLight,
                                        borderWidth: 1,
                                        borderColor: '#2F2F2F',
                                    }}
                                />

                                <View className="mt-3">
                                    <Pressable
                                        onPress={handleEditGoalPress}
                                        disabled={savingGoal}
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
                                            {savingGoal
                                                ? 'Guardando...'
                                                : isEditingGoal
                                                    ? 'Guardar objetivo'
                                                    : 'Editar objetivo'}
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
                                    Tipo de cuenta: Plan {displayPlan}
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
                        onPress={isEditingProfile ? handleCancelEditProfile : handleBack}
                        className="flex-1 mr-2 px-4 py-4 rounded-xl items-center justify-center"
                        style={{
                            backgroundColor: isEditingProfile ? '#B00020' : '#444444',
                        }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{ color: COLORS.textLight }}
                        >
                            {isEditingProfile ? 'Cancelar' : 'Volver al inicio'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleEditProfilePress}
                        disabled={savingProfile}
                        className="flex-1 px-4 py-4 rounded-xl items-center justify-center"
                        style={{
                            backgroundColor: isEditingProfile ? COLORS.primary : '#444444',
                        }}
                    >
                        <Text
                            className="text-[14px] font-normal"
                            style={{
                                color: isEditingProfile ? '#111111' : COLORS.textLight,
                            }}
                        >
                            {savingProfile
                                ? 'Guardando...'
                                : isEditingProfile
                                    ? 'Guardar perfil'
                                    : 'Editar perfil'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}