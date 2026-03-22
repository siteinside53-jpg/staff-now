import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiscoverCard {
  id: string;
  name: string;
  headline?: string;
  location?: string;
  salary?: string;
  tags?: string[];
  verified?: boolean;
  experience?: number;
  bio?: string;
}

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      if (user?.role === 'business') {
        // Business sees workers
        const res = await api.workers.discover();
        if (res.success && res.data) {
          const items = (res as any).data || (res as any).items || [];
          const mapped = (Array.isArray(items) ? items : []).map((w: any) => ({
            id: w.id || w.user_id,
            name: w.full_name || 'Χωρίς όνομα',
            headline: w.roles?.join(', ') || w.availability || '',
            location: [w.city, w.region].filter(Boolean).join(', '),
            salary: w.expected_monthly_salary ? `${w.expected_monthly_salary}€/μήνα` : undefined,
            tags: w.roles || [],
            verified: w.verified === 1,
            experience: w.years_of_experience,
            bio: w.bio,
          }));
          setCards(mapped);
          setCurrentIndex(0);
        }
      } else {
        // Worker sees jobs
        const res = await api.jobs.list();
        if (res.success && res.data) {
          const items = (res as any).data || (res as any).items || [];
          const mapped = (Array.isArray(items) ? items : []).map((j: any) => ({
            id: j.id,
            name: j.title || 'Θέση εργασίας',
            headline: j.description?.substring(0, 100) || '',
            location: [j.city, j.region].filter(Boolean).join(', '),
            salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : undefined,
            tags: j.roles || [j.employment_type].filter(Boolean),
            verified: false,
            bio: j.description,
          }));
          setCards(mapped);
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      console.log('Discover fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSwipe = async (direction: 'like' | 'skip') => {
    const card = cards[currentIndex];
    if (!card || swiping) return;
    setSwiping(true);
    try {
      // Move to next card regardless
      setCurrentIndex((prev) => prev + 1);
    } catch {
      // ignore
    } finally {
      setSwiping(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Φόρτωση προφίλ...</Text>
      </View>
    );
  }

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Δεν υπάρχουν άλλα προφίλ</Text>
        <Text style={styles.emptySubtitle}>
          Δοκίμασε αργότερα ή άλλαξε τα φίλτρα σου.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchCards} activeOpacity={0.7}>
          <Text style={styles.refreshButtonText}>Ανανέωση</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Avatar / Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {card.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          {card.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.cardContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.cardName}>{card.name}</Text>

          {card.headline ? (
            <Text style={styles.cardHeadline}>{card.headline}</Text>
          ) : null}

          {card.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{card.location}</Text>
            </View>
          ) : null}

          {card.salary ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💰</Text>
              <Text style={styles.infoText}>{card.salary}</Text>
            </View>
          ) : null}

          {card.experience ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⭐</Text>
              <Text style={styles.infoText}>{card.experience} χρόνια εμπειρίας</Text>
            </View>
          ) : null}

          {card.bio ? (
            <Text style={styles.cardBio} numberOfLines={4}>{card.bio}</Text>
          ) : null}

          {card.tags && card.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {card.tags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <Text style={styles.counter}>
          {currentIndex + 1} / {cards.length}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.skipButton]}
          onPress={() => handleSwipe('skip')}
          disabled={swiping}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonIcon}>✕</Text>
          <Text style={styles.skipButtonLabel}>Παράβλεψη</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('like')}
          disabled={swiping}
          activeOpacity={0.7}
        >
          <Text style={styles.likeButtonIcon}>♥</Text>
          <Text style={styles.likeButtonLabel}>Ενδιαφέρομαι</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  refreshButton: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 10 },
  refreshButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  card: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  cardHeader: { backgroundColor: '#2563EB', height: 140, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  verifiedBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  cardContent: { flex: 1, padding: 20 },
  cardName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardHeadline: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 14, color: '#374151' },
  cardBio: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: 12, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  counter: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },

  actions: { flexDirection: 'row', gap: 16, marginTop: 16 },
  actionButton: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  skipButton: { backgroundColor: '#FEE2E2' },
  skipButtonIcon: { fontSize: 20, color: '#DC2626', fontWeight: '800' },
  skipButtonLabel: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  likeButton: { backgroundColor: '#DCFCE7' },
  likeButtonIcon: { fontSize: 20, color: '#16A34A' },
  likeButtonLabel: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
});
