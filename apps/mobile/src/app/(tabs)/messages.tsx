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
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    photoUrl?: string;
  };
  lastMessage?: {
    text: string;
    sentAt: string;
    isRead: boolean;
  };
}

// ---------------------------------------------------------------------------
// Messages Screen
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.messaging.conversations();
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data as Conversation[]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // -- Loading State --------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // -- Empty State ----------------------------------------------------------

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyTitle}>Κανένα μήνυμα</Text>
        <Text style={styles.emptySubtitle}>
          Όταν ταιριάξεις με κάποιον, θα μπορείς να στείλεις μήνυμα εδώ.
        </Text>
      </View>
    );
  }

  // -- Conversation List ----------------------------------------------------

  const renderConversation = ({ item }: { item: Conversation }) => {
    const { participant, lastMessage } = item;

    const timeLabel = lastMessage?.sentAt
      ? new Date(lastMessage.sentAt).toLocaleTimeString('el-GR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity style={styles.conversationRow} activeOpacity={0.7}>
        {participant.photoUrl ? (
          <Image
            source={{ uri: participant.photoUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {participant.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.participantName,
                lastMessage && !lastMessage.isRead && styles.unreadName,
              ]}
              numberOfLines={1}
            >
              {participant.name}
            </Text>
            {timeLabel ? (
              <Text style={styles.timeLabel}>{timeLabel}</Text>
            ) : null}
          </View>

          {lastMessage ? (
            <Text
              style={[
                styles.lastMessageText,
                !lastMessage.isRead && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {lastMessage.text}
            </Text>
          ) : (
            <Text style={styles.lastMessageText}>Ξεκίνα τη συζήτηση...</Text>
          )}
        </View>

        {lastMessage && !lastMessage.isRead ? (
          <View style={styles.unreadDot} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderConversation}
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
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 80,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  conversationInfo: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  unreadName: {
    fontWeight: '800',
    color: '#111827',
  },
  timeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  lastMessageText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  unreadText: {
    color: '#374151',
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
});
