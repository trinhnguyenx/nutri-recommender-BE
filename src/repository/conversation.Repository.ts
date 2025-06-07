import { Conversation } from '../model/conversation.entity';
import dataSource from '../config/typeorm.config';

export const conversationRepository = dataSource.getRepository(Conversation).extend({
  async findAllAsync(): Promise<Conversation[]> {
    return this.find({ relations: ['messages', 'user'] });
  },

  async findByIdAsync(id: string): Promise<Conversation | null> {
    return this.findOne({ where: { id }, relations: ['messages', 'user'] });
  },

  async createConversationAsync(conversation: Conversation): Promise<Conversation> {
    const newConversation = this.create(conversation);
    return this.save(newConversation);
  },

  async updateConversationAsync(id: string, updates: Partial<Conversation>): Promise<Conversation | null> {
    await this.update(id, updates);
    return this.findByIdAsync(id);
  },

  async deleteConversationAsync(id: string): Promise<void> {
    await this.delete(id);
  },

  async findByUserIdAsync(userId: string): Promise<Conversation[]> {
    return this.find({
      where: { user: { id: userId } },
      relations: ['messages'],
      order: { started_at: 'DESC' },
    });
  },
});
