import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    ImageBackground,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const bannerImages = [
    require('../assets/img/landingbanner01.png'),
    require('../assets/img/landingbanner02.png'),
    require('../assets/img/landingbanner03.jpg'),
];

function navigateWebRoute(route: string) {
    if (Platform.OS === 'web') {
        const isGithubPages =
            typeof window !== 'undefined' &&
            window.location.hostname.includes('github.io');

        if (isGithubPages) {
            window.location.href = `/mgp-fitness-app${route}`;
            return;
        }
    }

    router.push(route as any);
}

export default function LandingScreen() {
    const [bannerIndex, setBannerIndex] = useState(0);
    const { width } = useWindowDimensions();

    const bannerContainerWidth = Math.min(width - 36, 1360);

    const bannerHeight =
        width >= 900
            ? bannerContainerWidth * 0.5625
            : width >= 600
                ? bannerContainerWidth * 0.58
                : bannerContainerWidth * 1.1;

    const isDesktop = width >= 900;
    const isTablet = width >= 600;
    const isSmallMobile = width < 390;
    const isMobile = width < 600;

    const pageHorizontalPadding = isDesktop ? 28 : 14;
    const contentMaxWidth = 1180;
    const panelMaxWidth = 1060;

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
        }, 5000);

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

    const goToPage = (route: 'login' | 'register') => {
        const path = `/${route}` as const;

        if (Platform.OS === 'web') {
            const isGithubPages =
                typeof window !== 'undefined' &&
                window.location.hostname.includes('github.io');

            if (isGithubPages) {
                window.location.href = `/mgp-fitness-app${path}`;
                return;
            }

            router.push(path);
            return;
        }

        router.push(path);
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
                        minHeight: isSmallMobile ? 56 : 64,
                        paddingHorizontal: pageHorizontalPadding,
                        paddingVertical: isSmallMobile ? 8 : 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#242424',
                        backgroundColor: '#0B0B0B',
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: contentMaxWidth,
                            alignSelf: 'center',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flexShrink: 1,
                                minWidth: 0,
                            }}
                        >
                            <Image
                                source={require('../assets/img/iconrun.png')}
                                style={{
                                    width: isSmallMobile ? 34 : 42,
                                    height: isSmallMobile ? 34 : 42,
                                    marginRight: 6,
                                }}
                                resizeMode="contain"
                            />

                            <Text
                                numberOfLines={1}
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: isSmallMobile ? 13 : 16,
                                    fontWeight: '900',
                                    flexShrink: 1,
                                }}
                            >
                                Mardel Fitness App
                            </Text>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: isSmallMobile ? 6 : 8,
                                flexShrink: 0,
                            }}
                        >
                            <Pressable
                                onPress={() => goToPage('login')}
                                style={({ pressed }) => ({
                                    paddingHorizontal: isSmallMobile ? 9 : 13,
                                    paddingVertical: isSmallMobile ? 7 : 9,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: '#3A3A3A',
                                    backgroundColor: pressed ? '#222222' : '#151515',
                                })}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: isSmallMobile ? 10 : 12,
                                        fontWeight: '800',
                                    }}
                                >
                                    Iniciar sesión
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => goToPage('register')}
                                style={({ pressed }) => ({
                                    paddingHorizontal: isSmallMobile ? 9 : 13,
                                    paddingVertical: isSmallMobile ? 7 : 9,
                                    borderRadius: 999,
                                    backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                                })}
                            >
                                <Text
                                    style={{
                                        color: '#111111',
                                        fontSize: isSmallMobile ? 10 : 12,
                                        fontWeight: '900',
                                    }}
                                >
                                    Registrarse
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Banner */}
                <View>
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 1360,
                            alignSelf: 'center',
                            height: bannerHeight,
                            backgroundColor: '#111111',
                            overflow: 'hidden',
                        }}
                    >
                        <ImageBackground
                            source={bannerImages[bannerIndex]}
                            resizeMode={width >= 700 ? 'contain' : 'cover'}
                            style={{
                                flex: 1,
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#050505',
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(0,0,0,0.02)',
                                }}
                            />
                        </ImageBackground>
                    </View>
                </View>

                {/* Panel instalación */}
                <View
                    style={{
                        width: '100%',
                        maxWidth: panelMaxWidth,
                        alignSelf: 'center',
                        marginTop: isDesktop ? 18 : 14,
                        paddingHorizontal: pageHorizontalPadding,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#151515',
                            borderRadius: isDesktop ? 28 : 22,
                            borderWidth: 1,
                            borderColor: '#303030',
                            padding: isDesktop ? 24 : isSmallMobile ? 14 : 16,
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.textLight,
                                fontSize: isDesktop ? 25 : isSmallMobile ? 18 : 20,
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
                                fontSize: isDesktop ? 14 : 12,
                                lineHeight: isDesktop ? 22 : 19,
                                textAlign: 'center',
                                maxWidth: 720,
                                alignSelf: 'center',
                                marginBottom: isDesktop ? 22 : 12,
                            }}
                        >
                            Esta es una app web gratuita. Podés agregarla a la pantalla
                            de inicio de tu celular para usarla con acceso rápido, sin
                            pasar por App Store o Play Store.
                        </Text>

                        <View
                            style={{
                                flexDirection: isDesktop ? 'row' : 'column',
                                gap: isDesktop ? 16 : 10,
                                alignItems: 'stretch',
                            }}
                        >
                            {/* Instrucciones */}
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: isMobile ? 'transparent' : '#101010',
                                    borderRadius: isMobile ? 0 : 20,
                                    borderWidth: isMobile ? 0 : 1,
                                    borderColor: '#252525',
                                    padding: isMobile ? 0 : 15,
                                }}
                            >
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: isSmallMobile ? 12 : 14,
                                        fontWeight: '900',
                                        marginBottom: isSmallMobile ? 4 : 8,
                                    }}
                                >
                                    Cómo instalar:
                                </Text>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: isSmallMobile ? 10 : 11.5,
                                        lineHeight: isSmallMobile ? 15 : 17,
                                    }}
                                >
                                    Android: abrí la app desde Chrome y tocá “Instalar app”
                                    o “Agregar a pantalla principal”.
                                    {'\n'}
                                    iPhone: abrí la app desde Safari, tocá Compartir y elegí
                                    “Agregar a pantalla de inicio”.
                                </Text>
                            </View>

                            {/* Botones + permisos */}
                            <View
                                style={{
                                    flex: isDesktop ? 1.1 : undefined,
                                    marginTop: isMobile ? 0 : 0,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: isDesktop ? 'row' : 'column',
                                        gap: isMobile ? 8 : 16,
                                        alignItems: 'stretch',
                                    }}
                                >
                                    <Pressable
                                        onPress={handleInstallAndroid}
                                        style={({ pressed }) => ({
                                            flex: 1,
                                            backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                                            borderRadius: 18,
                                            paddingVertical: isSmallMobile ? 9 : 12,
                                            paddingHorizontal: 12,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'row',
                                            minHeight: isSmallMobile ? 42 : 48,
                                        })}
                                    >
                                        <Ionicons
                                            name="logo-android"
                                            size={21}
                                            color="#111111"
                                            style={{ marginRight: 7 }}
                                        />
                                        <Text
                                            style={{
                                                color: '#111111',
                                                fontSize: isSmallMobile ? 12 : 13,
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
                                            paddingVertical: isSmallMobile ? 9 : 12,
                                            paddingHorizontal: 12,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'row',
                                            borderWidth: 1,
                                            borderColor: '#3A3A3A',
                                            minHeight: isSmallMobile ? 42 : 48,
                                        })}
                                    >
                                        <Ionicons
                                            name="logo-apple"
                                            size={21}
                                            color="#FFFFFF"
                                            style={{ marginRight: 7 }}
                                        />
                                        <Text
                                            style={{
                                                color: '#FFFFFF',
                                                fontSize: isSmallMobile ? 12 : 13,
                                                fontWeight: '900',
                                            }}
                                        >
                                            Instalar iPhone
                                        </Text>
                                    </Pressable>
                                </View>

                                <View
                                    style={{
                                        marginTop: isMobile ? 8 : 12,
                                        padding: isSmallMobile ? 9 : 12,
                                        backgroundColor: 'rgba(255,193,7,0.08)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,193,7,0.25)',
                                        borderRadius: 18,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FFD36A',
                                            fontSize: isSmallMobile ? 12 : 13,
                                            fontWeight: '900',
                                            marginBottom: 4,
                                        }}
                                    >
                                        Sobre los permisos
                                    </Text>

                                    <Text
                                        style={{
                                            color: COLORS.textMuted,
                                            fontSize: isSmallMobile ? 10 : 11.5,
                                            lineHeight: isSmallMobile ? 15 : 17,
                                        }}
                                    >
                                        Algunas funciones pueden solicitar permisos del dispositivo,
                                        como ubicación o acceso a imágenes. Estos permisos se utilizan
                                        únicamente para brindar el servicio gratuito de entrenamiento,
                                        registro de actividad y uso personalizado de la app.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Acceso directo */}
                <View
                    style={{
                        width: '100%',
                        maxWidth: 460,
                        alignSelf: 'center',
                        marginTop: isMobile ? 18 : 18,
                        paddingHorizontal: pageHorizontalPadding,
                    }}
                >
                    <Pressable
                        onPress={() => goToPage('login')}
                        style={({ pressed }) => ({
                            width: '100%',
                            backgroundColor: pressed ? '#B8F000' : COLORS.primary,
                            borderRadius: 18,
                            paddingVertical: isSmallMobile ? 12 : 15,
                            alignItems: 'center',
                            shadowColor: '#9DFF00',
                            shadowOpacity: 0.18,
                            shadowRadius: 12,
                            elevation: 3,
                        })}
                    >
                        <Text
                            style={{
                                color: '#111111',
                                fontSize: isSmallMobile ? 14 : 15,
                                fontWeight: '900',
                            }}
                        >
                            Entrar a la app
                        </Text>
                    </Pressable>
                </View>

                {/* Footer */}
                <View
                    style={{
                        marginTop: isDesktop ? 34 : 24,
                        paddingHorizontal: pageHorizontalPadding,
                        paddingVertical: 24,
                        borderTopWidth: 1,
                        borderTopColor: '#242424',
                        backgroundColor: '#090909',
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: contentMaxWidth,
                            alignSelf: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 14,
                            }}
                        >
                            <Image
                                source={require('../assets/img/iconrun.png')}
                                style={{
                                    width: 30,
                                    height: 30,
                                    marginRight: 8,
                                }}
                                resizeMode="contain"
                            />

                            <Text
                                style={{
                                    color: COLORS.textLight,
                                    fontSize: 15,
                                    fontWeight: '900',
                                }}
                            >
                                Mardel Fitness
                            </Text>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 12,
                                maxWidth: 620,
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
                                lineHeight: 17,
                            }}
                        >
                            © 2026 Mardel Fitness. Servicio gratuito en etapa inicial.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function FooterLink({ label, route }: { label: string; route: string }) {
    return (
        <Pressable onPress={() => navigateWebRoute(route)}>
            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                    textDecorationLine: 'underline',
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
                    textDecorationLine: 'underline',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}