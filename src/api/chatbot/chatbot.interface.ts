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
  title?: string;
  reply?: string;
  status?: string;
  matched_dish_name?: string;
  matched_ingredients?: string;
  name?: string;
  ingredients?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  is_favourite?: boolean;
  meal_type?: string; // 'main', 'snack', etc.
}

