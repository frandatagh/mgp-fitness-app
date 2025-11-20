import { View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS } from '../constants/colors';
import { useState } from 'react';
import { loginRequest } from '../lib/auth';

// 1. Esquema de validación con Zod
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
    const [serverError, setServerError] = useState<string | null>(null);

    // 2. useForm de React Hook Form
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

    // 3. Qué pasa cuando el form es válido y se envía
    const onSubmit = async (data: LoginFormValues) => {
        setServerError(null);

        try {
            const response = await loginRequest(data.email, data.password);

            // TODO: más adelante vamos a guardar el token (response.token)
            // y el usuario (response.user) en un estado global / SecureStore.

            console.log('Login OK:', response);
            router.replace('/home');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error inesperado al iniciar sesión';

            setServerError(message);
        }
    };


    return (
        <View
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: COLORS.background }}
        >
            {/* LOGO / TITULO */}
            <View className="items-center mb-10">
                <Text
                    className="text-4xl font-extrabold tracking-tight"
                    style={{ color: COLORS.accent }}
                >
                    MGP <Text style={{ color: COLORS.primary }}>RUTINA</Text>
                </Text>
                <Text
                    className="text-4xl font-extrabold -mt-1"
                    style={{ color: COLORS.primary }}
                >
                    FITNESS
                </Text>
                <Text className="mt-4 text-base" style={{ color: COLORS.textLight }}>
                    ¡Tu entrenamiento al instante!
                </Text>
            </View>

            {/* CARD LOGIN */}
            <View
                className="w-full rounded-3xl px-6 py-7"
                style={{ backgroundColor: COLORS.card }}
            >
                <Text
                    className="text-2xl font-bold mb-6 text-center"
                    style={{ color: COLORS.textLight }}
                >
                    Iniciar sesión
                </Text>



                {/* Correo electrónico */}
                <Text
                    className="text-sm font-semibold mb-1"
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
                                className="flex-1 text-base"
                            />
                        )}
                    />
                </View>
                {errors.email && (
                    <Text className="text-xs mb-3" style={{ color: '#FFBABA' }}>
                        {errors.email.message}
                    </Text>
                )}

                {/* Contraseña */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Contraseña
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
                                className="flex-1 text-base"
                            />
                        )}
                    />
                </View>
                {errors.password && (
                    <Text className="text-xs mb-3" style={{ color: '#FFBABA' }}>
                        {errors.password.message}
                    </Text>
                )}

                {/* Recordarme / Olvidé */}
                <View className="flex-row justify-between items-center mb-5">
                    <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                        Recordarme
                    </Text>
                    <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                        Olvidé la contraseña?
                    </Text>
                </View>

                {/* Botón ingresar */}
                <Pressable
                    className="rounded-full py-3 items-center mb-4"
                    style={{ backgroundColor: COLORS.primary }}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    <Text className="text-base font-bold" style={{ color: '#224000' }}>
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
                    <Text className="text-center text-sm" style={{ color: COLORS.textLight }}>
                        ¿Eres nuevo?{' '}
                        <Text style={{ textDecorationLine: 'underline' }}>Registrarse</Text>
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
