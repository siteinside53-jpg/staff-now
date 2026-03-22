import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoverCard {
  id: string;
  name: string;
  photoUrl?: string;
  headline?: string;
  location?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Discover Screen
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.discover.feed();
      if (res.success && Array.isArray(res.data)) {
        setCards(res.data as DiscoverCard[]);
        setCurrentIndex(0);
      }
    } catch {
      // Silently handle; user can refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSwipe = async (direction: 'like' | 'skip') => {
    const card = cards[currentIndex];
    if (!card || swiping) return;

    setSwiping(true);
    try {
      await api.discover.swipe({ targetId: card.id, direction });
      setCurrentIndex((prev) => prev + 1);
    } catch {
      // Swipe failed, stay on card
    } finally {
      setSwiping(false);
    }
  };

  // -- Empty / Loading States -----------------------------------------------

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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCards}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshButtonText}>Ανανέωση</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -- Current Card ---------------------------------------------------------

  const card = cards[currentIndex];

  return (
    <View style={styles.container}>
      {/* Card */}
      <View style={styles.card}>
        {card.photoUrl ? (
          <Image source={{ uri: card.photoUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderText}>
              {card.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card.name}
          </Text>

          {card.headline ? (
            <Text style={styles.cardHeadline} numberOfLines={2}>
              {card.headline}
            </Text>
          ) : null}

          {card.location ? (
            <Text style={styles.cardLocation}>{card.location}</Text>
          ) : null}

          {card.tags && card.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {card.tags.slice(0, 4).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Counter */}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: '55%',
    backgroundColor: '#E5E7EB',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '55%',
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#2563EB',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    gap: 6,
  },
  cardName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  cardHeadline: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 21,
  },
  cardLocation: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  counter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  skipButton: {
    backgroundColor: '#FEE2E2',
  },
  skipButtonIcon: {
    fontSize: 20,
    color: '#DC2626',
    fontWeight: '800',
  },
  skipButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  likeButton: {
    backgroundColor: '#DCFCE7',
  },
  likeButtonIcon: {
    fontSize: 20,
    color: '#16A34A',
  },
  likeButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
});
