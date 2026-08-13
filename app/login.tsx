import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS } from '../constants/colors';
import React, { useRef, useState } from 'react';
import { loginRequest } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordRequest } from '../lib/auth';
import FieldError from '../components/form/FieldError';
import AppErrorModal from '../components/feedback/AppErrorModal';
import AppStatusMessage from '../components/feedback/AppStatusMessage';

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
    const { login: saveAuthSession, isAuthenticated } = useAuth();



    const [serverError, setServerError] = useState<string | null>(null);
    const [forgotVisible, setForgotVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
    const [forgotSubmitting, setForgotSubmitting] = useState(false);
    const passwordInputRef = useRef<TextInput>(null);

    const insets = useSafeAreaInsets();

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

    if (isAuthenticated) {
        return <Redirect href="/home" />;
    }

    const getLoginErrorMessage = (error: any) => {
        const status = error?.response?.status;
        const backendMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message;

        if (status === 400) {
            return 'Revisá los datos ingresados e intentá nuevamente.';
        }

        if (status === 401) {
            return 'El correo o la contraseña no son correctos.';
        }

        if (status === 404) {
            return 'No encontramos una cuenta asociada a ese correo.';
        }

        if (status === 429) {
            return 'Se hicieron demasiados intentos. Esperá unos minutos e intentá nuevamente.';
        }

        if (status >= 500) {
            return 'El servidor no respondió correctamente. Puede estar iniciando o temporalmente ocupado. Intentá nuevamente en unos segundos.';
        }

        if (
            backendMessage?.includes('Network') ||
            backendMessage?.includes('Failed to fetch') ||
            backendMessage?.includes('Network request failed')
        ) {
            return 'No pudimos conectar con el servidor. Revisá tu conexión a internet o intentá nuevamente en unos segundos.';
        }

        return 'No pudimos iniciar sesión. Intentá nuevamente.';
    };

    const onSubmit = async (data: LoginFormValues) => {
        try {
            setServerError(null);

            const response = await loginRequest(
                data.email.trim().toLowerCase(),
                data.password
            );

            await saveAuthSession(response.user, response.token);

            router.replace('/auth-loading');
        } catch (error: any) {
            console.log('Error login:', error);
            setServerError(getLoginErrorMessage(error));
        }
    };

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

    const loginContent = (
        <ScrollView
            style={{ flex: 1, backgroundColor: COLORS.background }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                flexGrow: 1,
                backgroundColor: COLORS.background,
            }}
        >
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
                            className="text-2xl font-bold mb-4 text-center"
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
                                        autoCorrect={false}
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                                        className="flex-1 text-md"
                                        style={[
                                            {
                                                borderWidth: 0,
                                                color: '#222222',
                                                flex: 1,
                                            },
                                            Platform.OS === 'web'
                                                ? ({ outlineStyle: 'none' } as any)
                                                : null,
                                        ]}
                                    />
                                )}
                            />
                        </View>

                        <FieldError message={errors.email?.message} />

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
                                        ref={passwordInputRef}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="Ingrese su contraseña"
                                        placeholderTextColor="#7BCED1"
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit(onSubmit)}
                                        className="flex-1 text-md"
                                        style={[
                                            {
                                                borderWidth: 0,
                                                color: '#222222',
                                                flex: 1,
                                            },
                                            Platform.OS === 'web'
                                                ? ({ outlineStyle: 'none' } as any)
                                                : null,
                                        ]}
                                    />
                                )}
                            />
                        </View>

                        <FieldError message={errors.password?.message} />

                        {/* Olvidé contraseña */}
                        <View className="items-center mx-3 my-2 px-2 pb-2">
                            <Pressable
                                onPress={() => {
                                    setForgotError(null);
                                    setForgotSuccess(null);
                                    setForgotEmail('');
                                    setForgotVisible(true);
                                }}
                            >
                                <Text className="text-sm" style={{ color: COLORS.textMuted }}>
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
                <View
                    className="pt-2"
                    style={{
                        paddingBottom:
                            Platform.OS === 'web'
                                ? 8
                                : Math.max(insets.bottom + 8, 16),
                    }}
                >
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
            </View>
        </ScrollView>
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: COLORS.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
            {Platform.OS === 'web' ? (
                loginContent
            ) : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    {loginContent}
                </TouchableWithoutFeedback>
            )}

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
                            autoCorrect={false}
                            returnKeyType="send"
                            onSubmitEditing={handleForgotPassword}
                            className="rounded-2xl px-4 py-3 mb-2"
                            style={[
                                {
                                    backgroundColor: '#1A1A1A',
                                    color: COLORS.textLight,
                                    borderWidth: 1,
                                    borderColor: '#2F2F2F',
                                },
                                Platform.OS === 'web'
                                    ? ({
                                        outlineStyle: 'none',
                                        outlineWidth: 0,
                                        outlineColor: 'transparent',
                                    } as any)
                                    : null,
                            ]}
                        />

                        <AppStatusMessage
                            message={forgotError}
                            type="warning"
                        />

                        <AppStatusMessage
                            message={forgotSuccess}
                            type="success"
                        />

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
            <AppErrorModal
                visible={!!serverError}
                title="No pudimos iniciar sesión"
                message={serverError ?? ''}
                primaryText="Entendido"
                onPrimaryPress={() => setServerError(null)}
            />
        </KeyboardAvoidingView>

    );
}