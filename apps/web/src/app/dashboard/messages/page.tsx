'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await api.conversations.list({ limit: 50 });
        setConversations(res.conversations || []);
      } catch {
        setConversations([]);
      } finally {
        setLoadingConversations(false);
      }
    }

    fetchConversations();
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.conversations.messages(conversationId, {
        limit: 100,
      });
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || sending) return;

    setSending(true);
    try {
      const res = await api.conversations.sendMessage(activeConversationId, {
        text: newMessage.trim(),
      });
      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessage: {
                  text: newMessage.trim(),
                  createdAt: new Date().toISOString(),
                  senderId: user!.id,
                },
              }
            : c
        )
      );
    } catch {
      toast.error('Αποτυχία αποστολής μηνύματος.');
    } finally {
      setSending(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Μηνύματα</h1>

      {conversations.length === 0 ? (
        <EmptyState
          title="Δεν έχεις μηνύματα ακόμα"
          description="Κάνε match με κάποιον για να ξεκινήσεις συνομιλία!"
        />
      ) : (
        <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-lg border bg-white shadow-sm lg:h-[calc(100vh-180px)]">
          {/* Conversation List */}
          <div
            className={`w-full border-r md:w-80 md:flex-shrink-0 ${
              activeConversationId ? 'hidden md:block' : ''
            }`}
          >
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-gray-900">Συνομιλίες</h2>
            </div>
            <div className="overflow-y-auto">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <a
                    key={conversation.id}
                    href={`/dashboard/messages?id=${conversation.id}`}
                    className={`flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-gray-50 ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                      {conversation.otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {conversation.otherUser.name}
                        </p>
                        {conversation.lastMessage && (
                          <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                            {new Date(
                              conversation.lastMessage.createdAt
                            ).toLocaleDateString('el-GR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="truncate text-xs text-gray-500">
                          {conversation.lastMessage.senderId === user?.id
                            ? 'Εσύ: '
                            : ''}
                          {conversation.lastMessage.text}
                        </p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Message Thread */}
          <div
            className={`flex flex-1 flex-col ${
              !activeConversationId ? 'hidden md:flex' : ''
            }`}
          >
            {!activeConversationId ? (
              <div className="flex flex-1 items-center justify-center text-gray-500">
                <p>Επέλεξε μια συνομιλία για να δεις τα μηνύματα</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <a
                    href="/dashboard/messages"
                    className="md:hidden"
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                  </a>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {activeConversation?.otherUser.name
                      ?.charAt(0)
                      ?.toUpperCase() || '?'}
                  </div>
                  <p className="font-medium text-gray-900">
                    {activeConversation?.otherUser.name || 'Χρήστης'}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-500">
                      Στείλε το πρώτο μήνυμα!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isOwn ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">
                                {message.text}
                              </p>
                              <p
                                className={`mt-1 text-right text-xs ${
                                  isOwn ? 'text-blue-200' : 'text-gray-400'
                                }`}
                              >
                                {new Date(message.createdAt).toLocaleTimeString(
                                  'el-GR',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 border-t px-4 py-3"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Γράψε ένα μήνυμα..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={!newMessage.trim() || sending}>
                    {sending ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                      </svg>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
