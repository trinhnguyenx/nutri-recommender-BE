// import {GoogleGenAI} from '@google/genai';
import { AIResponse } from "../api/chatbot/chatbot.interface";
export async function generateAIResponse(message: string, prompt: string): Promise<AIResponse> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const config = {
      responseMimeType: "text/plain",
      systemInstruction: [prompt],
    };

    const contents = [{ role: "user", parts: [{ text: message }] }];

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      config,
      contents,
    });

    const aiText = result?.text?.trim();
    if (!aiText) {
      return { reply: "Không nhận được phản hồi từ AI." };
    }

    console.log("⚙️ Raw AI response:\n", aiText);

    // Thử tìm JSON thô
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Không tìm thấy JSON hợp lệ trong phản hồi.");
    }

    let jsonText = jsonMatch[0]
      .replace(/[“”]/g, '"') // chuyển về dấu ngoặc kép chuẩn
      .replace(/,\s*}/g, '}') // loại dấu , thừa
      .replace(/,\s*]/g, ']'); // loại dấu , thừa trong mảng

    // Nếu thiếu dấu } đóng cuối, thêm vào
    if (!jsonText.trim().endsWith("}")) {
      jsonText += "}";
    }

    try {
      const parsed = JSON.parse(jsonText);
      return parsed as AIResponse;
    } catch (e) {
      console.error("❌ Lỗi khi parse JSON:\n", jsonText);
      throw new Error(`Không thể phân tích JSON từ AI. ${e}`);
    }
  } catch (error) {
    console.error("🔥 Error in generateAIResponse:", error);
    return {
      reply:
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message || "Lỗi không xác định"
          : "Đã xảy ra lỗi không xác định.",
    };
  }
}

