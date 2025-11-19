import { View, Text, TextInput, Pressable } from 'react-native';
import { COLORS } from '../constants/colors';
import { router } from 'expo-router';

export default function RegisterScreen() {
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
                <View className="mb-3 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su nombre de usuario"
                        placeholderTextColor="#7BCED1"
                        className="flex-1 text-base"
                    />
                </View>

                {/* Correo electrónico */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Correo electrónico
                </Text>
                <View className="mb-3 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su correo electrónico"
                        placeholderTextColor="#7BCED1"
                        keyboardType="email-address"
                        className="flex-1 text-base"
                    />
                </View>

                {/* Nueva contraseña */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Nueva contraseña
                </Text>
                <View className="mb-3 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su contraseña"
                        placeholderTextColor="#7BCED1"
                        secureTextEntry
                        className="flex-1 text-base"
                    />
                </View>

                {/* Repetir contraseña */}
                <Text
                    className="text-sm font-semibold mb-1"
                    style={{ color: COLORS.textLight }}
                >
                    Repetir contraseña
                </Text>
                <View className="mb-4 rounded-full px-4 py-2 bg-white flex-row items-center">
                    <TextInput
                        placeholder="Ingrese su contraseña"
                        placeholderTextColor="#7BCED1"
                        secureTextEntry
                        className="flex-1 text-base"
                    />
                </View>

                {/* Términos */}
                <Text className="text-xs mb-4" style={{ color: COLORS.textMuted }}>
                    ☐ Aceptar <Text style={{ textDecorationLine: 'underline' }}>Términos y Condiciones</Text>
                </Text>

                {/* Botón crear cuenta */}
                <Pressable
                    className="rounded-full py-3 items-center mb-4"
                    style={{ backgroundColor: COLORS.primary }}
                    onPress={() => {
                        // Más adelante acá haremos el registro real.
                        router.replace('/home');
                    }}
                >
                    <Text className="text-base font-bold" style={{ color: '#224000' }}>
                        Crear nueva cuenta
                    </Text>
                </Pressable>

                {/* Volver al login */}
                <Pressable onPress={() => router.back()}>
                    <Text className="text-center text-sm" style={{ color: COLORS.textLight }}>
                        Ya tengo cuenta. Ingresar
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
