import dataSource from "../config/typeorm.config";
import { Meal } from "../model/meal.entity";
import { MealPlan } from "../model/mealplan.entity";
import { MealPlanDay } from "../model/mealplanday.entity";
import { MealPlanMeal } from "../model/mealplanmeals.entity";
import {CalculationResult} from "../model/caculation.result";
import { User } from "../model/users.entity";
import type { CalorieResult } from "../api/calories/calories.interface";

export const mealRepository = dataSource.getRepository(Meal).extend({
  // Meal-related methods
  async findAllAsync(): Promise<Meal[]> {
    return this.find();
  },

  async findByIdAsync(id: string): Promise<Meal | null> {
    return this.findOneBy({ id: id });
  },

  async createMealAsync(meal: Meal): Promise<Meal> {
    const newMeal = this.create(meal);
    return this.save(newMeal);
  },

  async updateMealAsync(id: string, meal: Partial<Meal>): Promise<Meal | null> {
    await this.update(id, meal);
    return this.findByIdAsync(id);
  },

 async createMealPlanAsync(mealPlan: MealPlan): Promise<MealPlan> {
    const mealPlanRepository = dataSource.getRepository(MealPlan);

    // Vô hiệu hóa các MealPlan cũ của user
    if (mealPlan.user && mealPlan.user.id) {
      await mealPlanRepository.update(
        { user: { id: mealPlan.user.id }, is_active: true },
        { is_active: false }
      );
    }

    // Tạo MealPlan mới
    const newMealPlan = mealPlanRepository.create({
      ...mealPlan,
      is_active: true, // Đảm bảo is_active là true
    });

    // Lưu và trả về
    return mealPlanRepository.save(newMealPlan);
  },

  async findMealPlanByIdAsync(id: string): Promise<MealPlan | null> {
    const mealPlanRepository = dataSource.getRepository(MealPlan);
    return mealPlanRepository.findOneBy({ id: id });
  },

  async createMealPlanDayAsync(mealPlanDay: MealPlanDay): Promise<MealPlanDay> {
    const mealPlanDayRepository = dataSource.getRepository(MealPlanDay);
    const newMealPlanDay = mealPlanDayRepository.create(mealPlanDay);
    return mealPlanDayRepository.save(newMealPlanDay);
  },

  async findMealPlanDayByIdAsync(id: string): Promise<MealPlanDay | null> {
    const mealPlanDayRepository = dataSource.getRepository(MealPlanDay);
    return mealPlanDayRepository.findOneBy({ id: id });
  },

  async createMealPlanMealAsync(mealPlanMeal: MealPlanMeal): Promise<MealPlanMeal> {
    const mealPlanMealRepository = dataSource.getRepository(MealPlanMeal);
    const newMealPlanMeal = mealPlanMealRepository.create(mealPlanMeal);
    return mealPlanMealRepository.save(newMealPlanMeal);
  },

async createCalculationResultAsync(
    user: User,
    calorieResult: CalorieResult
  ): Promise<CalculationResult> {
    const repo = dataSource.getRepository(CalculationResult);

    await repo.update(
      { user: { id: user.id }, is_active: true },
      { is_active: false }
    );

    const newCalculationResult = repo.create({
      age: calorieResult.age,
      height: calorieResult.height,
      weight: calorieResult.weight,
      gender: calorieResult.gender,
      activityLevel: calorieResult.activityLevel,
      maintenanceCalories: calorieResult.maintenanceCalories,
      targetCalories: calorieResult.targetCalories,
      goal: calorieResult.goal,
      estimatedWeeklyChange: calorieResult.estimatedWeeklyChange,
      estimatedDaysToGoal: calorieResult.estimatedDaysToGoal,
      is_active: true,
      bmr: calorieResult.bmr,
      user,
    });

    return await repo.save(newCalculationResult);
  },
});