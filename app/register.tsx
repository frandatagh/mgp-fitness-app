import { View, Text, TextInput, Pressable, Image, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS } from '../constants/colors';
import { useState } from 'react';
import { registerRequest } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

// Esquema de validación de registro
const registerSchema = z
    .object({
        username: z
            .string()
            .min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
        email: z
            .string()
            .min(1, 'El correo es obligatorio')
            .email('Ingrese un correo válido'),
        password: z
            .string()
            .min(6, 'La contraseña debe tener al menos 6 caracteres'),
        confirmPassword: z
            .string()
            .min(6, 'Debe repetir la contraseña'),
        acceptTerms: z.boolean(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    })
    .refine((data) => data.acceptTerms === true, {
        message: 'Debes aceptar los términos y condiciones para crear la cuenta',
        path: ['acceptTerms'],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
    const { login } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const [termsVisible, setTermsVisible] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
        },
    });

    const acceptTerms = watch('acceptTerms');

    const onSubmit = async (data: RegisterFormValues) => {
        setServerError(null);

        try {
            const response = await registerRequest(
                data.username,
                data.email,
                data.password
            );

            await login(response.user, response.token);

            router.replace('/home');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error inesperado al crear la cuenta';

            setServerError(message);
        }
    };

    return (
        <View
            className="flex-1 px-6 pb-3"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 items-center justify-center">
                {/* LOGO */}
                <View className="items-center mb-4">
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 100, height: 100 }}
                        resizeMode="contain"
                    />
                </View>

                {/* CARD REGISTRO */}
                <View
                    className="w-full mt-2 rounded-3xl px-6 py-7 shadow-black shadow-md"
                    style={{ backgroundColor: COLORS.card, maxWidth: 400 }}
                >
                    <Text
                        className="text-2xl font-bold mb-6 text-center"
                        style={{ color: COLORS.textLight }}
                    >
                        Regístrate
                    </Text>

                    {/* Nombre de usuario */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Nombre de usuario
                    </Text>
                    <View className="mb-1 rounded-full px-4 py-2 bg-white flex-row items-center">
                        <Controller
                            control={control}
                            name="username"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ingrese su nombre de usuario"
                                    placeholderTextColor="#7BCED1"
                                    className="flex-1 text-sm"
                                    style={{
                                        borderWidth: 0,
                                    }}
                                />
                            )}
                        />
                    </View>
                    {errors.username && (
                        <Text className="text-xs mb-2" style={{ color: '#FFBABA' }}>
                            {errors.username.message}
                        </Text>
                    )}

                    {/* Correo electrónico */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Correo electrónico
                    </Text>
                    <View className="mb-1 rounded-full px-4 py-2 bg-white flex-row items-center">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ingrese su correo electrónico"
                                    placeholderTextColor="#7BCED1"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    className="flex-1 text-sm"
                                    style={{
                                        borderWidth: 0,
                                    }}
                                />
                            )}
                        />
                    </View>
                    {errors.email && (
                        <Text className="text-xs mb-2" style={{ color: '#FFBABA' }}>
                            {errors.email.message}
                        </Text>
                    )}

                    {/* Nueva contraseña */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Nueva contraseña
                    </Text>
                    <View className="mb-1 rounded-full px-4 py-2 bg-white flex-row items-center">
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Ingrese su contraseña"
                                    placeholderTextColor="#7BCED1"
                                    secureTextEntry
                                    className="flex-1 text-sm"
                                    style={{
                                        borderWidth: 0,
                                    }}
                                />
                            )}
                        />
                    </View>
                    {errors.password && (
                        <Text className="text-xs mb-2" style={{ color: '#FFBABA' }}>
                            {errors.password.message}
                        </Text>
                    )}

                    {/* Repetir contraseña */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Repetir contraseña
                    </Text>
                    <View className="mb-1 rounded-full px-4 py-2 bg-white flex-row items-center">
                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Repita su contraseña"
                                    placeholderTextColor="#7BCED1"
                                    secureTextEntry
                                    className="flex-1 text-sm"
                                    style={{
                                        borderWidth: 0,
                                    }}
                                />
                            )}
                        />
                    </View>
                    {errors.confirmPassword && (
                        <Text className="text-xs mb-2" style={{ color: '#FFBABA' }}>
                            {errors.confirmPassword.message}
                        </Text>
                    )}

                    {/* Términos */}
                    <View className="mt-3 mb-2">
                        <Controller
                            control={control}
                            name="acceptTerms"
                            render={({ field: { value } }) => (
                                <View className="items-center">
                                    <Pressable
                                        onPress={() => setValue('acceptTerms', !value, { shouldValidate: true })}
                                        className="flex-row items-center justify-center"
                                    >
                                        <Text
                                            className="text-sm"
                                            style={{ color: COLORS.textMuted }}
                                        >
                                            {value ? '☑' : '☐'} Aceptar{' '}
                                        </Text>

                                        <Pressable onPress={() => setTermsVisible(true)}>
                                            <Text
                                                className="text-sm"
                                                style={{
                                                    color: COLORS.textLight,
                                                    textDecorationLine: 'underline',
                                                }}
                                            >
                                                Términos y Condiciones
                                            </Text>
                                        </Pressable>
                                    </Pressable>
                                </View>
                            )}
                        />
                    </View>

                    {errors.acceptTerms && (
                        <Text className="text-xs mb-3 text-center" style={{ color: '#FFBABA' }}>
                            {errors.acceptTerms.message}
                        </Text>
                    )}

                    {/* Botón crear cuenta */}
                    <Pressable
                        className="rounded-full py-3 items-center mb-4 shadow-neutral-700 shadow-md"
                        style={{
                            backgroundColor: COLORS.primary,
                            width: 220,
                            alignSelf: 'center',
                        }}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                    >
                        <Text className="text-base font-bold" style={{ color: '#000000' }}>
                            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                        </Text>
                    </Pressable>

                    {/* Volver al login */}
                    <Pressable onPress={() => router.replace('/')}>
                        <Text
                            className="text-xs text-center"
                            style={{ color: COLORS.textMuted, }}
                        >
                            Volver a Iniciar Sesión
                        </Text>
                    </Pressable>

                    {serverError && (
                        <Text
                            className="text-xs mt-3 text-center"
                            style={{ color: '#FFBABA' }}
                        >
                            {serverError}
                        </Text>
                    )}
                </View>
            </View>

            {/* Footer enlaces */}
            <View className="pb-1 pt-2">
                <View className="flex-row justify-center flex-wrap">
                    <Pressable onPress={() => router.push('/support')} className="mx-2 my-1">
                        <Text
                            className="text-[11px]"
                            style={{
                                color: COLORS.textMuted,
                                textDecorationLine: 'underline',
                            }}
                        >
                            Soporte y ayuda
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => router.push('/contact')} className="mx-2 my-1">
                        <Text
                            className="text-[11px]"
                            style={{
                                color: COLORS.textMuted,
                                textDecorationLine: 'underline',
                            }}
                        >
                            Contacto
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => router.push('/about')} className="mx-2 my-1">
                        <Text
                            className="text-[11px]"
                            style={{
                                color: COLORS.textMuted,
                                textDecorationLine: 'underline',
                            }}
                        >
                            Acerca de nosotros
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Modal términos y condiciones */}
            <Modal
                visible={termsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTermsVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full max-w-md rounded-3xl px-5 py-5"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            maxHeight: '80%',
                        }}
                    >
                        <View className="flex-row justify-between items-center mb-3">
                            <Text
                                className="text-[16px] font-semibold"
                                style={{ color: COLORS.textLight }}
                            >
                                Términos y condiciones
                            </Text>

                            <Pressable onPress={() => setTermsVisible(false)}>
                                <Text style={{ color: COLORS.textLight, fontSize: 18 }}>✕</Text>
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text
                                className="text-[13px] leading-5"
                                style={{ color: COLORS.textMuted }}
                            >
                                Al registrarte en MGP Rutina Fitness aceptas utilizar la aplicación
                                de forma responsable y conforme a sus funciones previstas. La app
                                está diseñada para ayudarte a organizar entrenamientos, consultar
                                sugerencias, acceder a herramientas de apoyo y mantener registro de
                                tu actividad.
                                {'\n\n'}
                                El usuario comprende que la aplicación no reemplaza la supervisión
                                de un profesional de la salud, entrenador o especialista en actividad
                                física. Toda decisión sobre entrenamiento, exigencia, descanso,
                                intensidad o uso de ejercicios es responsabilidad del usuario.
                                {'\n\n'}
                                También aceptas que ciertas funciones pueden estar en desarrollo,
                                cambiar con el tiempo o ampliarse en futuras versiones. El uso
                                continuado de la aplicación implica la aceptación de las condiciones
                                generales de funcionamiento, tratamiento de datos básicos de cuenta y
                                uso razonable de las herramientas disponibles.
                                {'\n\n'}
                                Si decides crear una cuenta, se entenderá que aceptas estos términos
                                y condiciones en su versión vigente.
                            </Text>
                        </ScrollView>

                        <Pressable
                            onPress={() => {
                                setValue('acceptTerms', true, { shouldValidate: true });
                                setTermsVisible(false);
                            }}
                            className="mt-4 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Text
                                className="text-[14px] font-semibold"
                                style={{ color: '#111111' }}
                            >
                                Aceptar términos
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}