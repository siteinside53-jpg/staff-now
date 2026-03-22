import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

type Role = 'worker' | 'business';

export default function RegisterScreen() {
  const { register } = useAuth();

  const [role, setRole] = useState<Role>('worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Σφάλμα', 'Συμπλήρωσε το email σου.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Σφάλμα', 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Σφάλμα', 'Οι κωδικοί δεν ταιριάζουν.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        role,
        acceptTerms: true,
      });
    } catch (err: any) {
      const message =
        err?.message || 'Αποτυχία εγγραφής. Δοκίμασε ξανά.';
      Alert.alert('Σφάλμα εγγραφής', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>StaffNow</Text>
          <Text style={styles.subtitle}>Δημιουργία λογαριασμού</Text>
        </View>

        {/* Role Selector */}
        <View style={styles.roleContainer}>
          <Text style={styles.label}>Είμαι:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'worker' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('worker')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === 'worker' && styles.roleButtonTextActive,
                ]}
              >
                Εργαζόμενος
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'business' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('business')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === 'business' && styles.roleButtonTextActive,
                ]}
              >
                Επιχείρηση
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Κωδικός</Text>
            <TextInput
              style={styles.input}
              placeholder="Τουλάχιστον 8 χαρακτήρες"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Επιβεβαίωση κωδικού</Text>
            <TextInput
              style={styles.input}
              placeholder="Επανέλαβε τον κωδικό"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="new-password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
          </View>

          <Text style={styles.terms}>
            Με την εγγραφή αποδέχεσαι τους{' '}
            <Text style={styles.termsLink}>Όρους Χρήσης</Text> και την{' '}
            <Text style={styles.termsLink}>Πολιτική Απορρήτου</Text>.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Εγγραφή</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Έχεις ήδη λογαριασμό;</Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Σύνδεση</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  roleContainer: {
    marginBottom: 24,
    gap: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#2563EB',
  },
  form: {
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  terms: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  termsLink: {
    color: '#2563EB',
    fontWeight: '500',
  },
  button: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});
