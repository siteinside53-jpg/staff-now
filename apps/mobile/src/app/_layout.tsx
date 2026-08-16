import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Η συνομιλία θέλει κεφαλίδα: εκεί μπαίνει το όνομα του άλλου και το
            «Πίσω». Χωρίς αυτήν, ο χρήστης μπαίνει και δεν έχει τρόπο να βγει. */}
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
      </Stack>
    </AuthProvider>
  );
}
