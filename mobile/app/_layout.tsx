import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { Colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="ai-chat/index" options={{ headerShown: false }} />
            <Stack.Screen name="medication/index" options={{ headerShown: false }} />
            <Stack.Screen name="care/index" options={{ headerShown: false }} />
          </Stack>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
