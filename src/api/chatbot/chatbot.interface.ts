export interface ChatbotMessageInput {
  userId: string;
  conversationId?: string;
  message: string;
}


export interface ConversationData {
  id: string;
  title: string;
  started_at: Date;
}

export interface MessageData {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  created_at: Date;
  conversationId: string;
}
export interface AIResponse {
  title: string;
  reply: string;
}

