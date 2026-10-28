import '../global.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'expo-dev-client';
import '../lib/backgroundLocationTask';
import {
  FitnessInsightsProvider,
} from '../context/FitnessInsightsContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import {
  useAppHeader,
} from '../context/AppHeaderContext';
import {
  AppHeaderProvider,
} from '../context/AppHeaderContext';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import AppHeader
  from '../components/AppHeader';

function AppLoadingScreen() {
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
          width: 180,
          height: 105,
        }}
        resizeMode="contain"
      />

      <ActivityIndicator size="large" color={COLORS.primary} />

      <Text
        style={{
          marginTop: 14,
          color: COLORS.textLight,
          fontSize: 14,
          fontWeight: '700',
        }}
      >
        Cargando...
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const firstSegment = segments[0] as string | undefined;


  const [headerMeasurements, setHeaderMeasurements] = useState({
    safeArea: 0,
    inner: 0,
  });


  const isIphoneWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPod/i.test(
      navigator.userAgent
    );


  const headerSafeAreaEdges = {
    top: Platform.OS === 'web' ? 'off' : 'additive',
    bottom: 'off',
    left: 'additive',
    right: 'additive',
  } as const;


  const {
    headerVisible,
  } = useAppHeader();

  const isAuthenticatedHeaderRoute =
    (
      firstSegment === 'home' ||
      firstSegment === 'profile' ||
      firstSegment === 'statistics' ||
      firstSegment === 'suggestions' ||
      firstSegment === 'statistics-history' ||
      firstSegment === 'routine' ||
      firstSegment === 'account' ||
      firstSegment === 'liverun' ||
      firstSegment === 'info'
    );


  const isPublicHeaderRoute =
    (
      firstSegment === 'contact' ||
      firstSegment === 'support' ||
      firstSegment === 'about' ||
      firstSegment === 'terms'
    );


  const usesPersistentHeader =
    isPublicHeaderRoute ||
    (
      isAuthenticated &&
      isAuthenticatedHeaderRoute
    );

  const isPublicRoute = (segment?: string) => {
    return (
      segment === undefined ||
      segment === '' ||
      segment === 'index' ||
      segment === 'login' ||
      segment === 'register' ||
      segment === 'forgot-password' ||
      segment === 'reset-password' ||
      segment === 'terms' ||
      segment === 'support' ||
      segment === 'contact' ||
      segment === 'about' ||
      segment === 'auth-loading'
    );
  };

  const isAuthEntryRoute = (segment?: string) => {
    return (
      segment === undefined ||
      segment === '' ||
      segment === 'index' ||
      segment === 'login' ||
      segment === 'register'
    );
  };

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicRoute(firstSegment)) {
      router.replace('/');
      return;
    }

    if (isAuthenticated && isAuthEntryRoute(firstSegment)) {
      router.replace('/auth-loading');
    }
  }, [isLoading, isAuthenticated, firstSegment, isPublicRoute]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated && !isPublicRoute(firstSegment)) {
    return <AppLoadingScreen />;
  }

  if (isAuthenticated && isAuthEntryRoute(firstSegment)) {
    return <AppLoadingScreen />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          COLORS.background,
      }}
    >

      {usesPersistentHeader &&
        headerVisible && (


          <SafeAreaView
            edges={headerSafeAreaEdges}

            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;

              setHeaderMeasurements((current) =>
                current.safeArea === height
                  ? current
                  : { ...current, safeArea: height }
              );
            }}

            style={{
              backgroundColor: COLORS.background,
              overflow: 'visible',

              // DIAGNÓSTICO TEMPORAL
              borderBottomWidth: 2,
              borderBottomColor: '#FF3030',
            }}
          >

            <View
              style={{
                width: '100%',
                maxWidth: 800,
                alignSelf: 'center',
                paddingHorizontal: 8,

                overflow: 'visible',
              }}

              onLayout={(event) => {
                const height = event.nativeEvent.layout.height;

                setHeaderMeasurements((current) =>
                  current.inner === height
                    ? current
                    : { ...current, inner: height }
                );
              }}

            >
              <AppHeader showProfile={true} />

              {Platform.OS === 'web' && (
                <Text
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 12,
                    color: '#FFD600',
                    backgroundColor: '#222222',
                    fontSize: 10,
                    fontWeight: 'bold',
                    zIndex: 999,
                  }}
                >
                  SAFE: {headerMeasurements.safeArea.toFixed(0)}
                  {' | '}
                  INNER: {headerMeasurements.inner.toFixed(0)}
                  {' | '}
                  ESPERADO: {isIphoneWeb ? 82 : 108}
                </Text>
              )}

            </View>
          </SafeAreaView>

        )}


      {/* ===================================== */}
      {/* PANTALLAS                             */}
      {/* ===================================== */}

      <View
        style={{
          flex: 1,

          // DIAGNÓSTICO TEMPORAL
          borderTopWidth: 2,
          borderTopColor: '#00D9FF',
        }}
      >
        <Stack
          screenOptions={{
            headerShown:
              false,

            contentStyle: {
              backgroundColor:
                COLORS.background,
            },
          }}
        />
      </View>

    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <AuthProvider>

        <FitnessInsightsProvider>

          <AppHeaderProvider>

            <RootNavigator />

          </AppHeaderProvider>

        </FitnessInsightsProvider>

      </AuthProvider>
    </GestureHandlerRootView>
  );
}