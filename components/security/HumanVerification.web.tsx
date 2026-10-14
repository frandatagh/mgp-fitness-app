import React from 'react';

import {
    View,
    Text,
} from 'react-native';

import {
    Turnstile,
} from '@marsidev/react-turnstile';

import {
    COLORS,
} from '../../constants/colors';


type HumanVerificationProps = {
    onVerified: (
        token: string
    ) => void;

    onExpired?: () => void;

    onError?: () => void;
};


export default function HumanVerification({
    onVerified,
    onExpired,
    onError,
}: HumanVerificationProps) {

    /*
     * Site Key pública.
     *
     * Local:
     * se obtiene desde .env
     *
     * Producción:
     * GitHub Actions la inyectará
     * durante el build.
     */
    const siteKey =
        process.env
            .EXPO_PUBLIC_TURNSTILE_SITE_KEY
            ?.trim();


    /*
     * Si no existe configuración,
     * no intentamos cargar Turnstile.
     */
    if (!siteKey) {
        return (
            <View
                style={{
                    width: '100%',

                    alignItems:
                        'center',

                    paddingVertical:
                        20,
                }}
            >
                <Text
                    style={{
                        color:
                            '#FF8A8A',

                        fontSize:
                            12,

                        textAlign:
                            'center',
                    }}
                >
                    La verificación de seguridad
                    no está configurada.
                </Text>
            </View>
        );
    }


    return (
        <View
            style={{
                width: '100%',

                alignItems:
                    'center',

                justifyContent:
                    'center',
            }}
        >
            {/* TÍTULO */}

            <Text
                style={{
                    color:
                        COLORS.textLight,

                    fontSize:
                        14,

                    fontWeight:
                        '700',

                    textAlign:
                        'center',

                    marginBottom:
                        6,
                }}
            >
                Verificación de seguridad
            </Text>


            {/* DESCRIPCIÓN */}

            <Text
                style={{
                    color:
                        COLORS.textMuted,

                    fontSize:
                        11,

                    textAlign:
                        'center',

                    lineHeight:
                        17,

                    marginBottom:
                        16,

                    paddingHorizontal:
                        10,
                }}
            >
                Comprueba que eres una persona
                antes de enviar el mensaje.
            </Text>


            {/* CLOUDFLARE TURNSTILE */}

            <View
                style={{
                    width:
                        '100%',

                    minHeight:
                        70,

                    alignItems:
                        'center',

                    justifyContent:
                        'center',

                    overflow:
                        'hidden',
                }}
            >
                <Turnstile
                    siteKey={
                        siteKey
                    }

                    onSuccess={(
                        token
                    ) => {
                        onVerified(
                            token
                        );
                    }}

                    onExpire={() => {
                        onExpired?.();
                    }}

                    onError={() => {
                        onError?.();
                    }}

                    options={{
                        theme:
                            'dark',

                        size:
                            'normal',
                    }}
                />
            </View>


            {/* PIE */}

            <Text
                style={{
                    color:
                        COLORS.textMuted,

                    fontSize:
                        9,

                    textAlign:
                        'center',

                    marginTop:
                        12,
                }}
            >
                Protección contra envíos automatizados
            </Text>

        </View>
    );
}