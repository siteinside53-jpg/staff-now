import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Match {
  id: string;
  matchedUser: {
    id: string;
    name: string;
    photoUrl?: string;
    role: string;
    headline?: string;
  };
  matchedAt: string;
  conversationId?: string;
}

// ---------------------------------------------------------------------------
// Matches Screen
// ---------------------------------------------------------------------------

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.matches.list();
      if (res.success && Array.isArray(res.data)) {
        setMatches(res.data as Match[]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  // -- Empty / Loading States -----------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💼</Text>
        <Text style={styles.emptyTitle}>Κανένα ταίριασμα ακόμα</Text>
        <Text style={styles.emptySubtitle}>
          Συνέχισε να ψάχνεις στην Ανακάλυψη για να βρεις ταιριάσματα!
        </Text>
      </View>
    );
  }

  // -- List -----------------------------------------------------------------

  const renderMatch = ({ item }: { item: Match }) => {
    const user = item.matchedUser;
    const matchDate = new Date(item.matchedAt).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <TouchableOpacity
        style={styles.matchCard}
        activeOpacity={0.7}
        onPress={() => {
          if (item.conversationId) {
            router.push('/messages' as any);
          }
        }}
      >
        {user.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.matchInfo}>
          <Text style={styles.matchName} numberOfLines={1}>
            {user.name}
          </Text>
          {user.headline ? (
            <Text style={styles.matchHeadline} numberOfLines={1}>
              {user.headline}
            </Text>
          ) : null}
          <Text style={styles.matchDate}>Ταίριασμα: {matchDate}</Text>
        </View>

        {item.conversationId ? (
          <View style={styles.chatBadge}>
            <Text style={styles.chatBadgeText}>Μήνυμα</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      renderItem={renderMatch}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563EB"
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
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
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  matchHeadline: {
    fontSize: 13,
    color: '#6B7280',
  },
  matchDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  chatBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chatBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});
