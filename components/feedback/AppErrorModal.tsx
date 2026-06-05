import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type AppErrorModalProps = {
    visible: boolean;
    title?: string;
    message: string;
    primaryText?: string;
    secondaryText?: string;
    onPrimaryPress: () => void;
    onSecondaryPress?: () => void;
};

export default function AppErrorModal({
    visible,
    title = 'Ocurrió un problema',
    message,
    primaryText = 'Entendido',
    secondaryText,
    onPrimaryPress,
    onSecondaryPress,
}: AppErrorModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onSecondaryPress ?? onPrimaryPress}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}
            >
                <View
                    style={{
                        width: '100%',
                        maxWidth: 340,
                        backgroundColor: '#101010',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: 'rgba(239,68,68,0.65)',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: 'rgba(239,68,68,0.16)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 10,
                            }}
                        >
                            <Ionicons name="warning-outline" size={26} color="#FF6B6B" />
                        </View>

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 18,
                                fontWeight: '800',
                                textAlign: 'center',
                            }}
                        >
                            {title}
                        </Text>
                    </View>

                    <Text
                        style={{
                            color: '#D1D5DB',
                            fontSize: 13,
                            lineHeight: 20,
                            textAlign: 'center',
                            marginBottom: 18,
                        }}
                    >
                        {message}
                    </Text>

                    <View style={{ gap: 10 }}>
                        <Pressable
                            onPress={onPrimaryPress}
                            style={{
                                backgroundColor: '#1b1b1b',
                                borderWidth: 1,
                                borderColor: COLORS.primary,
                                paddingVertical: 13,
                                borderRadius: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#FFFFFF',
                                    fontSize: 14,
                                    fontWeight: '800',
                                }}
                            >
                                {primaryText}
                            </Text>
                        </Pressable>

                        {secondaryText && onSecondaryPress && (
                            <Pressable
                                onPress={onSecondaryPress}
                                style={{
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 1,
                                    borderColor: '#333333',
                                    paddingVertical: 13,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 14,
                                        fontWeight: '700',
                                    }}
                                >
                                    {secondaryText}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}