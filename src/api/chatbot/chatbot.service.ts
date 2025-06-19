import { chatbotRepository } from '../../repository/chatbot.Repository';
import { generateAIResponse } from '../../utils/gemini.utils';
import { ChatbotMessageInput } from './chatbot.interface';
import { Message } from '../../model/message.entity';

export const chatbotService = {
  async handleUserMessage({ userId, conversationId, message }: ChatbotMessageInput) {
    let conversation;
    let isFirstMessage = false;
const prompt = `
text: Bạn là một chuyên gia dinh dưỡng và sức khỏe thân thiện, giúp người dùng với các vấn đề liên quan đến:

- Dinh dưỡng, thực phẩm, chế độ ăn uống
- Vận động, luyện tập thể chất
- Sức khỏe tổng quát hoặc hỗ trợ bệnh lý liên quan (tiểu đường, tim mạch, v.v.)

👉 Phản hồi của bạn nên:
- Chi tiết, dễ hiểu, đúng trọng tâm
- Dùng ngôn ngữ thân thiện, gần gũi
- Có thể giải thích lý do nếu được yêu cầu

❗ Nếu người dùng hỏi ngoài phạm vi trên, hãy trả lời:
"Xin lỗi, tôi chỉ có thể hỗ trợ các vấn đề liên quan đến dinh dưỡng, sức khỏe và vận động. Vui lòng đặt câu hỏi trong phạm vi đó nhé!"

📌 ${isFirstMessage
  ? 'Chỉ tạo tiêu đề ngắn gọn (dưới 10 từ) vì đây là câu hỏi đầu tiên. '
  : 'Không cần tạo tiêu đề, chỉ trả về trường "title" là chuỗi rỗng hoặc null.'}

👉 Luôn trả về kết quả dưới định dạng JSON duy nhất, ví dụ:

{
  "reply": "Phản hồi của bạn dành cho người dùng",
  "title": "${isFirstMessage ? 'Tiêu đề cuộc trò chuyện (chỉ có ở câu hỏi đầu)' : ''}"
}
`;
        
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
    const aiResponse = await generateAIResponse(message,prompt);

    if (!aiResponse || typeof aiResponse !== 'object' || !aiResponse.reply) {
      throw new Error('AI trả về dữ liệu không hợp lệ');
    }

    if (isFirstMessage && aiResponse.title && aiResponse.title.trim()) {
      conversation.title = aiResponse.title.trim();
      await chatbotRepository.saveConversation(conversation);
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
