interface CalculateCaloriesParams {
    height: number;
    weight: number;
    age: number;
    gender: string;
    weightTarget: number;
    activityLevel?: string;
    allergies?: string[];
    userId?: string;
}

interface CalorieResult {
    maintenanceCalories: number;
    targetCalories: number;
    goal: string;
    estimatedWeeklyChange: number;
    estimatedDaysToGoal: number;
}

interface MealRecommendation {
  meal_id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string;
}

interface MealPlanResponse {
  breakfast: MealRecommendation | { error: string };
  lunch: MealRecommendation | { error: string };
  dinner: MealRecommendation | { error: string };
  dessert: MealRecommendation | { error: string };
}

interface ExtendedCalorieResult extends CalorieResult {
  mealPlan: { [day: number]: MealPlanResponse };
  totalCalories: { [day: number]: number };
  mealPlanId: string;
}

interface ExtendedCalculateCaloriesParams extends CalculateCaloriesParams {
  userId: string;
  allergies: string[];
}

interface MealPlanSummary {
  id: string;
  name: string;
  start_date: Date;
  is_active: boolean;
}

interface GetSuggestedMealsParams {
  mealId: string;
  mealType: string;
  currentCalories: number;
  allergies?: string[];
}

export type { CalculateCaloriesParams, CalorieResult, MealRecommendation, 
  MealPlanResponse, ExtendedCalorieResult, ExtendedCalculateCaloriesParams, 
  MealPlanSummary, GetSuggestedMealsParams };