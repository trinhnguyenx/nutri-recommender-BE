import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { MealPlanMeal } from './mealplanmeals.entity';
import { UserMealPreference } from './user.meal.preference.entity';

@Entity('meals')
export class Meal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('float')
  calories: number;

  @Column('float')
  protein: number;

  @Column('float')
  fat: number;

  @Column('float')
  carbs: number;

  @Column('text')
  ingredients: string;

  @Column('text')
  meal_type: string;

  @Column('text', { nullable: true })
  suitable: string;

  @Column('text', { nullable: true })
  image_url: string;

  @Column('text', { nullable: true })
  allergies: string;

  @OneToMany(() => MealPlanMeal, (mealPlanMeal) => mealPlanMeal.meal)
  meal_plan_meals: MealPlanMeal[];

  @OneToMany(() => UserMealPreference, preference => preference.meal)
  preferences: UserMealPreference[];
}
