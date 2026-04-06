import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS } from '../constants/colors';
import { useState } from 'react';
import { loginRequest } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'react-native';
import { forgotPasswordRequest } from '../lib/auth';

// Esquema de validación con Zod
const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio')
        .email('Ingrese un correo válido'),
    password: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
    const { login, isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Redirect href="/home" />;
    }

    const [serverError, setServerError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setServerError(null);

        try {
            const response = await loginRequest(data.email, data.password);

            await login(response.user, response.token);

            router.replace('/home');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error inesperado al iniciar sesión';

            setServerError(message);
        }
    };

    const [forgotVisible, setForgotVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
    const [forgotSubmitting, setForgotSubmitting] = useState(false);

    const handleForgotPassword = async () => {
        setForgotError(null);
        setForgotSuccess(null);

        const trimmedEmail = forgotEmail.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmedEmail) {
            setForgotError('Ingresa tu correo electrónico.');
            return;
        }

        if (!emailRegex.test(trimmedEmail)) {
            setForgotError('Ingresa un correo electrónico válido.');
            return;
        }

        try {
            setForgotSubmitting(true);
            const response = await forgotPasswordRequest(trimmedEmail);

            setForgotSuccess(
                response?.message ||
                'Mensaje enviado. Revisa tu email.'
            );
            setForgotEmail('');
        } catch (error) {
            setForgotError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo procesar la solicitud.'
            );
        } finally {
            setForgotSubmitting(false);
        }
    };

    return (
        <View
            className="flex-1 px-6 pt-8 pb-3"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="flex-1 items-center justify-center">
                {/* LOGO / TÍTULO */}
                <View className="items-center mb-5">
                    <Image
                        source={require('../assets/img/iconhome.png')}
                        style={{ width: 210, height: 210 }}
                        resizeMode="contain"
                    />

                    <Text
                        className="text-base mb-2"
                        style={{ color: COLORS.textMuted }}
                    >
                        ¡Tu entrenamiento al instante!
                    </Text>
                </View>

                {/* CARD LOGIN */}
                <View
                    className="w-full rounded-3xl px-6 py-7 shadow-black shadow-md"
                    style={{ backgroundColor: COLORS.card, maxWidth: 400 }}
                >
                    <Text
                        className="text-2xl font-bold mb-6 text-center"
                        style={{ color: COLORS.textLight }}
                    >
                        Iniciar sesión
                    </Text>

                    {/* Correo electrónico */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Correo electrónico
                    </Text>
                    <View className="mb-1 rounded-full mx-2 px-4 py-2 bg-white flex-row items-center">
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
                        <Text className="text-xs mb-3 ml-4" style={{ color: '#B5FF1F' }}>
                            {errors.email.message}
                        </Text>
                    )}

                    {/* Contraseña */}
                    <Text
                        className="text-sm font-semibold mb-1 ml-3"
                        style={{ color: COLORS.textLight }}
                    >
                        Contraseña
                    </Text>
                    <View className="mb-1 rounded-full mx-2 px-4 py-2 bg-white flex-row items-center">
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
                        <Text className="text-xs mb-3 ml-4" style={{ color: '#B5FF1F' }}>
                            {errors.password.message}
                        </Text>
                    )}

                    {/* Recordarme / Olvidé */}
                    <View className="flex-center items-center mx-3 mb-5 px-2">

                        <Pressable onPress={() => setForgotVisible(true)}>
                            <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                                ¿Olvidaste la contraseña?
                            </Text>
                        </Pressable>
                    </View>

                    {/* Botón ingresar */}
                    <Pressable
                        className="rounded-full py-3 items-center mb-4 shadow-neutral-700 shadow-md"
                        style={{
                            backgroundColor: COLORS.primary,
                            width: 200,
                            alignSelf: 'center',
                        }}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                    >
                        <Text
                            className="text-base font-semibold"
                            style={{ color: '#000000' }}
                        >
                            {isSubmitting ? 'Ingresando...' : 'Ingresar cuenta'}
                        </Text>
                    </Pressable>

                    {serverError && (
                        <Text
                            className="text-xs mt-1 text-center"
                            style={{ color: '#FFBABA' }}
                        >
                            {serverError}
                        </Text>
                    )}

                    {/* Link registro */}
                    <Pressable onPress={() => router.push('/register')}>
                        <Text
                            className="text-center text-sm"
                            style={{ color: COLORS.textLight }}
                        >
                            ¿Eres nuevo?{' '}
                            <Text style={{ textDecorationLine: 'underline' }}>
                                Regístrate
                            </Text>
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* FOOTER ENLACES */}
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
                            Soporte & Ayuda
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => router.push('/terms')} className="mx-2 my-1">
                        <Text
                            className="text-[11px]"
                            style={{
                                color: COLORS.textMuted,
                                textDecorationLine: 'underline',
                            }}
                        >
                            Términos y condiciones
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
            <Modal
                visible={forgotVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setForgotVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full max-w-sm rounded-3xl px-5 py-5"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <View className="flex-row justify-between items-center mb-3">
                            <Text
                                className="text-[16px] font-semibold"
                                style={{ color: COLORS.textLight }}
                            >
                                Recuperar contraseña
                            </Text>

                            <Pressable
                                onPress={() => {
                                    setForgotVisible(false);
                                    setForgotError(null);
                                    setForgotSuccess(null);
                                    setForgotEmail('');
                                }}
                            >
                                <Text style={{ color: COLORS.textLight, fontSize: 18 }}>✕</Text>
                            </Pressable>
                        </View>

                        <Text
                            className="text-[13px] mb-3 leading-5"
                            style={{ color: COLORS.textMuted }}
                        >
                            Ingresa el correo asociado a tu cuenta. Si existe, te enviaremos un enlace
                            para restablecer tu contraseña.
                        </Text>

                        <TextInput
                            value={forgotEmail}
                            onChangeText={setForgotEmail}
                            placeholder="correo@ejemplo.com"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="rounded-2xl px-4 py-3 mb-2"
                            style={{
                                backgroundColor: '#1A1A1A',
                                color: COLORS.textLight,
                                borderWidth: 1,
                                borderColor: '#2F2F2F',
                            }}
                        />

                        {forgotError && (
                            <Text
                                className="text-[12px] mb-2"
                                style={{ color: '#FFBABA' }}
                            >
                                {forgotError}
                            </Text>
                        )}

                        {forgotSuccess && (
                            <Text
                                className="text-[12px] mb-2"
                                style={{ color: COLORS.primary }}
                            >
                                {forgotSuccess}
                            </Text>
                        )}

                        <Pressable
                            onPress={handleForgotPassword}
                            disabled={forgotSubmitting}
                            className="mt-2 px-4 py-3 rounded-xl items-center justify-center"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <Text
                                className="text-[14px] font-semibold"
                                style={{ color: '#111111' }}
                            >
                                {forgotSubmitting ? 'Enviando...' : 'Restablecer contraseña'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}