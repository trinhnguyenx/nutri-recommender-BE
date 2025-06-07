import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { MealPlanDay } from './mealplanday.entity';
import { Meal } from './meal.entity';

@Entity('meal_plan_meals')
export class MealPlanMeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'],
  })
  meal_time: string;

  @ManyToOne(() => Meal)
  meal: Meal;

  @ManyToOne(() => MealPlanDay, (mealPlanDay) => mealPlanDay.meal_plan_meals)
  meal_plan_day: MealPlanDay;
}
