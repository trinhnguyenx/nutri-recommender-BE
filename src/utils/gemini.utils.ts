// import {GoogleGenAI} from '@google/genai';
import { AIResponse } from "../api/chatbot/chatbot.interface";
export async function generateAIResponse(message: string, prompt: string): Promise<AIResponse> {
  try {
    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = {
      responseMimeType: "text/plain",
      systemInstruction: [
       prompt
      ],
    };

    const contents = [
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      config,
      contents,
    });

    if (result?.text) {
      // Trích xuất khối JSON từ phản hồi của AI
      const jsonText = result.text.trim().match(/\{[\s\S]*?\}/)?.[0];
      if (!jsonText) {
        console.error("Raw AI Response (no JSON found):", result.text);
        throw new Error("Không tìm thấy đối tượng JSON hợp lệ trong phản hồi của AI.");
      }

      try {
        const parsedJson = JSON.parse(jsonText);
        // Trả về toàn bộ đối tượng đã phân tích. Hàm này giờ đã "động",
        // nó sẽ bao gồm bất kỳ trường nào do AI cung cấp khớp với interface AIResponse.
        return parsedJson as AIResponse;

      } catch (e) {
        console.error("Lỗi khi phân tích JSON từ AI:", e);
        console.error("JSON Text bị lỗi:", jsonText);
        throw new Error(`Không thể phân tích phản hồi JSON từ AI. ${e}`);
      }
    }

    // Fallback nếu AI không trả về text
    return { reply: "Lỗi không rõ từ AI. Không nhận được nội dung." };
  } catch (error) {
    console.error("Error in generateAIResponse:", error);
    return {
      reply: `Xin lỗi, có lỗi xảy ra khi tạo phản hồi., ${
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : "Lỗi không xác định"
      }`,
    };
  }
}
