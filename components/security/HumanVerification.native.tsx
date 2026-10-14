import React from 'react';

import {
    View,
    Text,
} from 'react-native';

import { COLORS } from '../../constants/colors';


type HumanVerificationProps = {
    onVerified: (
        token: string
    ) => void;

    onExpired?: () => void;

    onError?: () => void;
};


export default function HumanVerification(
    _props: HumanVerificationProps
) {
    return (
        <View
            style={{
                width: '100%',

                alignItems:
                    'center',

                justifyContent:
                    'center',

                paddingVertical: 20,

                paddingHorizontal: 16,
            }}
        >
            <Text
                style={{
                    color:
                        COLORS.textLight,

                    fontSize: 14,

                    fontWeight:
                        '700',

                    textAlign:
                        'center',
                }}
            >
                Verificación de seguridad
            </Text>


            <Text
                style={{
                    color:
                        COLORS.textMuted,

                    fontSize: 11,

                    textAlign:
                        'center',

                    lineHeight: 17,

                    marginTop: 8,
                }}
            >
                Esta verificación estará
                disponible en la versión
                nativa próximamente.
            </Text>
        </View>
    );
}