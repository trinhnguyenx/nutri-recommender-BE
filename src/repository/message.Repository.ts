import { Message } from '../model/message.entity';
import dataSource from '../config/typeorm.config';

export const messageRepository = dataSource.getRepository(Message).extend({
  async findAllAsync(): Promise<Message[]> {
    return this.find({ relations: ['conversation'] });
  },

  async findByIdAsync(id: string): Promise<Message | null> {
    return this.findOne({ where: { id }, relations: ['conversation'] });
  },

  async findByConversationIdAsync(conversationId: string): Promise<Message[]> {
    return this.find({
      where: { conversation: { id: conversationId } },
      order: { created_at: 'ASC' },
    });
  },

  async createMessageAsync(message: Message): Promise<Message> {
    const newMessage = this.create(message);
    return this.save(newMessage);
  },

  async deleteMessageAsync(id: string): Promise<void> {
    await this.delete(id);
  },
});
