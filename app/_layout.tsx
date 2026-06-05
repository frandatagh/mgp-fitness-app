import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'expo-dev-client';
import '../lib/backgroundLocationTask';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

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
          marginBottom: 22,
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

  const isPublicRoute = (segment?: string) => {
    return (
      segment === undefined ||
      segment === '' ||
      segment === 'index' ||
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

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}