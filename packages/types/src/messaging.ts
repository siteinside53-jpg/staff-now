export type ConversationStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  matchId: string;
  workerId: string;
  businessId: string;
  lastMessageAt?: string;
  status: ConversationStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}
