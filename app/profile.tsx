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
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
    getMyProfile,
    updateMyProfile,
    type MyProfileResponse,
    type UserProfile,
    type MainGoalType,
    type MainGoalPeriod,
    type MainGoalMetric,
} from '../lib/profile';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImageToCloudinary } from '../lib/cloudinary';
import { getMyStatistics, type MyStatisticsResponse } from '../lib/statistics';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';

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

function formatDistanceKm(meters?: number | null) {
    if (meters == null) return 'No disponible';

    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(2)} km`;
}

function formatAverageEffort(value?: number | null) {
    if (value == null) return 'No disponible';

    return `${value.toFixed(1)} / 10`;
}

function formatGoalType(type?: UserProfile['mainGoalType']) {
    switch (type) {
        case 'running':
            return 'Running';
        case 'routine':
            return 'Rutinas';
        default:
            return 'Sin definir';
    }
}

function formatGoalPeriod(period?: UserProfile['mainGoalPeriod']) {
    switch (period) {
        case 'weekly':
            return 'Semanal';
        case 'monthly':
            return 'Mensual';
        default:
            return 'Sin definir';
    }
}

function formatGoalMetric(metric?: UserProfile['mainGoalMetric']) {
    switch (metric) {
        case 'distance_km':
            return 'Kilómetros';
        case 'sessions':
            return 'Entrenamientos';
        case 'minutes':
            return 'Minutos';
        default:
            return 'Sin definir';
    }
}

function formatGoalTargetByType(
    type?: UserProfile['mainGoalType'],
    metric?: UserProfile['mainGoalMetric'],
    target?: number | null
) {
    if (typeof target !== 'number') return 'Sin definir';

    if (metric === 'distance_km') return `${target} km`;
    if (metric === 'minutes') return `${target} minutos`;

    if (metric === 'sessions') {
        return type === 'running'
            ? `${target} salidas`
            : `${target} entrenamientos`;
    }

    return String(target);
}

function formatMinutes(seconds?: number | null) {
    if (seconds == null) return 'No disponible';

    const minutes = Math.round(seconds / 60);

    return `${minutes} minutos`;
}

function formatKmFromMeters(meters?: number | null) {
    if (meters == null) return 'No disponible';

    return `${(meters / 1000).toFixed(1)} km`;
}

function GoalInfoRow({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#2A2A2A',
                gap: 12,
            }}
        >
            <Text
                style={{
                    flex: 1,
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>

            <Text
                numberOfLines={1}
                style={{
                    flex: 1,
                    textAlign: 'right',
                    color: accent ? COLORS.primary : COLORS.textLight,
                    fontSize: 13,
                    fontWeight: accent ? '900' : '800',
                }}
            >
                {value}
            </Text>
        </View>
    );
}

function GoalOptionCard({
    selected,
    title,
    subtitle,
    icon,
    onPress,
}: {
    selected: boolean;
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                flex: 1,
                minHeight: 92,
                backgroundColor: selected ? 'rgba(198,255,0,0.12)' : '#1A1A1A',
                borderWidth: 1,
                borderColor: selected ? COLORS.primary : '#333333',
                borderRadius: 18,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Ionicons
                name={icon}
                size={30}
                color={selected ? COLORS.primary : COLORS.textMuted}
                style={{ marginBottom: 8 }}
            />

            <Text
                style={{
                    color: selected ? COLORS.primary : COLORS.textLight,
                    fontSize: 14,
                    fontWeight: '900',
                    textAlign: 'center',
                }}
            >
                {title}
            </Text>

            {subtitle ? (
                <Text
                    style={{
                        color: COLORS.textMuted,
                        fontSize: 11,
                        textAlign: 'center',
                        marginTop: 4,
                        lineHeight: 15,
                    }}
                >
                    {subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
}

function GoalModalButton({
    label,
    onPress,
    variant = 'dark',
    disabled = false,
}: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'dark';
    disabled?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={{
                flex: 1,
                backgroundColor:
                    variant === 'primary' ? COLORS.primary : '#2A2A2A',
                opacity: disabled ? 0.6 : 1,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text
                style={{
                    color: variant === 'primary' ? '#111111' : COLORS.textLight,
                    fontSize: 13,
                    fontWeight: '900',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
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

    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [screenError, setScreenError] = useState<string | null>(null);

    const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
    const [statsData, setStatsData] = useState<MyStatisticsResponse | null>(null);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [heightInput, setHeightInput] = useState('');
    const [weightInput, setWeightInput] = useState('');

    const [noticeDismissed, setNoticeDismissed] = useState(false);

    const [goalModalVisible, setGoalModalVisible] = useState(false);
    const [goalStep, setGoalStep] = useState(1);
    const [savingGoal, setSavingGoal] = useState(false);

    const [draftGoalType, setDraftGoalType] = useState<MainGoalType>('running');
    const [draftGoalPeriod, setDraftGoalPeriod] = useState<MainGoalPeriod>('weekly');
    const [draftGoalMetric, setDraftGoalMetric] = useState<MainGoalMetric>('distance_km');
    const [draftGoalTarget, setDraftGoalTarget] = useState('');
    const [draftGoalTargetError, setDraftGoalTargetError] = useState<string | null>(null);

    if (!isAuthenticated) {
        return <Redirect href="/" />;
    }

    const loadProfile = async () => {
        try {
            setLoading(true);
            setScreenError(null);

            const [data, stats] = await Promise.all([
                getMyProfile(),
                getMyStatistics(),
            ]);

            setProfileData(data);
            setStatsData(stats);

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

    const displayWeeklyKm = formatDistanceKm(statsData?.running.weeklyDistanceMeters);

    const displayAverageEffort = formatAverageEffort(statsData?.summary.avgEffort);

    const mainGoal = profileData?.profile;

    const hasMainGoal =
        !!mainGoal?.mainGoalType &&
        !!mainGoal?.mainGoalPeriod &&
        !!mainGoal?.mainGoalMetric &&
        typeof mainGoal?.mainGoalTarget === 'number';

    const goalTypeLabel = formatGoalType(mainGoal?.mainGoalType);
    const goalPeriodLabel = formatGoalPeriod(mainGoal?.mainGoalPeriod);
    const goalMetricLabel = formatGoalMetric(mainGoal?.mainGoalMetric);
    const goalTargetLabel = formatGoalTargetByType(
        mainGoal?.mainGoalType,
        mainGoal?.mainGoalMetric,
        mainGoal?.mainGoalTarget
    );

    const goalRunningDistance =
        mainGoal?.mainGoalPeriod === 'monthly'
            ? formatKmFromMeters(statsData?.running.monthlyDistanceMeters)
            : formatKmFromMeters(statsData?.running.weeklyDistanceMeters);

    const goalRunningMinutes =
        mainGoal?.mainGoalPeriod === 'monthly'
            ? formatMinutes(statsData?.running.monthlyDurationSeconds)
            : formatMinutes(statsData?.running.weeklyDurationSeconds);

    const goalTrainingCount =
        mainGoal?.mainGoalPeriod === 'weekly' &&
            typeof statsData?.summary.weeklySessions === 'number'
            ? `${statsData.summary.weeklySessions}`
            : 'No disponible';

    const goalAverageEffort = formatAverageEffort(statsData?.summary.avgEffort);

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

    const openGoalModal = () => {
        const currentProfile = profileData?.profile;

        setGoalStep(1);

        setDraftGoalType(currentProfile?.mainGoalType ?? 'running');
        setDraftGoalPeriod(currentProfile?.mainGoalPeriod ?? 'weekly');
        setDraftGoalMetric(currentProfile?.mainGoalMetric ?? 'distance_km');
        setDraftGoalTarget(
            typeof currentProfile?.mainGoalTarget === 'number'
                ? String(currentProfile.mainGoalTarget)
                : ''
        );

        setGoalModalVisible(true);
        setDraftGoalTargetError(null);
    };

    const closeGoalModal = () => {
        if (savingGoal) return;

        setGoalModalVisible(false);
        setGoalStep(1);
        setDraftGoalTargetError(null);
    };

    const validateGoalTarget = () => {
        const normalizedValue = draftGoalTarget.replace(',', '.').trim();
        const target = Number(normalizedValue);

        if (!normalizedValue) {
            setDraftGoalTargetError('Ingresá un valor para tu objetivo.');
            return false;
        }

        if (!Number.isFinite(target)) {
            setDraftGoalTargetError('Ingresá solo números. Ejemplo: 20, 3 o 120.');
            return false;
        }

        if (target <= 0) {
            setDraftGoalTargetError('El objetivo debe ser mayor a cero.');
            return false;
        }

        if (draftGoalMetric === 'distance_km' && target > 300) {
            setDraftGoalTargetError(
                'Ese objetivo de kilómetros parece demasiado alto. Revisá si el valor es correcto.'
            );
            return false;
        }

        if (draftGoalMetric === 'sessions' && target > 60) {
            setDraftGoalTargetError(
                'La cantidad de entrenamientos parece demasiado alta para el período elegido.'
            );
            return false;
        }

        if (draftGoalMetric === 'minutes' && target > 10000) {
            setDraftGoalTargetError(
                'La cantidad de minutos parece demasiado alta. Revisá si el valor es correcto.'
            );
            return false;
        }

        setDraftGoalTargetError(null);
        return true;
    };

    const goNextGoalStep = () => {
        if (goalStep === 3 && !validateGoalTarget()) {
            return;
        }

        setGoalStep((prev) => Math.min(prev + 1, 4));
    };

    const goPreviousGoalStep = () => {
        setDraftGoalTargetError(null);
        setGoalStep((prev) => Math.max(prev - 1, 1));
    };

    const saveMainGoal = async () => {
        try {
            if (!validateGoalTarget()) {
                return;
            }

            const target = Number(draftGoalTarget.replace(',', '.').trim());

            setSavingGoal(true);

            const updated = await updateMyProfile({
                mainGoalType: draftGoalType,
                mainGoalPeriod: draftGoalPeriod,
                mainGoalMetric: draftGoalMetric,
                mainGoalTarget: target,
            });

            setProfileData({
                user: updated.user,
                profile: updated.profile,
            });

            setGoalModalVisible(false);
            setGoalStep(1);

            Alert.alert(
                'Objetivo guardado',
                'Tu objetivo principal fue actualizado correctamente.'
            );
        } catch (error) {
            console.log('Error guardando objetivo:', error);

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

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: COLORS.background }}
        >
            <View
                className="flex-1 px-4 pt-1 pb-2"
                style={{ maxWidth: 800, alignSelf: 'center' }}
            >
                <AppHeader showProfile={false} />

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

                                {/* Kilómetros reales */}
                                <View>
                                    <Text
                                        className="text-[12px] font-semibold"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Kilómetros recorridos esta semana
                                    </Text>

                                    <Text
                                        className="text-[16px] font-semibold mt-1"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        {displayWeeklyKm}
                                    </Text>

                                    <View
                                        className="h-px my-3"
                                        style={{ backgroundColor: '#2F2F2F' }}
                                    />

                                    <Text
                                        className="text-[12px] font-semibold"
                                        style={{ color: COLORS.textMuted }}
                                    >
                                        Esfuerzo promedio histórico
                                    </Text>

                                    <Text
                                        className="text-[16px] font-semibold mt-1"
                                        style={{ color: COLORS.textLight }}
                                    >
                                        {displayAverageEffort}
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
                                className="rounded-2xl px-3 py-3"
                                style={{
                                    backgroundColor: '#111111',
                                    borderWidth: 1,
                                    borderColor: '#2F2F2F',
                                }}
                            >
                                {hasMainGoal ? (
                                    <>
                                        <View
                                            style={{
                                                backgroundColor: '#1A1A1A',
                                                borderRadius: 18,
                                                padding: 14,
                                                borderWidth: 1,
                                                borderColor: 'rgba(198,255,0,0.25)',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '900',
                                                    marginBottom: 4,
                                                }}
                                            >
                                                Objetivo principal
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                Este objetivo se usará para mostrar tu progreso en el Home.
                                            </Text>

                                            <GoalInfoRow
                                                label="Tipo de entrenamiento"
                                                value={`${goalTypeLabel} - ${goalPeriodLabel}`}
                                                accent
                                            />

                                            <GoalInfoRow
                                                label="Medición"
                                                value={goalMetricLabel}
                                            />

                                            <GoalInfoRow
                                                label="Objetivo"
                                                value={goalTargetLabel}
                                                accent
                                            />

                                            {mainGoal?.mainGoalType === 'running' ? (
                                                <>
                                                    <GoalInfoRow
                                                        label="Kilómetros recorridos"
                                                        value={goalRunningDistance}
                                                    />

                                                    <GoalInfoRow
                                                        label="Cantidad de entrenamientos"
                                                        value={goalTrainingCount}
                                                    />

                                                    <GoalInfoRow
                                                        label="Minutos de running"
                                                        value={goalRunningMinutes}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <GoalInfoRow
                                                        label="Entrenamientos registrados"
                                                        value={goalTrainingCount}
                                                    />

                                                    <GoalInfoRow
                                                        label="Promedio de esfuerzo"
                                                        value={goalAverageEffort}
                                                    />

                                                    <GoalInfoRow
                                                        label="Estado del objetivo"
                                                        value="En seguimiento"
                                                    />
                                                </>
                                            )}
                                        </View>

                                        <Pressable
                                            onPress={openGoalModal}
                                            className="px-4 py-3 rounded-xl items-center justify-center mt-3"
                                            style={{
                                                backgroundColor: '#444444',
                                            }}
                                        >
                                            <Text
                                                className="text-[14px] font-semibold"
                                                style={{ color: COLORS.textLight }}
                                            >
                                                Editar objetivo
                                            </Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <View
                                            style={{
                                                backgroundColor: '#1A1A1A',
                                                borderRadius: 18,
                                                padding: 14,
                                                borderWidth: 1,
                                                borderColor: '#2F2F2F',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textLight,
                                                    fontSize: 15,
                                                    fontWeight: '900',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                Todavía no definiste tu objetivo
                                            </Text>

                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    lineHeight: 18,
                                                }}
                                            >
                                                Podés elegir un objetivo de running o rutinas, semanal o mensual.
                                                Luego se mostrará tu progreso en esta pantalla y en el Home.
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={openGoalModal}
                                            className="px-4 py-3 rounded-xl items-center justify-center mt-3"
                                            style={{
                                                backgroundColor: COLORS.primary,
                                            }}
                                        >
                                            <Text
                                                className="text-[14px] font-semibold"
                                                style={{ color: '#111111' }}
                                            >
                                                Crear objetivo
                                            </Text>
                                        </Pressable>
                                    </>
                                )}
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
            <Modal
                visible={goalModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeGoalModal}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.70)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 18,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 390,
                            backgroundColor: '#111111',
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: 'rgba(198,255,0,0.35)',
                            padding: 18,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.primary,
                                fontSize: 13,
                                fontWeight: '900',
                                marginBottom: 4,
                            }}
                        >
                            Objetivo: Paso {goalStep} de 4
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 20,
                                fontWeight: '900',
                                marginBottom: 14,
                            }}
                        >
                            {goalStep === 1 && 'Elegí tu objetivo principal'}
                            {goalStep === 2 && 'Elegí cómo medir tu progreso'}
                            {goalStep === 3 && 'Definí tu meta'}
                            {goalStep === 4 && 'Confirmá tu objetivo'}
                        </Text>

                        {goalStep === 1 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 12,
                                        fontWeight: '800',
                                        marginBottom: 8,
                                    }}
                                >
                                    Tipo de entrenamiento
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <GoalOptionCard
                                        selected={draftGoalType === 'running'}
                                        title="Running"
                                        subtitle="Distancia, tiempo o salidas"
                                        icon="walk-outline"
                                        onPress={() => {
                                            setDraftGoalType('running');
                                            setDraftGoalMetric('distance_km');
                                        }}
                                    />

                                    <GoalOptionCard
                                        selected={draftGoalType === 'routine'}
                                        title="Rutinas"
                                        subtitle="Entrenamientos deportivos"
                                        icon="barbell-outline"
                                        onPress={() => {
                                            setDraftGoalType('routine');
                                            setDraftGoalMetric('sessions');
                                        }}
                                    />
                                </View>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 12,
                                        fontWeight: '800',
                                        marginBottom: 8,
                                    }}
                                >
                                    Medición del objetivo
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <GoalOptionCard
                                        selected={draftGoalPeriod === 'weekly'}
                                        title="Semanal"
                                        subtitle="Feedback más rápido"
                                        icon="calendar-outline"
                                        onPress={() => setDraftGoalPeriod('weekly')}
                                    />

                                    <GoalOptionCard
                                        selected={draftGoalPeriod === 'monthly'}
                                        title="Mensual"
                                        subtitle="Visión más amplia"
                                        icon="calendar-number-outline"
                                        onPress={() => setDraftGoalPeriod('monthly')}
                                    />
                                </View>
                            </View>
                        )}

                        {goalStep === 2 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Elegí el dato principal que querés usar para medir tu progreso.
                                </Text>

                                {draftGoalType === 'running' ? (
                                    <View style={{ gap: 10 }}>
                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'distance_km'}
                                            title="Kilómetros"
                                            subtitle="Distancia recorrida en el período elegido"
                                            icon="map-outline"
                                            onPress={() => setDraftGoalMetric('distance_km')}
                                        />

                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'minutes'}
                                            title="Minutos"
                                            subtitle="Tiempo total de running acumulado"
                                            icon="time-outline"
                                            onPress={() => setDraftGoalMetric('minutes')}
                                        />

                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'sessions'}
                                            title="Salidas"
                                            subtitle="Cantidad de sesiones de running"
                                            icon="footsteps-outline"
                                            onPress={() => setDraftGoalMetric('sessions')}
                                        />
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        <GoalOptionCard
                                            selected={draftGoalMetric === 'sessions'}
                                            title="Entrenamientos"
                                            subtitle="Cuenta rutinas completas o registros con al menos 3 ejercicios"
                                            icon="barbell-outline"
                                            onPress={() => setDraftGoalMetric('sessions')}
                                        />

                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 12,
                                                lineHeight: 18,
                                                marginTop: 4,
                                            }}
                                        >
                                            Para que una sesión cuente como entrenamiento, deberá registrarse una rutina completa o al menos 3 ejercicios cargados.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {goalStep === 3 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Ingresá un valor alcanzable. Podés ajustarlo más adelante según tu progreso.
                                </Text>

                                <TextInput
                                    value={draftGoalTarget}
                                    onChangeText={(value) => {
                                        setDraftGoalTarget(value);
                                        setDraftGoalTargetError(null);
                                    }}
                                    keyboardType="numeric"
                                    placeholder={
                                        draftGoalMetric === 'distance_km'
                                            ? 'Ej: 20'
                                            : draftGoalMetric === 'minutes'
                                                ? 'Ej: 120'
                                                : 'Ej: 3'
                                    }
                                    placeholderTextColor={COLORS.textMuted}
                                    style={{
                                        backgroundColor: '#1A1A1A',
                                        borderWidth: 1,
                                        borderColor: draftGoalTargetError ? '#FF6B6B' : '#333333',
                                        borderRadius: 16,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        color: COLORS.textLight,
                                        fontSize: 18,
                                        fontWeight: '800',
                                        marginBottom: 10,
                                    }}
                                />
                                {draftGoalTargetError ? (
                                    <Text
                                        style={{
                                            color: '#FF6B6B',
                                            fontSize: 12,
                                            fontWeight: '800',
                                            marginBottom: 10,
                                            lineHeight: 16,
                                        }}
                                    >
                                        {draftGoalTargetError}
                                    </Text>
                                ) : null}

                                <Text
                                    style={{
                                        color: COLORS.primary,
                                        fontSize: 12,
                                        fontWeight: '800',
                                    }}
                                >
                                    {draftGoalMetric === 'distance_km' && 'Unidad: kilómetros'}
                                    {draftGoalMetric === 'minutes' && 'Unidad: minutos'}
                                    {draftGoalMetric === 'sessions' &&
                                        (draftGoalType === 'running'
                                            ? 'Unidad: salidas de running'
                                            : 'Unidad: entrenamientos')}
                                </Text>
                            </View>
                        )}

                        {goalStep === 4 && (
                            <View>
                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 13,
                                        lineHeight: 19,
                                        marginBottom: 14,
                                    }}
                                >
                                    Revisá tu objetivo antes de guardarlo. Este será el objetivo principal que se mostrará en tu perfil y en el Home.
                                </Text>

                                <View
                                    style={{
                                        backgroundColor: '#1A1A1A',
                                        borderRadius: 18,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor: 'rgba(198,255,0,0.25)',
                                    }}
                                >
                                    <GoalInfoRow
                                        label="Tipo"
                                        value={`${formatGoalType(draftGoalType)} - ${formatGoalPeriod(draftGoalPeriod)}`}
                                        accent
                                    />

                                    <GoalInfoRow
                                        label="Medición"
                                        value={formatGoalMetric(draftGoalMetric)}
                                    />

                                    <GoalInfoRow
                                        label="Objetivo"
                                        value={formatGoalTargetByType(
                                            draftGoalType,
                                            draftGoalMetric,
                                            Number(draftGoalTarget.replace(',', '.'))
                                        )}
                                        accent
                                    />
                                </View>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            {goalStep === 1 ? (
                                <GoalModalButton
                                    label="Cancelar"
                                    onPress={closeGoalModal}
                                    variant="dark"
                                    disabled={savingGoal}
                                />
                            ) : (
                                <GoalModalButton
                                    label="Volver"
                                    onPress={goPreviousGoalStep}
                                    variant="dark"
                                    disabled={savingGoal}
                                />
                            )}

                            {goalStep < 4 ? (
                                <GoalModalButton
                                    label="Siguiente"
                                    onPress={goNextGoalStep}
                                    variant="primary"
                                    disabled={savingGoal}
                                />
                            ) : (
                                <GoalModalButton
                                    label={savingGoal ? 'Guardando...' : 'Guardar objetivo'}
                                    onPress={saveMainGoal}
                                    variant="primary"
                                    disabled={savingGoal}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}