import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../constants/colors';
import { resetPasswordRequest } from '../lib/auth';

export default function ResetPasswordScreen() {
    const { token } = useLocalSearchParams<{ token?: string }>();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [successVisible, setSuccessVisible] = useState(false);

    const tokenValue = useMemo(() => String(token ?? ''), [token]);

    const handleReset = async () => {
        setErrorText(null);

        if (!tokenValue) {
            setErrorText('El enlace de recuperación no es válido.');
            return;
        }

        if (password.length < 6) {
            setErrorText('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorText('Las contraseñas no coinciden.');
            return;
        }

        try {
            setSubmitting(true);
            await resetPasswordRequest(tokenValue, password);
            setSuccessVisible(true);
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            setErrorText(
                error instanceof Error
                    ? error.message
                    : 'No se pudo restablecer la contraseña.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: COLORS.background }}
        >
            <View className="items-center mb-5">
                <Image
                    source={require('../assets/img/iconhome.png')}
                    style={{ width: 180, height: 180 }}
                    resizeMode="contain"
                />
            </View>

            <View
                className="w-full rounded-3xl px-6 py-7"
                style={{ backgroundColor: COLORS.card, maxWidth: 600 }}
            >
                <Text
                    className="text-2xl font-bold mb-4 text-center"
                    style={{ color: COLORS.textLight }}
                >
                    Nueva contraseña
                </Text>

                <Text
                    className="text-[13px] text-center mb-5"
                    style={{ color: COLORS.textMuted }}
                >
                    Ingresa una nueva contraseña para tu cuenta.
                </Text>

                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Nueva contraseña
                </Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Ingresa la nueva contraseña"
                    placeholderTextColor="#7BCED1"
                    secureTextEntry
                    className="rounded-full px-4 py-3 bg-white mb-3"
                />

                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Confirmar contraseña
                </Text>
                <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirma la nueva contraseña"
                    placeholderTextColor="#7BCED1"
                    secureTextEntry
                    className="rounded-full px-4 py-3 bg-white mb-3"
                />

                {errorText && (
                    <Text
                        className="text-xs mb-3 text-center"
                        style={{ color: '#FFBABA' }}
                    >
                        {errorText}
                    </Text>
                )}

                <Pressable
                    onPress={handleReset}
                    disabled={submitting}
                    className="rounded-full py-3 items-center"
                    style={{ backgroundColor: COLORS.primary }}
                >
                    <Text
                        className="text-base font-semibold"
                        style={{ color: '#111111' }}
                    >
                        {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
                    </Text>
                </Pressable>
            </View>

            <Modal
                visible={successVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSuccessVisible(false)}
            >
                <View
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View
                        className="w-full max-w-xs rounded-3xl px-5 py-5"
                        style={{
                            backgroundColor: '#111111',
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                        }}
                    >
                        <Text
                            className="text-[16px] font-semibold text-center mb-2"
                            style={{ color: COLORS.textLight }}
                        >
                            Contraseña actualizada
                        </Text>

                        <Text
                            className="text-[13px] text-center mb-4"
                            style={{ color: COLORS.textMuted }}
                        >
                            Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.
                        </Text>

                        <Pressable
                            onPress={() => {
                                setSuccessVisible(false);
                                router.replace('/');
                            }}
                            className="items-center"
                        >
                            <Text
                                className="text-[13px] font-semibold underline"
                                style={{ color: COLORS.textLight }}
                            >
                                Ir al inicio de sesión
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}