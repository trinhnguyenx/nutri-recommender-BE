import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ColumnTypeUndefinedError } from 'typeorm';
import { MealPlan } from './mealplan.entity';
import { CalculationResult } from './caculation.result';
import { Conversation } from './conversation.entity';
import {PaymentTransaction} from './payment.entity';
import { UserProgress } from './user.progress.entity';
import { MealPlanCalorieSummary } from './mealplan.calories.summary';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  first_name: string;

  @Column({ default: '' })
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; 

  @Column({ default: '' })
  gender: string;

  @Column('int', { default: 0 })
  age: number;

  @Column('float', { default: 0 })
  height: number;

  @Column('float', { default: 0 })
  weight: number;

  @Column('float', { default: 0 })
  weightTarget: number;

  @Column({ default: '' })
  goal: string;

  @Column({ default: '' })
  activityLevel: string;

 @Column('simple-array', { nullable: true })
  allergies: string[];

  @Column({ default: false })
  is_premium: boolean;

  @Column('int', { default: 0 })
  meal_plan_count: number;

  @OneToMany(() => MealPlan, (mealPlan) => mealPlan.user)
  meal_plans: MealPlan[];
  
  @OneToMany(() => CalculationResult, (result) => result.user)
  calculationResults: CalculationResult[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];

  @OneToMany(() => PaymentTransaction, (payment) => payment.user)
  paymentTransactions: PaymentTransaction[];

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: UserProgress[];

  @OneToMany(() => MealPlanCalorieSummary, (calorieSummary) => calorieSummary.user, { cascade: true })
  calorieSummaries: MealPlanCalorieSummary[];


}