import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../lib/profile';
import { getRoutines } from '../lib/routines';
import { getMyStatistics } from '../lib/statistics';
import AppErrorModal from '../components/feedback/AppErrorModal';

export default function AuthLoadingScreen() {
    const { isAuthenticated, logout } = useAuth();

    const [loadingText, setLoadingText] = useState('Preparando tu entrenamiento...');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const prepareApp = async () => {
        try {
            setErrorMessage(null);
            setIsRetrying(true);

            if (!isAuthenticated) {
                router.replace('/');
                return;
            }

            setLoadingText('Cargando tu perfil...');

            const profilePromise = getMyProfile();

            setLoadingText('Cargando tus rutinas...');

            const routinesPromise = getRoutines();

            setLoadingText('Preparando tus estadísticas...');

            const statisticsPromise = getMyStatistics();

            const results = await Promise.allSettled([
                profilePromise,
                routinesPromise,
                statisticsPromise,
            ]);

            const profileResult = results[0];

            if (profileResult.status === 'rejected') {
                throw new Error(
                    'No pudimos cargar tu perfil. Revisá tu conexión o intentá nuevamente.'
                );
            }

            const minimumDelay = new Promise((resolve) => setTimeout(resolve, 700));
            await minimumDelay;

            router.replace('/home');
        } catch (error: any) {
            console.log('Error preparando app:', error);

            setErrorMessage(
                error?.message ||
                'No pudimos preparar la aplicación. Intentá nuevamente en unos segundos.'
            );
        } finally {
            setIsRetrying(false);
        }
    };

    useEffect(() => {
        prepareApp();
    }, [isAuthenticated]);

    const handleBackToLogin = async () => {
        await logout();
        setErrorMessage(null);
        router.replace('/');
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: COLORS.background,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
            }}
        >
            <Image
                source={require('../assets/img/icontwist.png')}
                style={{
                    width: 190,
                    height: 110,
                    marginBottom: 24,
                }}
                resizeMode="contain"
            />

            <Text
                style={{
                    color: COLORS.textLight,
                    fontSize: 20,
                    fontWeight: '800',
                    textAlign: 'center',
                    marginBottom: 8,
                }}
            >
                Preparando tu entrenamiento
            </Text>

            <Text
                style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    textAlign: 'center',
                    lineHeight: 20,
                    marginBottom: 24,
                }}
            >
                {loadingText}
            </Text>

            <ActivityIndicator size="large" color={COLORS.primary} />

            <Pressable
                onPress={handleBackToLogin}
                style={{
                    marginTop: 28,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    backgroundColor: '#1b1b1b',
                    borderWidth: 1,
                    borderColor: '#333333',
                }}
            >
                <Text
                    style={{
                        color: COLORS.textMuted,
                        fontSize: 12,
                        fontWeight: '700',
                    }}
                >
                    Cancelar
                </Text>
            </Pressable>

            <AppErrorModal
                visible={!!errorMessage}
                title="No pudimos preparar la app"
                message={errorMessage ?? ''}
                primaryText={isRetrying ? 'Reintentando...' : 'Reintentar'}
                onPrimaryPress={prepareApp}
                secondaryText="Volver al login"
                onSecondaryPress={handleBackToLogin}
            />
        </View>
    );
}