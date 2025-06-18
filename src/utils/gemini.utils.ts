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
