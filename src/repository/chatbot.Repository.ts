import dataSource from "../config/typeorm.config";
import { Conversation } from "@/model/conversation.entity";
import { Message } from "@/model/message.entity";

export const chatbotRepository = {
  async getConversationById(id: string) {
    return dataSource
      .getRepository(Conversation)
      .findOne({ where: { id }, relations: ["messages"] });
  },

  async createConversation(userId: string, title: string) {
    const conversation = dataSource.getRepository(Conversation).create({
      user: { id: userId } as any,
      title,
    });
    return dataSource.getRepository(Conversation).save(conversation);
  },

  async saveMessages(messages: Message[]) {
    return dataSource.getRepository(Message).save(messages);
  },

  async getConversationsByUser(userId: string) {
    return dataSource.getRepository(Conversation).find({
      where: { user: { id: userId } },
      order: { startedAt: "DESC" },
    });
  },

  async getMessagesByConversation(conversationId: string) {
    return dataSource.getRepository(Message).find({
      where: { conversation: { id: conversationId } },
      order: { created_at: "ASC" },
    });
  },

  async getMaxOrderByConversation(conversationId: string): Promise<number> {
    const result = await dataSource
      .getRepository(Message)
      .createQueryBuilder("message")
      .select("MAX(message.order)", "max")
      .where("message.conversationId = :conversationId", { conversationId })
      .getRawOne();

    return result?.max ? Number(result.max) : 0;
  },
  async saveConversation(conversation: Conversation) {
  return dataSource.getRepository(Conversation).save(conversation);
}
};
