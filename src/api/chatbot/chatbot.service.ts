import { chatbotRepository } from '../../repository/chatbot.Repository';
import { generateAIResponse } from '../../utils/gemini.utils';
import { ChatbotMessageInput } from './chatbot.interface';
import { Message } from '../../model/message.entity';
import {promptuserAddingredients} from '@/utils/prompt';
import {addnewMealandPlusScore} from '@/api/calories/calories.service';
export const chatbotService = {
  async handleUserMessage({ userId, conversationId, message }: ChatbotMessageInput) {
    let conversation;
    let isFirstMessage = false;
const prompt =
`
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
`
;
        
    if (conversationId) {
      conversation = await chatbotRepository.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation không tồn tại');
      }
    } else {
      // Tạo mới conversation, tiêu đề tạm lấy 20 ký tự đầu
      const tempTitle = message.trim().substring(0, 40) || 'Cuộc trò chuyện mới';
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
    userMsg.sender = "user";
    userMsg.content = JSON.stringify(message); // Stringify the content
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
  },

  async createMessage(conversationId: string, message: string, sender: 'user' | 'ai') {
    const conversation = await chatbotRepository.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation không tồn tại');
    }
    const maxOrder = (await chatbotRepository.getMaxOrderByConversation(conversation.id)) || 0;
    const newMessage = new Message();
    newMessage.content = message;
    newMessage.sender = sender;
    newMessage.conversation = conversation;
    newMessage.order = maxOrder + 1;
    return chatbotRepository.saveMessages([newMessage]);
  },

  async userInputMessageAddIngredients(conversationId: string, message: any, userId: string) {
    const conversation = await chatbotRepository.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation không tồn tại');
    }
    let aimessage = ""
    const aiResponse = await generateAIResponse(message, promptuserAddingredients);
    console.log('AI Response:', aiResponse);
    // Dựa vào 'status' từ AI để tạo tin nhắn phản hồi phù hợp
    switch (aiResponse.status) {
      case 'exist':
        // Nếu món ăn đã tồn tại, thông báo cho người dùng
        aimessage = `Món ăn của bạn dường như đã có trong hệ thống với tên là "${aiResponse.matched_dish_name}". Nguyên liệu gồm: "${aiResponse.matched_ingredients}"`;
        break;
      case 'new':
          aimessage = `
           Tôi đã ghi nhận một món ăn mới: <strong>${aiResponse.name}</strong>.
          <strong>Nguyên liệu:</strong> ${aiResponse.ingredients}
          <strong>Calo:</strong> ${aiResponse.calories} kcal
          <strong>Protein:</strong> ${aiResponse.protein}g &nbsp;&nbsp; 
          <strong>Fat:</strong> ${aiResponse.fat}g &nbsp;&nbsp; 
          <strong>Carbs:</strong> ${aiResponse.carbs}g
          Đã được thêm vào danh sách yêu thích.
          `;
        // Ghi nhận món ăn mới và cộng điểm
        // Tạo object mealData từ phản hồi của AI
        const mealDataFromAI = {
          name: aiResponse.name,
          ingredients: aiResponse.ingredients,
          calories: aiResponse.calories,
          protein: aiResponse.protein,
          fat: aiResponse.fat,
          carbs: aiResponse.carbs,
          is_favourite: aiResponse.is_favourite,
          meal_type: aiResponse.meal_type || 'main' // Đảm bảo AI trả về meal_type, nếu không sẽ mặc định là 'main'
        };
        // Gọi service với 2 tham số chính xác
        await addnewMealandPlusScore(userId, mealDataFromAI);
        console.log('Adding new meal and updating score for user:', userId, mealDataFromAI);
        break;

      case 'unknown':
        aimessage = aiResponse.reply || "Xin lỗi, tôi không thể xác định được món ăn từ thông tin bạn cung cấp. Vui lòng thử lại với mô tả chi tiết hơn.";
        break;
      default:
        aimessage = "Xin lỗi, tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể mô tả lại món ăn và nguyên liệu được không?";
        break;
    }

    // Lấy số thứ tự lớn nhất để sắp xếp tin nhắn
    const maxOrder = (await chatbotRepository.getMaxOrderByConversation(conversation.id)) || 0;

    // Tạo và lưu tin nhắn của người dùng
    const userMsg = new Message();
    // Nếu `message` là một object, hãy chuyển nó thành chuỗi JSON. Nếu không, giữ nguyên.
    userMsg.content = typeof message === 'object' ? JSON.stringify(message) : message;
    userMsg.sender = 'user';
    userMsg.conversation = conversation;
    userMsg.order = maxOrder + 1;

    // Tạo và lưu tin nhắn phản hồi của AI
    const aiMsg = new Message();
    aiMsg.content = aimessage.toString();
    aiMsg.sender = 'ai';
    aiMsg.conversation = conversation;
    aiMsg.order = maxOrder + 2;

    // Lưu cả hai tin nhắn vào DB
    await chatbotRepository.saveMessages([userMsg, aiMsg]);

    return {aiResponse, aimessage};
  }
};
