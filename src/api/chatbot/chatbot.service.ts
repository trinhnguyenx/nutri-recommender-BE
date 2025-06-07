import { chatbotRepository } from '../../repository/chatbot.Repository';
import { generateAIResponse } from '../../utils/gemini.utils';
import { ChatbotMessageInput } from './chatbot.interface';
import { Message } from '../../model/message.entity';

export const chatbotService = {
  async handleUserMessage({ userId, conversationId, message }: ChatbotMessageInput) {
    let conversation;
    let isFirstMessage = false;

    if (conversationId) {
      conversation = await chatbotRepository.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation không tồn tại');
      }
    } else {
      // Tạo mới conversation, tiêu đề tạm lấy 20 ký tự đầu
      const tempTitle = message.trim().substring(0, 20) || 'Cuộc trò chuyện mới';
      conversation = await chatbotRepository.createConversation(userId, tempTitle);
      isFirstMessage = true;
    }

    // Gọi AI với flag isFirstMessage
    const aiResponse = await generateAIResponse(message, isFirstMessage);

    if (!aiResponse || typeof aiResponse !== 'object' || !aiResponse.reply) {
      throw new Error('AI trả về dữ liệu không hợp lệ');
    }

    if (isFirstMessage && aiResponse.title && aiResponse.title.trim()) {
      conversation.title = aiResponse.title.trim();
      await chatbotRepository.saveConversation(conversation); // Dùng chatbotRepository nếu có
    }

    // Lấy số order lớn nhất để đánh thứ tự tin nhắn, mặc định 0 nếu chưa có
    const maxOrder = (await chatbotRepository.getMaxOrderByConversation(conversation.id)) || 0;

    // Tạo message người dùng
    const userMsg = new Message();
    userMsg.content = message;
    userMsg.sender = 'user';
    userMsg.conversation = conversation;
    userMsg.order = maxOrder + 1;

    // Tạo message AI
    const aiMsg = new Message();
    aiMsg.content = aiResponse.reply;
    aiMsg.sender = 'ai';
    aiMsg.conversation = conversation;
    aiMsg.order = maxOrder + 2;

    await chatbotRepository.saveMessages([userMsg, aiMsg]);

    return aiResponse;
  },

  async getConversations(userId: string) {
    return chatbotRepository.getConversationsByUser(userId);
  },

  async getMessages(conversationId: string) {
    return chatbotRepository.getMessagesByConversation(conversationId);
  }
};
