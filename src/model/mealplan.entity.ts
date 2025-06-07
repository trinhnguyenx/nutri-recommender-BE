import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './users.entity';
import { MealPlanDay } from './mealplanday.entity';

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('date')
  start_date: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column('float')
  maintenanceCalories: number;

  @Column('float')
  targetCalories: number;

  @Column()
  goal: string; // e.g., 'gain', 'loss', 'maintenance'

  @Column('float', { nullable: true })
  estimatedWeeklyChange: number; // e.g., weight change in kg/week

  @Column({ nullable: true })
  estimatedDaysToGoal: number; // e.g., days to reach goal

  @ManyToOne(() => User, (user) => user.meal_plans)
  user: User;

  @OneToMany(() => MealPlanDay, (mealPlanDay) => mealPlanDay.meal_plan)
  meal_plan_days: MealPlanDay[];
}
