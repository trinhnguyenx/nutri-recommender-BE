import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ColumnTypeUndefinedError } from 'typeorm';
import { MealPlan } from './mealplan.entity';
import { CalculationResult } from './caculation.result';
import { Conversation } from './conversation.entity';
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

  @OneToMany(() => MealPlan, (mealPlan) => mealPlan.user)
  meal_plans: MealPlan[];
  
  @OneToMany(() => CalculationResult, (result) => result.user)
  calculationResults: CalculationResult[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}