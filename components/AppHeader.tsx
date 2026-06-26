import { useEffect, useState, useRef } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../lib/profile';

type AppHeaderProps = {
    showProfile?: boolean;
    profileGreeting?: string | null;
};

function getInitials(nameOrEmail: string) {
    const clean = nameOrEmail.trim();

    if (!clean) return 'U';

    if (clean.includes('@')) {
        return clean.charAt(0).toUpperCase();
    }

    const parts = clean.split(' ').filter(Boolean);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function MenuItem({
    icon,
    label,
    onPress,
    danger = false,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: pressed
                    ? danger
                        ? 'rgba(255,120,120,0.10)'
                        : 'rgba(198,255,0,0.08)'
                    : 'transparent',
                marginBottom: 2,
            })}
        >
            <Ionicons
                name={icon}
                size={20}
                color={danger ? '#FFBABA' : COLORS.textMuted}
                style={{ marginRight: 11 }}
            />

            <Text
                style={{
                    color: danger ? '#FFBABA' : COLORS.textLight,
                    fontSize: 14,
                    fontWeight: danger ? '800' : '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}


export default function AppHeader({ showProfile = true, profileGreeting = null }: AppHeaderProps) {
    const insets = useSafeAreaInsets();
    const { user, logout, isAuthenticated } = useAuth();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const drawerTranslateX = useRef(new Animated.Value(-320)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

    const displayName =
        profileDisplayName ??
        user?.name ??
        user?.email ??
        'usuario';

    const userInitials = getInitials(displayName);



    useEffect(() => {
        const loadProfileImage = async () => {
            try {
                if (!isAuthenticated) {
                    setProfileImageUrl(null);
                    setProfileDisplayName(null);
                    return;
                }

                const data = await getMyProfile();

                setProfileImageUrl(data.profile.profileImageUrl);
                setProfileDisplayName(data.user.name ?? data.user.email);
            } catch (error) {
                console.log('Error cargando imagen de perfil en AppHeader:', error);
            }
        };

        loadProfileImage();
    }, [isAuthenticated]);

    const handleLogout = async () => {
        await logout();
        setDrawerOpen(false);
        setDrawerVisible(false);
        router.replace('/');
    };

    const openDrawer = () => {
        setDrawerVisible(true);
        setDrawerOpen(true);

        drawerTranslateX.setValue(-320);
        backdropOpacity.setValue(0);

        Animated.parallel([
            Animated.timing(drawerTranslateX, {
                toValue: 0,
                duration: 240,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 240,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.timing(drawerTranslateX, {
                toValue: -320,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setDrawerOpen(false);
            setDrawerVisible(false);
        });
    };

    return (
        <>
            <View
                style={{
                    height: 88,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    marginHorizontal: 8,
                }}
            >
                {/* Menú hamburguesa */}
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Pressable
                        onPress={openDrawer}
                        style={{
                            width: 44,
                            height: 44,
                            top: 5,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="menu" size={40} color={COLORS.textLight} />
                    </Pressable>
                </View>

                {/* Logo centrado */}
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',

                    }}
                >
                    <Image
                        source={require('../assets/img/icontwist.png')}
                        style={{ width: 184, height: 130, top: 5 }}
                        resizeMode="contain"
                    />
                </View>

                {/* Perfil opcional */}
                <View
                    style={{
                        flex: 1,
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                >
                    {showProfile && isAuthenticated ? (
                        <Pressable
                            onPress={() => router.push('/profile')}
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <View
                                style={{
                                    marginTop: 23,
                                    right: -5,
                                    width: 60,
                                    height: 60,
                                    borderRadius: 100,
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 3,
                                    borderColor: 'rgba(255,255,255,0.35)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {profileImageUrl ? (
                                    <Image
                                        source={{ uri: profileImageUrl }}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 100,
                                        }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text
                                        style={{
                                            color: COLORS.primary,
                                            fontSize: 15,
                                            fontWeight: '900',
                                        }}
                                    >
                                        {userInitials}
                                    </Text>
                                )}
                            </View>

                            {profileGreeting ? (
                                <View
                                    style={{
                                        marginTop: -5,
                                        right: -5,
                                        backgroundColor: COLORS.primary,
                                        borderRadius: 999,
                                        borderWidth: 2,
                                        borderColor: '#444444',
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                        maxWidth: 95,
                                    }}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            color: '#111111',
                                            fontSize: 12,
                                            fontWeight: '600',
                                        }}
                                    >
                                        {profileGreeting}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                    ) : (
                        <View style={{ width: 50, height: 50 }} />
                    )}
                </View>
            </View >

            <Modal
                visible={drawerVisible}
                transparent
                animationType="none"
                onRequestClose={closeDrawer}
            >
                <View style={{ flex: 1, flexDirection: 'row' }}>
                    <Animated.View
                        style={{
                            width: 300,
                            maxWidth: '82%',
                            backgroundColor: '#101010',
                            borderRightWidth: 1,
                            borderRightColor: 'rgba(198,255,0,0.35)',
                            paddingTop: insets.top + 18,
                            paddingHorizontal: 16,
                            paddingBottom: insets.bottom + 18,
                            transform: [{ translateX: drawerTranslateX }],
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 14,
                            }}
                        >
                            <Pressable
                                onPress={closeDrawer}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 19,
                                    backgroundColor: '#1b1b1b',
                                    borderWidth: 1,
                                    borderColor: '#333333',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}
                            >
                                <Ionicons name="close" size={21} color={COLORS.textLight} />
                            </Pressable>

                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: COLORS.textLight,
                                        fontSize: 17,
                                        fontWeight: '900',
                                    }}
                                >
                                    Menú
                                </Text>

                                <Text
                                    style={{
                                        color: COLORS.textMuted,
                                        fontSize: 14,
                                        marginTop: 2,
                                    }}
                                >
                                    Mardel Fitness App
                                </Text>
                            </View>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {isAuthenticated ? (
                                <>
                                    <Text
                                        style={{
                                            color: COLORS.textMuted,
                                            fontSize: 11,
                                            fontWeight: '900',
                                            marginBottom: 8,
                                            marginLeft: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.8,
                                        }}
                                    >
                                        Principal
                                    </Text>

                                    <MenuItem
                                        icon="home-outline"
                                        label="Home"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/home');
                                        }}
                                    />

                                    <MenuItem
                                        icon="person-circle-outline"
                                        label="Tu perfil"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/profile');
                                        }}
                                    />

                                    <MenuItem
                                        icon="walk-outline"
                                        label="Running en vivo"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/liverun');
                                        }}
                                    />

                                    <MenuItem
                                        icon="stats-chart-outline"
                                        label="Estadísticas"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/statistics');
                                        }}
                                    />

                                    <MenuItem
                                        icon="bulb-outline"
                                        label="Sugerencias"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/suggestions');
                                        }}
                                    />

                                    <MenuItem
                                        icon="time-outline"
                                        label="Historial"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/statistics-history');
                                        }}
                                    />

                                    <MenuItem
                                        icon="settings-outline"
                                        label="Tu cuenta"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/account');
                                        }}
                                    />

                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: '#2a2a2a',
                                            marginVertical: 12,
                                        }}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text
                                        style={{
                                            color: COLORS.textMuted,
                                            fontSize: 11,
                                            fontWeight: '900',
                                            marginBottom: 8,
                                            marginLeft: 4,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.8,
                                        }}
                                    >
                                        Acceso
                                    </Text>

                                    <MenuItem
                                        icon="log-in-outline"
                                        label="Iniciar sesión"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/');
                                        }}
                                    />

                                    <MenuItem
                                        icon="person-add-outline"
                                        label="Registrarse"
                                        onPress={() => {
                                            closeDrawer();
                                            router.push('/register');
                                        }}
                                    />

                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: '#2a2a2a',
                                            marginVertical: 12,
                                        }}
                                    />
                                </>
                            )}

                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: 11,
                                    fontWeight: '900',
                                    marginBottom: 8,
                                    marginLeft: 4,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.8,
                                }}
                            >
                                Información
                            </Text>

                            <MenuItem
                                icon="information-circle-outline"
                                label="Información"
                                onPress={() => {
                                    closeDrawer();
                                    router.push('/info');
                                }}
                            />

                            <MenuItem
                                icon="people-outline"
                                label="Acerca de nosotros"
                                onPress={() => {
                                    closeDrawer();
                                    router.push('/about');
                                }}
                            />

                            <MenuItem
                                icon="help-circle-outline"
                                label="Soporte & Ayuda"
                                onPress={() => {
                                    closeDrawer();
                                    router.push('/support');
                                }}
                            />

                            <MenuItem
                                icon="mail-outline"
                                label="Contacto"
                                onPress={() => {
                                    closeDrawer();
                                    router.push('/contact');
                                }}
                            />

                            <MenuItem
                                icon="document-text-outline"
                                label="Términos y condiciones"
                                onPress={() => {
                                    closeDrawer();
                                    router.push('/terms');
                                }}
                            />

                            {isAuthenticated && (
                                <>
                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: '#2a2a2a',
                                            marginVertical: 12,
                                        }}
                                    />

                                    <MenuItem
                                        icon="log-out-outline"
                                        label="Cerrar sesión"
                                        danger
                                        onPress={handleLogout}
                                    />
                                </>
                            )}
                        </ScrollView>
                    </Animated.View>
                    <Animated.View
                        style={{
                            flex: 1,
                            opacity: backdropOpacity,
                            backgroundColor: 'rgba(0,0,0,0.38)',
                        }}
                    >
                        <Pressable
                            onPress={closeDrawer}
                            style={{
                                flex: 1,
                            }}
                        />
                    </Animated.View>
                </View>
            </Modal >
        </>
    );
}