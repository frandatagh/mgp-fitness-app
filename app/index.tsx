import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const bannerImages = [
    require('../assets/img/faviconmgp.png'),
    require('../assets/img/iconhome.png'),
    require('../assets/img/iconrun.png'),
];

export default function LandingScreen() {
    const [bannerIndex, setBannerIndex] = useState(0);
    const directionRef = useRef(1);
    const deferredPromptRef = useRef<any>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setBannerIndex((current) => {
                let next = current + directionRef.current;

                if (next >= bannerImages.length - 1) {
                    directionRef.current = -1;
                    next = bannerImages.length - 1;
                }

                if (next <= 0) {
                    directionRef.current = 1;
                    next = 0;
                }

                return next;
            });
        }, 2800);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleBeforeInstallPrompt = (event: any) => {
            event.preventDefault();
            deferredPromptRef.current = event;
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            );
        };
    }, []);

    const handleInstallAndroid = async () => {
        if (Platform.OS !== 'web') return;

        const promptEvent = deferredPromptRef.current;

        if (promptEvent) {
            promptEvent.prompt();
            await promptEvent.userChoice;
            deferredPromptRef.current = null;
            return;
        }

        Alert.alert(
            'Instalar en Android',
            'Abrí esta página desde Chrome, tocá el menú de los tres puntos y elegí “Agregar a pantalla principal” o “Instalar app”.'
        );
    };

    const handleInstallIos = () => {
        Alert.alert(
            'Instalar en iPhone',
            'Abrí esta página desde Safari. Tocá el botón Compartir y luego “Agregar a pantalla de inicio”.'
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 26 }}
            >
                {/* Header */}
                <View
                    style={{
                        minHeight: 58,
                        paddingHorizontal: 18,
                        paddingTop: 12,
                        paddingBottom: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#242424',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#0B0B0B',
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={require('../assets/img/faviconmgp.png')}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                marginRight: 10,
                            }}
                            resizeMode="contain"
                        />

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 18,
                                fontWeight: '900',
                            }}
                        >
                            Mardel Fitness
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Link href="/login" asChild>
                            <Pressable
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: '#3A3A3A',
                                    backgroundColor: '#151515',
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 12,
                                        fontWeight: '800',
                                    }}
                                >
                                    Iniciar sesión
                                </Text>
                            </Pressable>
                        </Link>

                        <Link href="/register" asChild>
                            <Pressable
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: COLORS.primary,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontSize: 12,
                                        fontWeight: '900',
                                    }}
                                >
                                    Registrarse
                                </Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>

                {/* Banner */}
                <View
                    style={{
                        paddingHorizontal: 18,
                        paddingTop: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#111111',
                            borderRadius: 28,
                            borderWidth: 1,
                            borderColor: 'rgba(198,255,0,0.28)',
                            overflow: 'hidden',
                            minHeight: 260,
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 22,
                        }}
                    >
                        <Image
                            source={bannerImages[bannerIndex]}
                            style={{
                                width: '100%',
                                height: 170,
                                maxWidth: 420,
                            }}
                            resizeMode="contain"
                        />

                        <Text
                            style={{
                                color: COLORS.primary,
                                fontSize: 13,
                                fontWeight: '900',
                                marginTop: 14,
                                textAlign: 'center',
                            }}
                        >
                            Entrená, registrá y seguí tu progreso
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 28,
                                fontWeight: '900',
                                marginTop: 8,
                                textAlign: 'center',
                                lineHeight: 33,
                            }}
                        >
                            Tu rutina fitness en una app simple y gratuita
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 14,
                                marginTop: 10,
                                textAlign: 'center',
                                lineHeight: 21,
                                maxWidth: 560,
                            }}
                        >
                            Creá rutinas, guardá ejercicios, registrá actividad y
                            visualizá tu progreso desde el celular o navegador.
                        </Text>
                    </View>
                </View>

                {/* Panel instalación */}
                <View
                    style={{
                        marginHorizontal: 18,
                        marginTop: 18,
                        backgroundColor: '#151515',
                        borderRadius: 26,
                        borderWidth: 1,
                        borderColor: '#303030',
                        padding: 18,
                    }}
                >
                    <Text
                        style={{
                            color: COLORS.textLight,
                            fontSize: 21,
                            fontWeight: '900',
                            marginBottom: 8,
                            textAlign: 'center',
                        }}
                    >
                        Instalá Mardel Fitness en tu celular
                    </Text>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 13,
                            lineHeight: 20,
                            textAlign: 'center',
                            marginBottom: 16,
                        }}
                    >
                        Esta es una app web gratuita. Podés agregarla a la pantalla
                        de inicio de tu celular para usarla con acceso rápido, sin
                        pasar por App Store o Play Store.
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            onPress={handleInstallAndroid}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                                borderRadius: 18,
                                paddingVertical: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                            })}
                        >
                            <Ionicons
                                name="logo-android"
                                size={22}
                                color="#111111"
                                style={{ marginRight: 7 }}
                            />
                            <Text
                                style={{
                                    color: '#111111',
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Instalar Android
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleInstallIos}
                            style={({ pressed }) => ({
                                flex: 1,
                                backgroundColor: pressed ? '#333333' : '#242424',
                                borderRadius: 18,
                                paddingVertical: 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                borderWidth: 1,
                                borderColor: '#3A3A3A',
                            })}
                        >
                            <Ionicons
                                name="logo-apple"
                                size={22}
                                color="#FFFFFF"
                                style={{ marginRight: 7 }}
                            />
                            <Text
                                style={{
                                    color: '#FFFFFF',
                                    fontSize: 13,
                                    fontWeight: '900',
                                }}
                            >
                                Instalar iPhone
                            </Text>
                        </Pressable>
                    </View>

                    <View
                        style={{
                            marginTop: 16,
                            backgroundColor: 'rgba(255,193,7,0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,193,7,0.25)',
                            borderRadius: 18,
                            padding: 13,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFD36A',
                                fontSize: 13,
                                fontWeight: '900',
                                marginBottom: 5,
                            }}
                        >
                            Sobre los permisos
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            Algunas funciones pueden solicitar permisos del dispositivo,
                            como ubicación o acceso a imágenes. Estos permisos se utilizan
                            únicamente para brindar el servicio gratuito de entrenamiento,
                            registro de actividad y uso personalizado de la app.
                        </Text>
                    </View>

                    <View style={{ marginTop: 14 }}>
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: 13,
                                fontWeight: '900',
                                marginBottom: 6,
                            }}
                        >
                            Cómo instalar:
                        </Text>

                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                lineHeight: 19,
                            }}
                        >
                            Android: abrí la app desde Chrome y tocá “Instalar app” o
                            “Agregar a pantalla principal”.
                            {'\n'}
                            iPhone: abrí la app desde Safari, tocá Compartir y elegí
                            “Agregar a pantalla de inicio”.
                        </Text>
                    </View>
                </View>

                {/* Acceso directo */}
                <View
                    style={{
                        marginHorizontal: 18,
                        marginTop: 18,
                        alignItems: 'center',
                    }}
                >
                    <Link href="/login" asChild>
                        <Pressable
                            style={({ pressed }) => ({
                                width: '100%',
                                maxWidth: 420,
                                backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                                borderRadius: 18,
                                paddingVertical: 15,
                                alignItems: 'center',
                            })}
                        >
                            <Text
                                style={{
                                    color: '#111111',
                                    fontSize: 15,
                                    fontWeight: '900',
                                }}
                            >
                                Entrar a la app
                            </Text>
                        </Pressable>
                    </Link>
                </View>

                {/* Footer */}
                <View
                    style={{
                        marginTop: 28,
                        paddingHorizontal: 18,
                        paddingVertical: 22,
                        borderTopWidth: 1,
                        borderTopColor: '#242424',
                    }}
                >
                    <Text
                        style={{
                            color: COLORS.textLight,
                            fontSize: 15,
                            fontWeight: '900',
                            textAlign: 'center',
                            marginBottom: 12,
                        }}
                    >
                        Mardel Fitness
                    </Text>

                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 12,
                        }}
                    >
                        <FooterLink label="Soporte" route="/support" />
                        <FooterLink label="Términos" route="/terms" />
                        <FooterLink label="Privacidad" route="/privacy" />
                        <FooterLink label="Acerca de" route="/about" />
                        <FooterExternal label="Contacto" url="mailto:soporte@mardelfitness.com" />
                    </View>

                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 11,
                            textAlign: 'center',
                            marginTop: 14,
                        }}
                    >
                        © 2026 Mardel Fitness. Servicio gratuito en etapa inicial.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

function FooterLink({ label, route }: { label: string; route: string }) {
    return (
        <Pressable onPress={() => router.push(route as any)}>
            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function FooterExternal({ label, url }: { label: string; url: string }) {
    return (
        <Pressable onPress={() => Linking.openURL(url)}>
            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}