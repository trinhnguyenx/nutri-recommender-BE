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
  age: number;
  height: number;
  weight: number;
  gender: string;
  activityLevel: string;
  maintenanceCalories: number;
  targetCalories: number;
  goal: "gain" | "loss" | "maintenance";
  estimatedWeeklyChange: number;
  estimatedDaysToGoal: number;
  is_active: boolean;
  createdAt: string; 
  bmr: number

}

interface MealRecommendation {
  meal_id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string;
  meal_type: string;
}

interface MealPlanError {
  error: string;
}

type MealPlanEntry = MealRecommendation | MealPlanError;

interface MealPlanResponse {
  breakfast?: MealPlanEntry[];
  snack1?: MealPlanEntry[];
  lunch?: MealPlanEntry[];
  snack2?: MealPlanEntry[];
  dinner?: MealPlanEntry[];
  snack3?: MealPlanEntry[];
}

interface ExtendedCalorieResult extends CalorieResult {
  mealPlan: { [day: number]: MealPlanResponse };
  totalCalories: { [day: number]: number };
  mealPlanId: string;
}

interface ExtendedCalculateCaloriesParams {
  height: number;
  weight: number;
  age: number;
  gender: string;
  weightTarget: number;
  activityLevel: string;
  userId: string;
  weeklyGainRate: number;
  allergies: string[];
  planName?: string;
}
 interface MealPlanSummary {
  id: string;
  name: string;
  start_date: Date;
  is_active: boolean;
  maintenanceCalories: number;
  targetCalories: number;
  goal: string;
  estimatedWeeklyChange: number | null;
  estimatedDaysToGoal: number | null;
  calculation_id: string | null;
}

interface GetSuggestedMealsParams {
  mealId: string;
  mealType: string;
  currentCalories: number;
  allergies?: string[];
}


interface NutritionSummary {
  protein: number;
  fat: number;
  carbs: number;
}

interface UpdateMealPlanNameParams {
  mealPlanId: string;
  newName: string;
}

export interface MealPlanCalorieSummaryResponse {
  day_number: number;
  goal: string;
  breakfast_calories: number;
  targetCalories: number;
  lunch_calories: number;
  dinner_calories: number;
  snack1_calories: number;
  snack2_calories: number;
  snack3_calories: number;
  total_daily_calories: number;
  created_at: string;
}

export interface CalorieSummaryByDay {
  [day: number]: MealPlanCalorieSummaryResponse;
}

export interface CalorieStatsResponse {
  userId: string;
  mealPlanId: string;
  summaries: CalorieSummaryByDay;
}

interface RecordProgressParams {
  userId: string;
  weight: number;
  meals: boolean;
  sick?: boolean;
  sleep?: boolean;
  hunger?: string;
  caloBreakfast?: number;
  caloLunch?: number;
  caloDinner?: number;
  caloSnack?: number;
}

export type { CalculateCaloriesParams, CalorieResult, MealRecommendation, 
  MealPlanResponse, ExtendedCalorieResult, ExtendedCalculateCaloriesParams, 
  MealPlanSummary, GetSuggestedMealsParams, MealPlanEntry, NutritionSummary, UpdateMealPlanNameParams,RecordProgressParams };