import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['user', 'ai'] })
  sender: 'user' | 'ai';

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;

 @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  conversation: Conversation;
}
