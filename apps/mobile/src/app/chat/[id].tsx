import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';

/**
 * Η συνομιλία μέσα στην εφαρμογή.
 *
 * Μέχρι τώρα η εφαρμογή είχε ΜΟΝΟ λίστα συνομιλιών: πατούσες μια γραμμή και δεν
 * άνοιγε τίποτα. Δηλαδή δεν μπορούσες να διαβάσεις ούτε να στείλεις μήνυμα από
 * το κινητό — μόνο από το site.
 *
 * Τα μηνύματα ανανεώνονται κάθε 5 δευτερόλεπτα όσο η οθόνη είναι ανοιχτή, ίδιο
 * ρυθμό με το site.
 */

interface Message {
  id: string;
  conversation_id?: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  /** Τοπική σήμανση όσο ταξιδεύει, ώστε να μη «χάνεται» μπροστά στα μάτια σου. */
  pending?: boolean;
  failed?: boolean;
}

const POLL_MS = 5000;

function timeLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

/** Εικόνες και αρχεία: δείχνουμε τι είναι, όχι ωμό σύνδεσμο. */
function displayContent(content: string): string {
  if (content.startsWith('📷') && content.includes('](')) return '📷 Φωτογραφία';
  if (content.startsWith('📎') && content.includes('](')) return '📎 Αρχείο';
  if (content.startsWith('📞') || content.startsWith('📹')) {
    return content.replace(/https?:\/\/\S+/g, '').replace(/:\s*$/, '').trim();
  }
  return content;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const conversationId = String(params.id || '');
  const peerName = params.name || 'Συνομιλία';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  const listRef = useRef<FlatList<Message>>(null);
  const newestRef = useRef<string | null>(null);

  // Ποιος είμαι — για να ξέρω ποια μηνύματα είναι δικά μου.
  useEffect(() => {
    let alive = true;
    api.auth
      .me()
      .then((res: any) => {
        if (alive) setMyId(res?.data?.user?.id || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = (await api.conversations.getMessages(conversationId)) as any;
      const list = Array.isArray(res?.data) ? [...res.data].reverse() : [];
      const newest = list.length ? list[list.length - 1].id : null;
      // Μόνο όταν όντως άλλαξε κάτι: αλλιώς η λίστα «αναπηδά» κάθε 5 δευτ.
      if (newest !== newestRef.current) {
        newestRef.current = newest;
        setMessages((prev) => {
          const stillPending = prev.filter((m) => m.pending || m.failed);
          return [...list, ...stillPending];
        });
      }
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Διαβασμένα, μόλις ανοίξει η συνομιλία.
  useEffect(() => {
    if (!conversationId) return;
    api.conversations.markRead(conversationId).catch(() => {});
  }, [conversationId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');

    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: myId || 'me',
        content: text,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);

    try {
      await api.conversations.sendMessage(conversationId, { content: text });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      newestRef.current = null; // ανάγκασε ανανέωση στον επόμενο κύκλο
      await load();
    } catch {
      // Το κρατάμε ορατό σημαδεμένο ως αποτυχημένο, αντί να εξαφανιστεί.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = !!myId && item.sender_id === myId;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, item.failed && styles.bubbleFailed]}>
          <Text style={[styles.text, mine && styles.textMine]}>{displayContent(item.content)}</Text>
          <Text style={[styles.meta, mine && styles.metaMine]}>
            {item.failed ? 'Δεν στάλθηκε' : item.pending ? 'Αποστολή…' : timeLabel(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: peerName, headerBackTitle: 'Πίσω' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : failed && messages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Δεν φόρτωσε η συνομιλία</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryText}>Δοκίμασε ξανά</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>👋</Text>
            <Text style={styles.emptyTitle}>Ξεκίνα τη συνομιλία</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Μήνυμα…"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonOff]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#2563EB', borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleFailed: { opacity: 0.6 },
  text: { fontSize: 15, color: '#0F172A' },
  textMine: { color: '#FFFFFF' },
  meta: { marginTop: 4, fontSize: 10, color: '#94A3B8', textAlign: 'right' },
  metaMine: { color: '#DBEAFE' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonOff: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontSize: 18 },
});
