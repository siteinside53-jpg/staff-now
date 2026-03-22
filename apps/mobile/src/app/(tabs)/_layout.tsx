import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Simple icon component (avoids external icon library dependency)
// ---------------------------------------------------------------------------

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    'Ανακάλυψε': '🔍',
    'Ταιριάσματα': '💼',
    'Μηνύματα': '💬',
    'Προφίλ': '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {iconMap[label] || '•'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab Layout
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 3,
          elevation: 2,
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ανακάλυψε',
          tabBarLabel: 'Ανακάλυψε',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Ανακάλυψε" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Ταιριάσματα',
          tabBarLabel: 'Ταιριάσματα',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Ταιριάσματα" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Μηνύματα',
          tabBarLabel: 'Μηνύματα',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Μηνύματα" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Προφίλ',
          tabBarLabel: 'Προφίλ',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Προφίλ" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});
