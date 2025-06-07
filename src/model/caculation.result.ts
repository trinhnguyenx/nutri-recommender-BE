import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './users.entity';

@Entity('calculation_results')
export class CalculationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('float')
  maintenanceCalories: number;

  @Column('float')
  targetCalories: number;

  @Column({ type: 'varchar' })
  goal: string; // 'gain' | 'lose' | 'maintain'

  @Column('float')
  estimatedWeeklyChange: number; // kg/week

  @Column('int')
  estimatedDaysToGoal: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.calculationResults, { onDelete: 'CASCADE' })
  user: User;
}
