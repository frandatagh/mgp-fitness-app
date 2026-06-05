import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type AppStatusMessageProps = {
    message?: string | null;
    type?: 'success' | 'info' | 'warning';
};

export default function AppStatusMessage({
    message,
    type = 'info',
}: AppStatusMessageProps) {
    if (!message) return null;

    const config = {
        success: {
            icon: 'checkmark-circle-outline' as const,
            color: COLORS.primary,
            backgroundColor: 'rgba(198,255,0,0.10)',
            borderColor: 'rgba(198,255,0,0.45)',
        },
        info: {
            icon: 'information-circle-outline' as const,
            color: '#7DD3FC',
            backgroundColor: 'rgba(125,211,252,0.10)',
            borderColor: 'rgba(125,211,252,0.40)',
        },
        warning: {
            icon: 'alert-circle-outline' as const,
            color: '#FACC15',
            backgroundColor: 'rgba(250,204,21,0.10)',
            borderColor: 'rgba(250,204,21,0.40)',
        },
    }[type];

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: config.backgroundColor,
                borderColor: config.borderColor,
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginTop: 10,
            }}
        >
            <Ionicons name={config.icon} size={18} color={config.color} />

            <Text
                style={{
                    flex: 1,
                    color: config.color,
                    fontSize: 12,
                    fontWeight: '700',
                    lineHeight: 18,
                }}
            >
                {message}
            </Text>
        </View>
    );
}