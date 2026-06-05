import { Text } from 'react-native';
import { COLORS } from '../../constants/colors';

type FieldErrorProps = {
    message?: string;
};

export default function FieldError({ message }: FieldErrorProps) {
    if (!message) return null;

    return (
        <Text
            style={{
                color: COLORS.primary,
                fontSize: 12,
                marginLeft: 16,
                marginTop: 4,
                marginBottom: 8,
                fontWeight: '700',
            }}
        >
            {message}
        </Text>
    );
}