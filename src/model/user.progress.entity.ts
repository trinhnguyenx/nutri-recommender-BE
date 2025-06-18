import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './users.entity';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.progress, { onDelete: 'CASCADE' })
  user: User;

  @Column('float')
  weight: number;

  // @Column('float')
  // caloriesConsumed: number;

  @CreateDateColumn()
  recordedAt: Date;
}
