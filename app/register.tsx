import { View, Text, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS } from '../constants/colors';
import { useState } from 'react';
import { registerRequest } from '../lib/auth';


// 1. Esquema de validación de registro
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
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {

    const [serverError, setServerError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setServerError(null);

        try {
            const response = await registerRequest({
                username: data.username,
                email: data.email,
                password: data.password,
            });

            console.log('Register OK:', response);
            // Podés llevar al usuario a Home directamente o al login:
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
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: COLORS.background }}
        >
            {/* LOGO GRANDE */}
            <View className="items-center mb-6">
                <Text
                    className="text-5xl font-extrabold tracking-tight"
                    style={{ color: COLORS.accent }}
                >
                    MGP
                </Text>
                <Text
                    className="text-4xl font-extrabold -mt-2 text-center"
                    style={{ color: COLORS.primary }}
                >
                    RUTINA{'\n'}FITNESS
                </Text>
            </View>

            {/* CARD REGISTRO */}
            <View
                className="w-full rounded-3xl px-6 py-7"
                style={{ backgroundColor: COLORS.card }}
            >
                <Text
                    className="text-2xl font-bold mb-6 text-center"
                    style={{ color: COLORS.textLight }}
                >
                    Registrate
                </Text>



                {/* Nombre de usuario */}
                <Text
                    className="text-sm font-semibold mb-1"
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
                                className="flex-1 text-base"
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
                    <Text className="text-xs mb-2" style={{ color: '#FFBABA' }}>
                        {errors.email.message}
                    </Text>
                )}

                {/* Nueva contraseña */}
                <Text
                    className="text-sm font-semibold mb-1"
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
                                className="flex-1 text-base"
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
                    className="text-sm font-semibold mb-1"
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
                                placeholder="Ingrese su contraseña"
                                placeholderTextColor="#7BCED1"
                                secureTextEntry
                                className="flex-1 text-base"
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
                <Text className="text-xs mb-4" style={{ color: COLORS.textMuted }}>
                    ☐ Aceptar{' '}
                    <Text style={{ textDecorationLine: 'underline' }}>
                        Términos y Condiciones
                    </Text>
                </Text>

                {/* Botón crear cuenta */}
                <Pressable
                    className="rounded-full py-3 items-center mb-4"
                    style={{ backgroundColor: COLORS.primary }}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    <Text className="text-base font-bold" style={{ color: '#224000' }}>
                        {isSubmitting ? 'Creando cuenta...' : 'Crear nueva cuenta'}
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

            </View>
        </View>
    );
}
