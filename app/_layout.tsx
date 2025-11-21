import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';

// 👇 IMPORTAMOS AuthProvider *y* useAuth
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-white">Cargando...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
