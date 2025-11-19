import { View, Text, TextInput, Pressable } from 'react-native';
import { COLORS } from '../constants/colors';
import { router } from 'expo-router';

export default function LoginScreen() {
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

                {/* Email */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Correo electrónico
                </Text>
                <View className="mb-4 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su correo electrónico"
                        placeholderTextColor="#7BCED1"
                        keyboardType="email-address"
                        className="flex-1 text-base"
                    />
                </View>

                {/* Password */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Contraseña
                </Text>
                <View className="mb-2 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su contraseña"
                        placeholderTextColor="#7BCED1"
                        secureTextEntry
                        className="flex-1 text-base"
                    />
                </View>

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
                    onPress={() => {
                        // Más adelante acá haremos el login real.
                        router.push('/home');
                    }}
                >
                    <Text className="text-base font-bold" style={{ color: '#224000' }}>
                        Ingresar cuenta
                    </Text>
                </Pressable>

                {/* Link registro */}
                <Pressable onPress={() => router.push('/register')}>
                    <Text className="text-center text-sm" style={{ color: COLORS.textLight }}>
                        ¿Eres nuevo? <Text style={{ textDecorationLine: 'underline' }}>Registrarse</Text>
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
