// import {GoogleGenAI} from '@google/genai';
import { AIResponse } from "../api/chatbot/chatbot.interface";
export async function generateAIResponse(prompt: string, isFirstMessage: boolean): Promise<AIResponse> {
  try {
    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = {
      responseMimeType: "text/plain",
      systemInstruction: [
        {
          text: `Bạn là một chuyên gia dinh dưỡng và sức khỏe thân thiện, giúp người dùng với các vấn đề liên quan đến:

- Dinh dưỡng, thực phẩm, chế độ ăn uống
- Vận động, luyện tập thể chất
- Sức khỏe tổng quát hoặc hỗ trợ bệnh lý liên quan (tiểu đường, tim mạch, v.v.)

👉 Phản hồi của bạn nên:
- Ngắn gọn, dễ hiểu, đúng trọng tâm
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
`,
        },
      ],
    };

    const contents = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      config,
      contents,
    });

    if (result?.text) {
      const jsonText = result.text.trim().match(/\{[\s\S]*?\}/)?.[0];
      if (!jsonText) throw new Error("Không tìm thấy JSON trong kết quả AI");

      const parsed = JSON.parse(jsonText);
      return {
        title: parsed.title || "",
        reply: parsed.reply || "Không rõ nội dung",
      };
    }

    return { title: "", reply: "Lỗi không rõ từ AI" };
  } catch (error) {
    console.error("Error in generateAIResponse:", error);
    return {
      title: "",
      reply: "Xin lỗi, có lỗi xảy ra khi tạo phản hồi.",
    };
  }
}
