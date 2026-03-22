import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { DOMAIN } from '@staffnow/config';
import { useAuth } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Profile Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { user, profile, subscription, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Αποσύνδεση', 'Θέλεις σίγουρα να αποσυνδεθείς;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Αποσύνδεση',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const openBilling = async () => {
    try {
      await WebBrowser.openBrowserAsync(`https://${DOMAIN}/dashboard/billing`);
    } catch {
      Alert.alert('Σφάλμα', 'Δεν ήταν δυνατό το άνοιγμα της σελίδας.');
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const displayName =
    profile?.name || profile?.businessName || user.email.split('@')[0];
  const initials = displayName.charAt(0).toUpperCase();
  const roleLabelMap: Record<string, string> = {
    worker: 'Εργαζόμενος',
    business: 'Επιχείρηση',
    admin: 'Διαχειριστής',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {profile?.photoUrl ? (
          <Image
            source={{ uri: profile.photoUrl }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>{initials}</Text>
          </View>
        )}

        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {roleLabelMap[user.role] || user.role}
          </Text>
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Συνδρομή</Text>
        <View style={styles.subscriptionCard}>
          <Text style={styles.planName}>
            {subscription?.planName || 'Δωρεάν πλάνο'}
          </Text>
          <Text style={styles.planDetails}>
            {subscription?.status === 'active'
              ? 'Ενεργή συνδρομή'
              : 'Δεν έχεις ενεργή συνδρομή'}
          </Text>
          <TouchableOpacity
            style={styles.billingButton}
            onPress={openBilling}
            activeOpacity={0.7}
          >
            <Text style={styles.billingButtonText}>
              Διαχείριση συνδρομής
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ρυθμίσεις</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuItemText}>Επεξεργασία προφίλ</Text>
          <Text style={styles.menuChevron}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuItemText}>Ειδοποιήσεις</Text>
          <Text style={styles.menuChevron}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuItemText}>Βοήθεια & Υποστήριξη</Text>
          <Text style={styles.menuChevron}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuItemText}>Όροι & Πολιτική Απορρήτου</Text>
          <Text style={styles.menuChevron}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.7}
      >
        {loggingOut ? (
          <ActivityIndicator color="#DC2626" />
        ) : (
          <Text style={styles.logoutButtonText}>Αποσύνδεση</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>StaffNow v1.0.0</Text>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
  },
  profileImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563EB',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },

  // Subscription
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  planDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  billingButton: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  billingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuChevron: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '600',
  },

  // Logout
  logoutButton: {
    height: 50,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 24,
  },
});
