import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { MealPlan } from './mealplan.entity';
import { MealPlanMeal } from './mealplanmeals.entity';

@Entity('meal_plan_days')
export class MealPlanDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int')
  day_number: number; 

  @ManyToOne(() => MealPlan, (mealPlan) => mealPlan.meal_plan_days, { onDelete: 'CASCADE' })
  meal_plan: MealPlan;

  @OneToMany(() => MealPlanMeal, (mealPlanMeal) => mealPlanMeal.meal_plan_day)
  meal_plan_meals: MealPlanMeal[];
}
