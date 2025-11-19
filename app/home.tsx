import { View, Text } from 'react-native';
import { COLORS } from '../constants/colors';

export default function HomeScreen() {
    return (
        <View
            className="flex-1 px-4 pt-10 pb-6"
            style={{ backgroundColor: COLORS.background }}
        >
            {/* Logo */}
            <View className="items-center mb-6">
                <Text
                    className="text-3xl font-extrabold tracking-tight"
                    style={{ color: COLORS.accent }}
                >
                    MGP <Text style={{ color: COLORS.primary }}>RUTINA</Text> FITNESS
                </Text>
            </View>

            {/* Placeholder de contenido */}
            <View className="flex-1 items-center justify-center">
                <Text className="text-lg mb-2" style={{ color: COLORS.textLight }}>
                    Mis rutinas
                </Text>
                <Text className="text-sm text-center px-6" style={{ color: COLORS.textMuted }}>
                    Aquí vamos a mostrar tus rutinas guardadas, con tarjetas similares
                    al diseño que ya hiciste.
                </Text>
            </View>
        </View>
    );
}
