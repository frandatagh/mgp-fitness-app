import { View, Text } from 'react-native';
import { COLORS } from '../constants/colors';

type RoutineCardProps = {
    title: string;
    description: string;
    highlighted?: boolean;
    tag?: string;
};

export function RoutineCard({
    title,
    description,
    highlighted,
    tag,
}: RoutineCardProps) {
    return (
        <View
            className="rounded-2xl p-4 mb-4"
            style={
                highlighted
                    ? {} // primera tarjeta sin fondo, solo texto “flotando”
                    : { backgroundColor: '#222222' } // tarjetas siguientes con fondo gris oscuro
            }
        >
            <Text
                className="text-lg font-bold mb-2"
                style={{ color: COLORS.textLight }}
            >
                {title}
            </Text>
            <Text
                className="text-sm leading-5"
                style={{ color: COLORS.textLight }}
            >
                {description}
            </Text>

            {tag && (
                <View className="items-end mt-3">
                    <Text
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ backgroundColor: COLORS.primary, color: '#224000' }}
                    >
                        {tag}
                    </Text>
                </View>
            )}
        </View>
    );
}
