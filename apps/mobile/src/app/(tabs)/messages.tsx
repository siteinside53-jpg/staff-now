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

/**
 * Η λίστα συνομιλιών.
 *
 * ΠΡΟΣΟΧΗ σε ό,τι υπήρχε πριν εδώ: η οθόνη καλούσε `api.messaging.conversations()`,
 * που ΔΕΝ υπάρχει στον κοινό πελάτη του API (λέγεται `conversations`). Το σφάλμα
 * το κατάπινε ένα σιωπηλό `catch`, οπότε η καρτέλα έδειχνε «Κανένα μήνυμα» σε
 * όλους — ακόμη και σε όσους είχαν συνομιλίες. Επίσης τα ονόματα των πεδίων
 * (`participant`, `lastMessage.text`) δεν ταίριαζαν με αυτά που στέλνει ο server
 * (`otherParty`, `lastMessage.content`).
 */

interface Conversation {
  id: string;
  otherParty: { id: string; name: string; avatar?: string | null };
  lastMessage?: { content: string; created_at: string; sender_id: string } | null;
  unreadCount?: number;
  jobTitle?: string | null;
}

/** «Τώρα», «14:20», «Χθες» ή ημερομηνία — ό,τι θα έγραφε ένας άνθρωπος. */
function timeLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Χθες';
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
}

/** Τα μηνύματα αρχείων/εικόνων να μη δείχνουν ωμό σύνδεσμο στη λίστα. */
function preview(content?: string): string {
  if (!content) return 'Ξεκίνα τη συνομιλία';
  if (content.startsWith('📷')) return '📷 Φωτογραφία';
  if (content.startsWith('📎')) return '📎 Αρχείο';
  if (content.startsWith('📞') || content.startsWith('📹')) return '📞 Βιντεοκλήση';
  return content;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = (await api.conversations.list()) as any;
      const list = Array.isArray(res?.data) ? res.data : [];
      setConversations(list as Conversation[]);
      setFailed(false);
    } catch {
      // Το λέμε στον χρήστη αντί να δείχνουμε «κανένα μήνυμα»: το δεύτερο είναι
      // ψέμα όταν η αιτία είναι ότι δεν φορτώσαμε.
      setFailed(true);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={styles.emptyTitle}>Δεν φόρτωσαν τα μηνύματα</Text>
        <Text style={styles.emptySubtitle}>Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Δοκίμασε ξανά</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  const renderConversation = ({ item }: { item: Conversation }) => {
    const name = item.otherParty?.name || 'Χρήστης';
    const unread = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        activeOpacity={0.7}
        onPress={() =>
          // Ο κατάλογος διαδρομών του expo-router φτιάχνεται όταν τρέξει η
          // εφαρμογή. Πριν τρέξει την πρώτη φορά με τη νέα οθόνη, ο έλεγχος
          // τύπων δεν την ξέρει ακόμη — γι' αυτό η μετατροπή εδώ.
          router.push({
            pathname: '/chat/[id]' as never,
            params: { id: item.id, name, avatar: item.otherParty?.avatar || '' },
          })
        }
      >
        {item.otherParty?.avatar ? (
          <Image source={{ uri: item.otherParty.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.time}>{timeLabel(item.lastMessage?.created_at)}</Text>
          </View>
          <View style={styles.conversationHeader}>
            <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
              {preview(item.lastMessage?.content)}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderConversation}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  list: { paddingVertical: 8 },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E2E8F0' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' },
  avatarLetter: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  conversationInfo: { flex: 1, gap: 4 },
  conversationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  time: { fontSize: 12, color: '#94A3B8' },
  preview: { flex: 1, fontSize: 14, color: '#64748B' },
  previewUnread: { color: '#0F172A', fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
