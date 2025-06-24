import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './users.entity';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.progress, { onDelete: 'CASCADE' })
  user: User;

  @Column('float')
  weight: number;

  @Column({ type: 'boolean', nullable: true })
  meals: boolean;

  @Column({ type: 'boolean', nullable: true })
  sick: boolean;

  @Column({ type: 'boolean', nullable: true })
  sleep: boolean;

  @Column({
    type: 'enum',
    enum: ['very_hungry', 'hungry', 'neutral', 'full', 'very_full'],
    default: 'neutral',
  })
  hunger: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column('float', { default: 0 })
  caloBreakfast: number;

  @Column('float', { default: 0 })
  caloLunch: number;

  @Column('float', { default: 0 })
  caloDinner: number;

  @Column('float', { default: 0 })
  caloSnack: number;

  @CreateDateColumn()
  recordedAt: Date;
}
