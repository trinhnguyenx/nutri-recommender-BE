import { generateAIResponse } from "../../utils/gemini.utils";
import { mealRepository } from "../../repository/meal.Repository";
import { Meal } from "../../model/meal.entity";
import { MealPlan } from "../../model/mealplan.entity";
import { MealPlanDay } from "../../model/mealplanday.entity";
import { MealPlanMeal } from "../../model/mealplanmeals.entity";
import { CalculationResult } from "../../model/caculation.result";
import { userRepository } from "../../repository/userRepository";
import { userMealPreferenceRepository } from "../../repository/user.meal.preference.repository";
import {MealPlanSummary, GetSuggestedMealsParams } from "./calories.interface";
import { CalorieResult,ExtendedCalculateCaloriesParams, MealPlanResponse, MealPlanEntry, NutritionSummary, UpdateMealPlanNameParams, CalorieSummaryByDay} from "./calories.interface";
import { MealPlanCalorieSummary } from "@/model/mealplan.calories.summary";
import { UserProgress } from "@/model/user.progress.entity";
import { AIResponse } from "../chatbot/chatbot.interface";
import { UserMealPreference } from "../../model/user.meal.preference.entity";
import { In } from 'typeorm';
import { caloriesSummaryPrompt, calorieSummaryMessage } from '@/utils/prompt';


interface ExtendedCalorieResult extends CalorieResult {
  mealPlan: { [day: number]: MealPlanResponse };
  totalCalories: { [day: number]: number };
  totalNutrition: { [day: number]: NutritionSummary };
  weeklyTotalCalories: number;
  mealPlanId: string;
}

interface Meals {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string;
  meal_type: string;
  suitable: string;
  score?: number;
}

interface MealInPlan {
  mealPlanMealId: string;
  meal_time: string;
  meal: {
    meal_id: string;
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    ingredients: string;
    meal_type: string;
  };
}

export interface MealPlanDetail {
  day_number: number;
  date: Date;
  meals: MealInPlan[];
  totalCalories: number;
  totalNutrition: NutritionSummary;
  weeklyTotalCalories: number;
}

// Validate input parameters
const validateInputs = (params: ExtendedCalculateCaloriesParams) => {
  const { height, weight, age, gender, weightTarget, userId, allergies, weeklyGainRate, planName } = params;
  if (!height || !weight || !age || !gender || !weightTarget || !userId || !allergies || !weeklyGainRate || !planName) {
    throw new Error("Missing required parameters");
  }
  if (height <= 0 || weight <= 0 || age <= 0 || weightTarget <= 0) {
    throw new Error("Invalid input values");
  }
  if (!["male", "female"].includes(gender.toLowerCase())) {
    throw new Error("Invalid gender");
  }
  if (weeklyGainRate <= 0 || weeklyGainRate > 1) {
    throw new Error("Weekly gain/loss rate must be between 0-1 kg");
  }
};

// Calculate BMR using Mifflin-St Jeor formula
const calculateBMR = ({ height, weight, age, gender }: {
  height: number;
  weight: number;
  age: number;
  gender: string;
}) => {
  const bmr = 10 * weight + 6.25 * height - 5 * age;
  return gender.toLowerCase() === "male" ? bmr + 5 : bmr - 161;
};

// Get activity multiplier based on activity level
const getActivityMultiplier = (activityLevel: string = "moderate"): number => {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    veryactive: 1.725,
  };
  return multipliers[activityLevel.toLowerCase()] ?? multipliers.moderate;
};

// Adjust calories based on weight goal
const adjustCaloriesForGoal = (
  tdee: number,
  weightDifference: number,
  weeklyGainRate: number
): number => {
  const dailyCalorieAdjustment = (weeklyGainRate * 7700) / 7;
  if (weightDifference > 0) return tdee + dailyCalorieAdjustment; // Gain
  if (weightDifference < 0) return tdee - dailyCalorieAdjustment; // Loss
  return tdee;
};

const getMealSlots = (goal: "gain" | "loss" | "maintenance"): (keyof MealPlanResponse)[] => {
  return goal === "gain"
    ? ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"]
    : ["breakfast", "lunch", "snack2", "dinner"];
};

const getCalorieTargets = (
  targetCalories: number,
  goal: "gain" | "loss" | "maintenance"
): { [key in keyof MealPlanResponse]: number } => {
  const result: { [key in keyof MealPlanResponse]: number } = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack1: 0,
    snack2: 0,
    snack3: 0,
  };

  if (goal === "gain") {
    result.breakfast = Math.round(targetCalories * (Math.random() * 0.05 + 0.2)); 
    result.lunch = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); 
    result.dinner = Math.round(targetCalories * (Math.random() * 0.05 + 0.2)); 
    result.snack1 = Math.round(targetCalories * 0.1); 
    result.snack2 = Math.round(targetCalories * 0.1); 
    result.snack3 = Math.round(targetCalories * 0.1); 
    const total = Object.values(result).reduce((sum, val) => sum + val, 0);
    const adjust = targetCalories - total;
    result.lunch += adjust; 
  } else {
    result.breakfast = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); 
    result.lunch = Math.round(targetCalories * (Math.random() * 0.05 + 0.3)); 
    result.dinner = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); 
    result.snack2 = Math.round(targetCalories * 0.1);
    const total = Object.values(result).reduce((sum, val) => sum + val, 0);
    const adjust = targetCalories - total;
    result.lunch += adjust; 
  }

  return result;
};

// Check if meal contains allergens
const isMealAllergenFree = (meal: Meals, allergies: string[]): boolean => {
  if (!meal.ingredients) return true;
  return !allergies.some((allergen) =>
    meal.ingredients.toLowerCase().includes(allergen.toLowerCase())
  );
};

// Check if meal was used in the last N days
const isMealUsedInLastNDays = (
  mealId: string,
  mealType: string,
  mealPlan: { [day: number]: MealPlanResponse },
  mealTime: keyof MealPlanResponse,
  currentDay: number,
  n: number
): boolean => {
  const mainMealTypes = ["main", "carb", "salty", "soup", "xvegetable", "lvegetable", "boil"];
  const isMainMeal = mainMealTypes.includes(mealType);

  for (let day = Math.max(1, currentDay - n); day < currentDay; day++) {
    const dayPlan = mealPlan[day];
    if (!dayPlan) continue;

    if (isMainMeal) {
      for (const time of Object.keys(dayPlan) as (keyof MealPlanResponse)[]) {
        const meals = dayPlan[time] as MealPlanEntry[];
        if (meals && meals.some((m) => "meal_id" in m && m.meal_id === mealId)) {
          console.log(`Meal ${mealId} (type: ${mealType}) found in day ${day}, time ${time}, blocking reuse`);
          return true;
        }
      }
    } else {
      const meals = dayPlan[mealTime] as MealPlanEntry[];
      if (meals && meals.some((m) => "meal_id" in m && m.meal_id === mealId)) {
        console.log(`Meal ${mealId} (type: ${mealType}) found in day ${day}, time ${mealTime}, blocking reuse`);
        return true;
      }
    }
  }
  return false;
};


// Select snack or dessert meal (Optimized version)
const selectSnackOrDessert = async (
  userId: string,
  mealType: "snack" | "dessert",
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string,
  mealRepo: any 
): Promise<Meals | null> => {
  const repeatDays = 2;

  // LỚP 1: Thử tìm kiếm theo cách "lý tưởng" với weighted random selection
  const mealsWithScore = await getMealsWithPreference(userId, [mealType], mealRepo);
  const idealMeals = mealsWithScore.filter(
    (m) =>
      (m.suitable === suitable || m.suitable === "any") &&
      isMealAllergenFree(m, allergies) &&
      !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
      !usedMealIds.has(m.id)
  );

  if (idealMeals.length > 0) {
    // Try to find a meal close to target calories
    const bestCandidate = idealMeals.reduce((best, meal) => {
      const difference = Math.abs(meal.calories - targetCalories);
      return difference < Math.abs(best.calories - targetCalories) ? meal : best;
    }, idealMeals[0]);

    const calorieThreshold = 0.15; // Ngưỡng 15%
    if (Math.abs(bestCandidate.calories - targetCalories) <= targetCalories * calorieThreshold) {
      console.log(`Selected optimal ${mealType} (calorie-based): ${bestCandidate.name}`);
      return bestCandidate;
    } else {
      // Use weighted random selection
      const selectedMeal = selectMealWithPreference(idealMeals, `${mealType} selection`);
      if (selectedMeal) {
        console.log(`Selected weighted random ${mealType}: ${selectedMeal.name}`);
        return selectedMeal;
      }
    }
  }

  // LỚP 2: Kích hoạt cơ chế "Dự phòng" (tôn trọng dị ứng)
  console.warn(`No ideal meal found for ${mealType}. Activating allergy-aware fallback.`);
  const fallbackMealsWithScore = await getMealsWithPreference(userId, [mealType], mealRepo);
  const allergyFreeFallbackMeals = fallbackMealsWithScore.filter((m) => isMealAllergenFree(m, allergies));

  if (allergyFreeFallbackMeals.length > 0) {
    const selectedMeal = selectMealWithPreference(allergyFreeFallbackMeals, `${mealType} allergy-free fallback`);
    if (selectedMeal) {
      console.log(`FALLBACK: Selected random allergy-free ${mealType}: ${selectedMeal.name}`);
      return selectedMeal;
    }
  }
  // Trường hợp cuối cùng: không có món nào cùng loại trong CSDL
  console.error(`CRITICAL: No meals of type '${mealType}' found in the database at all.`);
  return null;
};


// Helper function to find the best meal based on criteria
// const findBestMeal = async (
//   meals: Meals[],
//   criteria: {
//     mealType: string | string[];
//     targetCalories: number;
//     allergies: string[];
//     usedMealIds: Set<string>;
//     suitable: string;
//     mealPlan: { [day: number]: MealPlanResponse };
//     time: keyof MealPlanResponse;
//     currentDay: number;
//     ignoreRepeatRule?: boolean;
//   },
//   userId: string,
//   mealRepo: any
// ): Promise<Meals | null> => {
//   const repeatDays = 2;
//   const mealTypes = Array.isArray(criteria.mealType) ? criteria.mealType : [criteria.mealType];

//   // Lấy danh sách món ăn với score từ mealRepo
//   const mealsWithScore = await getMealsWithPreference(userId, mealTypes, mealRepo);

//   // Tìm minScore và maxScore để chuẩn hóa
//   const scores = mealsWithScore.map(m => m.score);
//   const minScore = Math.min(...scores);
//   const maxScore = Math.max(...scores);
//   const scoreRange = maxScore - minScore || 1; // Tránh chia cho 0

//   let bestMeal: Meals | null = null;
//   let maxCombinedScore = -Infinity;

//   for (const meal of mealsWithScore) {
//     // Basic filtering
//     if (
//       !mealTypes.includes(meal.meal_type) ||
//       !(meal.suitable === criteria.suitable || meal.suitable === "any") ||
//       !isMealAllergenFree(meal, criteria.allergies) ||
//       criteria.usedMealIds.has(meal.id)
//     ) {
//       continue;
//     }

//     // Conditionally apply the repeat rule
//     if (!criteria.ignoreRepeatRule) {
//       if (isMealUsedInLastNDays(meal.id, meal.meal_type, criteria.mealPlan, criteria.time, criteria.currentDay, repeatDays)) {
//         continue;
//       }
//     }

//     // Tính calorieScore
//     const calorieDifference = Math.abs(meal.calories - criteria.targetCalories) / criteria.targetCalories;
//     const calorieScore = 1 - calorieDifference;

//     // Tính preferenceScore
//     const preferenceScore = (meal.score - minScore) / scoreRange;

//     // Tính combinedScore với trọng số 60% calo, 40% sở thích
//     const combinedScore = 0.6 * calorieScore + 0.4 * preferenceScore;

//     if (combinedScore > maxCombinedScore) {
//       maxCombinedScore = combinedScore;
//       bestMeal = meal;
//     }
//   }
//   return bestMeal;
// };

const getMealsWithPreference = async (
  userId: string,
  mealTypes: string[],
  mealRepo: any 
): Promise<(Meals & { score: number })[]> => {
  try {
    const query = mealRepo
      .createQueryBuilder('meal')
      .leftJoin(
        UserMealPreference,
        'pref',
        'pref.mealId = meal.id AND pref.userId = :userId',
        { userId }
      )
      .addSelect('COALESCE(pref.score, 0)', 'score')
      .where('meal.meal_type IN (:...mealTypes)', { mealTypes });

    const result = await query.getRawAndEntities();

    return result.entities.map((meal: Meals, index: number) => ({
      ...meal,
      score: Number(result.raw[index].score) || 0, 
    }));
  } catch (error) {
    console.error(`Error fetching meals with preferences for user ${userId}:`, error);
    return []; 
  }
};


const selectMealWithPreference = (
  meals: (Meals & { score: number })[],
  logContext: string = "unknown"
): Meals | null => {
  if (meals.length === 0) {
    console.warn(`No meals available for weighted random selection in context: ${logContext}`);
    return null;
  }

  // Normalize weights to avoid extreme disparities
  const scores = meals.map(m => m.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore || 1; // Avoid division by zero

  let totalWeight = 0;
  const weightedMeals = meals.map(meal => {
    // Normalize score to [0, 1] and scale to weight
    const normalizedScore = (meal.score - minScore) / scoreRange;
    const weight = Math.max(0.1, 1 + normalizedScore * 4); 
    totalWeight += weight;
    return { meal, weight };
  });

  const randomValue = Math.random() * totalWeight;
  let cumulativeWeight = 0;

  for (const { meal, weight } of weightedMeals) {
    cumulativeWeight += weight;
    if (randomValue <= cumulativeWeight) {
      console.log(`Selected meal via weighted random (${logContext}): ${meal.name} (score: ${meal.score}, weight: ${weight.toFixed(2)})`);
      return meal;
    }
  }

  // Random fallback to avoid bias from list order
  const randomIndex = Math.floor(Math.random() * meals.length);
  console.log(`Weighted random fallback (${logContext}): ${meals[randomIndex].name} (score: ${meals[randomIndex].score})`);
  return meals[randomIndex];
};


// Helper function that wraps findBestMeal with a random fallback
const findMealWithFallback = async (
  meals: Meals[],
  criteria: {
    mealType: string | string[];
    targetCalories: number;
    allergies: string[];
    usedMealIds: Set<string>;
    suitable: string;
    mealPlan: { [day: number]: MealPlanResponse };
    time: keyof MealPlanResponse;
    currentDay: number;
    ignoreRepeatRule?: boolean;
  },
  userId: string, 
  mealRepo: any
): Promise<Meals | null> => {

  const mealTypes = Array.isArray(criteria.mealType)
    ? criteria.mealType
    : [criteria.mealType];
  console.warn(
    `Không tìm thấy món lý tưởng cho loại '${mealTypes.join(", ")}'. Kích hoạt fallback tôn trọng dị ứng.`
  );

  // Lấy danh sách món ăn với score từ mealRepo
  const fallbackMealsWithScore = await getMealsWithPreference(userId, mealTypes, mealRepo);
  const fallbackMeals = fallbackMealsWithScore.filter(
    (m) =>
      mealTypes.includes(m.meal_type) &&
      isMealAllergenFree(m, criteria.allergies) &&
      !criteria.usedMealIds.has(m.id)
  );

  if (fallbackMeals.length > 0) {
    // Sử dụng Weighted Random Selection để chọn món
    const fallbackMeal = selectMealWithPreference(fallbackMeals, `Fallback cho ${mealTypes.join(", ")}`);
    if (fallbackMeal) {
      console.log(
        `FALLBACK: Đã chọn món không gây dị ứng theo sở thích, loại '${fallbackMeal.meal_type}': ${fallbackMeal.name}.`
      );
      return fallbackMeal;
    }
  }

  console.error(
    `LỖI NGHIÊM TRỌNG: Không tìm thấy món nào thuộc loại '${mealTypes.join(", ")}' trong cơ sở dữ liệu.`
  );
  return null;
};

// Helper function to select a carb based on the user's goal
const selectCarbByGoal = (
  meals: Meals[],
  goal: "gain" | "loss" | "maintenance",
  allergies: string[]
): Meals | null => {
  // 1. Filter for available, non-allergenic carbs first
  let availableCarbs = meals.filter(
    (m) => m.meal_type === "carb" && isMealAllergenFree(m, allergies)
  );

  // 2. If no allergy-free carbs, activate fallback
  if (availableCarbs.length === 0) {
    console.warn(
      `No allergy-free carb found. Activating fallback to select a carb and ignore allergies.`
    );
    availableCarbs = meals.filter((m) => m.meal_type === "carb");
  }

  // 3. If still no carbs, return null
  if (availableCarbs.length === 0) {
    console.error(`CRITICAL: No meals of type 'carb' found in the database.`);
    return null;
  }

  // 4. Apply goal-based selection logic
  if (goal === "gain" || goal === "maintenance") {
    // Find the carb with the maximum calories
    return availableCarbs.reduce((max, m) =>
      m.calories > max.calories ? m : max, availableCarbs[0]
    );
  } else {
    // goal === "loss"
    // Find the carb with the minimum calories
    return availableCarbs.reduce((min, m) =>
      m.calories < min.calories ? m : min, availableCarbs[0]
    );
  }
};

// Meal Strategy Brain V2: Determines meal structure based on goal, time, and day of the week.
const determineMealStrategy = (
  goal: "gain" | "loss" | "maintenance",
  time: "lunch" | "dinner" | "breakfast",
  currentDay: number
): "COMPOSED_WITH_CARB" | "COMPOSED_NO_CARB" | "SINGLE_DISH" => {
  const cycle = (currentDay - 1) % 7;

  if (goal === "loss") {
    // Low carb vào buổi tối, có carb vào trưa
    return time === "lunch" ? "COMPOSED_WITH_CARB" : "COMPOSED_NO_CARB";
  }

  if (goal === "maintenance") {
    // Đa dạng xen kẽ giữa composed và single
    return cycle % 2 === 0
      ? time === "lunch" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH"
      : time === "lunch" ? "SINGLE_DISH" : "COMPOSED_WITH_CARB";
  }

  if (goal === "gain") {
    // Dùng cycle để làm đa dạng, nhưng vẫn đảm bảo có carb thường xuyên
    switch (cycle) {
      case 0:
      case 3:
        return time === "lunch" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";
      case 1:
      case 4:
        return time === "dinner" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";
      case 2:
      case 5:
        return "COMPOSED_WITH_CARB";
      case 6:
        return time === "lunch" ? "SINGLE_DISH" : "COMPOSED_WITH_CARB";
      default:
        return "SINGLE_DISH";
    }
  }

  return "SINGLE_DISH";
};


const suggestMainMeal = async (
  userId: string,
  mealTypes: string[],
  allergies: string[],
  mealRepo: any
): Promise<Meals | null> => {
  const mealsWithScore = await getMealsWithPreference(userId, mealTypes, mealRepo);
  // Lọc dị ứng
  const allergenFreeMeals = mealsWithScore.filter(m => isMealAllergenFree(m, allergies));
  return selectMealWithPreference(allergenFreeMeals);
};

const isDoubleCarbDay = (goal: string, currentDay: number): boolean => {
  const allowedGoals = ["gain", "loss", "maintenance"] as const;
  const safeGoal = allowedGoals.includes(goal as any) ? (goal as "gain" | "loss" | "maintenance") : "maintenance";
  const breakfastStrategy = determineMealStrategy(safeGoal, "breakfast", currentDay);
  const lunchStrategy = determineMealStrategy(safeGoal, "lunch", currentDay);
  const dinnerStrategy = determineMealStrategy(safeGoal, "dinner", currentDay);
  return breakfastStrategy === "COMPOSED_WITH_CARB" && lunchStrategy === "COMPOSED_WITH_CARB" && dinnerStrategy === "COMPOSED_WITH_CARB";
};

const selectMainMeals = async (
  userId: string,
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  goal: "gain" | "loss" | "maintenance",
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string,
  mealRepo: any
): Promise<Meals[]> => {
  const selectedMeals: Meals[] = [];

  // Kiểm tra nếu là buổi sáng và goal = "gain", không chọn chiến lược có cơm
  if (time === "breakfast" && goal === "gain") {
    const mainMeal = await suggestMainMeal(userId, ["main"], allergies, mealRepo);
    if (mainMeal) {
      console.log(`Chọn món chính cho bữa sáng: ${mainMeal.name}`);
      selectedMeals.push(mainMeal);
      usedMealIds.add(mainMeal.id);

      // Thêm món tráng miệng (dessert)
      const dessertTargetCalories = targetCalories * 0.2;
      const dessert = await selectSnackOrDessert(
        userId,
        "dessert",
        mealPlan,
        time,
        currentDay,
        dessertTargetCalories,
        allergies,
        usedMealIds,
        suitable,
        mealRepo
      );
      if (dessert) {
        selectedMeals.push(dessert);
        usedMealIds.add(dessert.id);
        console.log(`Chọn món tráng miệng: ${dessert.name} (${dessert.calories} kcal)`);
      }
    } else {
      console.error(`LỖI NGHIÊM TRỌNG: Không tìm thấy món chính (main) cho bữa sáng vào ngày ${currentDay}.`);
    }
    return selectedMeals;
  }

  // Đếm số bữa có cơm trong ngày hiện tại
let carbMealCount = 0;
if (mealPlan[currentDay]) {
  for (const mealTime of ["lunch", "dinner"] as (keyof MealPlanResponse)[]) {
    const mealsForTime = mealPlan[currentDay][mealTime];
    // Assuming mealsForTime is an array of MealRecommendation or similar
    if (mealsForTime && mealsForTime.some((meal: any) => meal.meal_type === "carb" || meal.mealType === "carb")) {
      carbMealCount++;
    }
  }
}

  // Chỉ cho phép chiến lược COMPOSED_WITH_CARB nếu số bữa có cơm < 2 và goal = "gain"
  const strategy = determineMealStrategy(goal, time as "lunch" | "dinner", currentDay);
  console.log(`Ngày ${currentDay}, ${time}: Chiến lược là '${strategy}'`);

  // --- Chiến lược: SINGLE_DISH hoặc COMPOSED_NO_CARB ---
  if (
    strategy === "SINGLE_DISH" ||
    strategy === "COMPOSED_NO_CARB" ||
    (goal === "gain" && carbMealCount >= 2)
  ) {
    // Chỉ chọn món chính (main) và dessert
    const mainMeal = await suggestMainMeal(userId, ["main"], allergies, mealRepo);
    if (mainMeal) {
      console.log(`Chọn chiến lược ${strategy}: ${mainMeal.name}`);
      selectedMeals.push(mainMeal);
      usedMealIds.add(mainMeal.id);

      // Thêm món tráng miệng (dessert)
      const dessertTargetCalories = targetCalories * 0.2;
      const dessert = await selectSnackOrDessert(
        userId,
        "dessert",
        mealPlan,
        time,
        currentDay,
        dessertTargetCalories,
        allergies,
        usedMealIds,
        suitable,
        mealRepo
      );
      if (dessert) {
        selectedMeals.push(dessert);
        usedMealIds.add(dessert.id);
        console.log(`Chọn món tráng miệng: ${dessert.name} (${dessert.calories} kcal)`);
      }
    } else {
      console.error(`LỖI NGHIÊM TRỌNG: Không tìm thấy món chính (main) cho chiến lược ${strategy} vào ngày ${currentDay}, ${time}.`);
    }
    return selectedMeals;
  }

  // --- Chiến lược: COMPOSED_WITH_CARB ---
  console.log(`Tạo bữa ăn có cơm cho ${time} vào ngày ${currentDay}`);
  let remainingCalories = targetCalories;
  const doubleCarb = isDoubleCarbDay(goal, currentDay);
  const sideDishTypes = doubleCarb ? ["salty", "soup"] : ["salty", "soup", "xvegetable", "lvegetable", "boil"];
  const numberOfSideDishes = 3; // Chọn đúng 3 món phụ khi có cơm

  // 1. Chọn món carb
  const carb = selectCarbByGoal(meals, goal, allergies);
  if (carb) {
    selectedMeals.push(carb);
    usedMealIds.add(carb.id);
    remainingCalories -= carb.calories;
    console.log(`Chọn món carb: ${carb.name} (${carb.calories} kcal)`);
  } else {
    console.warn(`Không tìm thấy món carb phù hợp cho ${time} vào ngày ${currentDay}. Chuyển sang chọn món chính.`);
    // Fallback: chọn món chính (main) + dessert nếu không có carb
    const mainMeal = await suggestMainMeal(userId, ["main"], allergies, mealRepo);
    if (mainMeal) {
      selectedMeals.push(mainMeal);
      usedMealIds.add(mainMeal.id);
      console.log(`Chuyển sang chọn món chính: ${mainMeal.name} (${mainMeal.calories} kcal)`);
    }
    // Thêm dessert
    const dessertTargetCalories = targetCalories * 0.2;
    const dessert = await selectSnackOrDessert(
      userId,
      "dessert",
      mealPlan,
      time,
      currentDay,
      dessertTargetCalories,
      allergies,
      usedMealIds,
      suitable,
      mealRepo
    );
    if (dessert) {
      selectedMeals.push(dessert);
      usedMealIds.add(dessert.id);
      console.log(`Chọn món tráng miệng: ${dessert.name} (${dessert.calories} kcal)`);
    }
    return selectedMeals;
  }

  // 2. Chọn 3 món phụ (side dishes)
  const shuffledSideTypes = sideDishTypes.sort(() => 0.5 - Math.random());
  let sidesSelectedCount = 0;

  for (const sideType of shuffledSideTypes) {
    if (sidesSelectedCount >= numberOfSideDishes) break;

    const sideTargetCalories = remainingCalories / (numberOfSideDishes - sidesSelectedCount);
    const sideMeal = await findMealWithFallback(
      meals,
      {
        mealType: sideType,
        targetCalories: sideTargetCalories,
        allergies,
        usedMealIds,
        suitable,
        mealPlan,
        time,
        currentDay,
      },
      userId,
      mealRepo
    );

    if (sideMeal) {
      selectedMeals.push(sideMeal);
      usedMealIds.add(sideMeal.id);
      remainingCalories -= sideMeal.calories;
      sidesSelectedCount++;
      console.log(`Chọn món phụ (${sideType}): ${sideMeal.name} (${sideMeal.calories} kcal)`);
    }
  }
  if (sidesSelectedCount < numberOfSideDishes) {
    console.warn(`Chỉ chọn được ${sidesSelectedCount} trong số ${numberOfSideDishes} món phụ.`);
  }

  // 3. Chọn món tráng miệng (dessert)
  const dessertTargetCalories = remainingCalories > 0 ? remainingCalories : targetCalories * 0.1;
  const dessert = await selectSnackOrDessert(
    userId,
    "dessert",
    mealPlan,
    time,
    currentDay,
    dessertTargetCalories,
    allergies,
    usedMealIds,
    suitable,
    mealRepo
  );
  if (dessert) {
    selectedMeals.push(dessert);
    usedMealIds.add(dessert.id);
    console.log(`Chọn món tráng miệng: ${dessert.name} (${dessert.calories} kcal)`);
  }

  return selectedMeals;
};

// Generate 7-day meal plan
const generate7DayMealPlan = async (
  userId: string,
  meals: Meals[],
  allergies: string[],
  calorieTargets: { [key in keyof MealPlanResponse]: number },
  goal: "gain" | "loss" | "maintenance",
  startDay: number,
  mealRepo: any // Replace with proper repository type
): Promise<{
  mealPlan: { [day: number]: MealPlanResponse };
  totalCalories: { [day: number]: number };
  totalNutrition: { [day: number]: NutritionSummary };
  weeklyTotalCalories: number;
}> => {
  if (!meals || meals.length === 0) {
    throw new Error("Empty meal list");
  }

  // Validate meals (unchanged)
  meals.forEach((meal, index) => {
    if (!meal.id || meal.calories <= 0 || !meal.name) {
      console.warn(`Invalid meal at index ${index}:`, meal);
      throw new Error("Invalid meal data: MealID, name, or calories missing/invalid");
    }
  });

  const mealIds = meals.map((m) => m.id);
  if (new Set(mealIds).size !== mealIds.length) {
    console.warn("Duplicate meal IDs found:", mealIds);
    throw new Error("Duplicate meal IDs in database");
  }

  const mealPlan: { [day: number]: MealPlanResponse } = {};
  const totalCalories: { [day: number]: number } = {};
  const totalNutrition: { [day: number]: NutritionSummary } = {};
  let weeklyTotalCalories = 0;
  const suitable = goal === "gain" ? "gain" : "loss";

  // Log warnings for missing meal types (unchanged)
  if (!meals.some((m) => m.meal_type === "main")) {
    console.warn("No main meals available");
  }
  if (!meals.some((m) => m.meal_type === "snack")) {
    console.warn("No snack meals available");
  }
  if (!meals.some((m) => m.meal_type === "dessert")) {
    console.warn("No dessert meals available");
  }
  if (!meals.some((m) => m.meal_type === "carb")) {
    console.warn("No carb meals available");
  }

  for (let i = 0; i < 7; i++) {
    const day = startDay + i;
    mealPlan[day] = {};
    totalCalories[day] = 0;
    totalNutrition[day] = { protein: 0, fat: 0, carbs: 0 };
    const mealSlots = getMealSlots(goal);
    const usedMealIds = new Set<string>();

    for (const time of mealSlots) {
      let selectedMeals: Meals[] = [];

      if (["breakfast", "lunch", "dinner"].includes(time)) {
        selectedMeals = await selectMainMeals(
          userId,
          meals,
          mealPlan,
          time,
          day,
          calorieTargets[time] ?? 0,
          goal,
          allergies,
          usedMealIds,
          suitable,
          mealRepo
        );
        if (selectedMeals.length === 0) {
          console.warn(`Could not find any suitable meals for ${time} on day ${day}.`);
        }
      } else {
        const snack = await selectSnackOrDessert(
          userId,
          "snack",
          mealPlan,
          time,
          day,
          calorieTargets[time] ?? 0,
          allergies,
          usedMealIds,
          suitable,
          mealRepo
        );
        if (snack) {
          selectedMeals = [snack];
        }
      }

      mealPlan[day][time] = selectedMeals.map((meal) => ({
        meal_id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein || 0,
        fat: meal.fat || 0,
        carbs: meal.carbs || 0,
        ingredients: meal.ingredients || "",
        meal_type: meal.meal_type || "",
      }));

      const mealCalories = selectedMeals.reduce((sum, m) => sum + m.calories, 0);
      totalCalories[day] += mealCalories;
      totalNutrition[day].protein += selectedMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
      totalNutrition[day].fat += selectedMeals.reduce((sum, m) => sum + (m.fat || 0), 0);
      totalNutrition[day].carbs += selectedMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    }

    weeklyTotalCalories += totalCalories[day];
  }

  return { mealPlan, totalCalories, totalNutrition, weeklyTotalCalories };
};

// Create meal plan entity
const createMealPlan = async (user: any, calculationResult: CalculationResult, PlanName: string): Promise<MealPlan> => {
  const mealPlan = new MealPlan();
  mealPlan.user = user;
  mealPlan.calculationResult = calculationResult;
  mealPlan.name = PlanName;
  mealPlan.start_date = new Date();
  mealPlan.end_date = new Date(new Date().setDate(new Date().getDate() + 7));
  mealPlan.is_active = true;
  mealPlan.maintenanceCalories = calculationResult.maintenanceCalories;
  mealPlan.targetCalories = calculationResult.targetCalories;
  mealPlan.goal = calculationResult.goal;
  mealPlan.estimatedWeeklyChange = calculationResult.estimatedWeeklyChange;
  mealPlan.estimatedDaysToGoal = calculationResult.estimatedDaysToGoal;
  return mealRepository.createMealPlanAsync(mealPlan);
};

// Create meal plan days
const createMealPlanDays = async (plan: MealPlan, startDay: number): Promise<MealPlanDay[]> => {
  const days: MealPlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const mealPlanDay = new MealPlanDay();
    mealPlanDay.meal_plan = plan;
    mealPlanDay.day_number = startDay + i;
    days.push(await mealRepository.createMealPlanDayAsync(mealPlanDay));
  }
  return days;
};

// Link meals to plan days
const linkMealsToPlanDays = async (
  mealPlan: { [day: number]: MealPlanResponse },
  mealPlanDays: MealPlanDay[],
  startDay: number
) => {
  for (let i = 0; i < 7; i++) {
    const day = startDay + i;
    const planDay = mealPlanDays[i];
    if (!mealPlan[day]) continue;
    for (const time of Object.keys(mealPlan[day]) as (keyof MealPlanResponse)[]) {
      const meals = mealPlan[day][time] as MealPlanEntry[];
      for (const mealInfo of meals) {
        if ("error" in mealInfo) {
          console.warn(`Day[${day}][${time}]: ${mealInfo.error}`);
          continue;
        }
        try {
          const meal = await mealRepository.findByIdAsync(mealInfo.meal_id);
          if (!meal) {
            console.error(`Meal not found: ${mealInfo.meal_id}, mealInfo:`, mealInfo);
            throw new Error(`Meal[${mealInfo.meal_id}] not found`);
          }
          const mealPlanMeal = new MealPlanMeal();
          mealPlanMeal.meal_plan_day = planDay;
          mealPlanMeal.meal = meal;
          mealPlanMeal.meal_time = time;
          await mealRepository.createMealPlanMealAsync(mealPlanMeal);
        } catch (error) {
          console.error(`Error linking meal for day ${day}, time ${time}:`, error);
        }
      }
    }
  }
};

// Main function to calculate calories and recommend meal plan
export const calculateCaloriesAndRecommend = async ({
  height,
  weight,
  age,
  gender,
  weightTarget,
  activityLevel,
  userId,
  allergies,
  weeklyGainRate = 0.5,
  planName = "7-day Meal Plan",
}: ExtendedCalculateCaloriesParams): Promise<ExtendedCalorieResult> => {
  validateInputs({
    height, weight, age, gender, weightTarget, userId, allergies, weeklyGainRate, activityLevel, planName,
  });

  const user = await userRepository.findByIdAsync(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.meal_plan_count <= 0) {
    throw new Error("Bạn đã hết lần tạo thực đơn.");
  }

  const bmr = calculateBMR({ height, weight, age, gender });
  const activityMultiplier = getActivityMultiplier(activityLevel);
  const tdee = bmr * activityMultiplier;

  const weightDifference = weightTarget - weight;
  const calories = adjustCaloriesForGoal(tdee, weightDifference, weeklyGainRate);

  const estimatedDaysToGoal =
    weightDifference !== 0 && weeklyGainRate > 0
      ? Math.ceil((Math.abs(weightDifference) / weeklyGainRate) * 7)
      : 0;

  const maxDayNumberResult = await mealRepository.manager.createQueryBuilder(MealPlanDay, "mpd")
    .leftJoin("mpd.meal_plan", "mp")
    .where("mp.user.id = :userId", { userId })
    .select("MAX(mpd.day_number)", "max_day")
    .getRawOne();

  const startDay = (maxDayNumberResult && maxDayNumberResult.max_day) ? maxDayNumberResult.max_day + 1 : 1;
//
  // const maxMealPlansInGoal = estimatedDaysToGoal > 0 ? Math.floor(estimatedDaysToGoal / 7) : 0;
  // const currentPlanWeek = Math.floor((startDay - 1) / 7);

  // if (maxMealPlansInGoal > 0 && currentPlanWeek >= maxMealPlansInGoal) {
  //   throw new Error("Bạn đã tạo tối đa số thực đơn cho mục tiêu này.");
  // }
//
  const calorieResult: CalorieResult = {
    maintenanceCalories: Math.round(tdee),
    targetCalories: Math.round(calories),
    goal: weightDifference > 0 ? "gain" : weightDifference < 0 ? "loss" : "maintenance",
    estimatedWeeklyChange: weightDifference !== 0 ? weeklyGainRate : 0,
    estimatedDaysToGoal,
    bmr,
    gender,
    age,
    height,
    weight,
    activityLevel: activityLevel ?? "moderate",
    is_active: true,
    createdAt: new Date().toISOString(),
  };

  // Update user profile directly
  Object.assign(user, {
    height,
    weight,
    age,
    gender,
    weightTarget,
    activityLevel: activityLevel ?? "moderate",
    allergies,
  });

  const savedCalculationResult = await mealRepository.createCalculationResultAsync(
    user,
    calorieResult
  );
  const rawMeals = await mealRepository.findAllAsync();
  console.log("Raw meals from repository:", rawMeals.slice(0, 5));
  const meals: Meals[] = rawMeals.map((meal: Meal) => ({
    id: meal.id || "",
    name: meal.name || "",
    calories: meal.calories || 0,
    protein: meal.protein || 0,
    fat: meal.fat || 0,
    carbs: meal.carbs || 0,
    ingredients: meal.ingredients || "",
    meal_type: meal.meal_type || "",
    suitable: meal.suitable || "any",
  }));
  console.log("Mapped meals:", meals.slice(0, 5));

  const calorieTargets = getCalorieTargets(calorieResult.targetCalories, calorieResult.goal);
  const { mealPlan, totalCalories, totalNutrition, weeklyTotalCalories } = await generate7DayMealPlan(
    userId,
    meals,
    allergies,
    calorieTargets,
    calorieResult.goal,
    startDay,
    mealRepository // Pass mealRepository
  );

  const mealPlanEntity = await createMealPlan(user, savedCalculationResult, planName);
  mealPlanEntity.maintenanceCalories = calorieResult.maintenanceCalories;
  mealPlanEntity.targetCalories = calorieResult.targetCalories;
  mealPlanEntity.goal = calorieResult.goal;
  mealPlanEntity.estimatedWeeklyChange = calorieResult.estimatedWeeklyChange;
  mealPlanEntity.estimatedDaysToGoal = calorieResult.estimatedDaysToGoal;
  await mealRepository.createMealPlanAsync(mealPlanEntity);

  const mealPlanDays = await createMealPlanDays(mealPlanEntity, startDay);

  await linkMealsToPlanDays(mealPlan, mealPlanDays, startDay);

  user.meal_plan_count -= 1;
  await userRepository.save(user); // Save all user changes at once

  const extendedResult: ExtendedCalorieResult = {
    mealPlan,
    totalCalories,
    totalNutrition,
    weeklyTotalCalories,
    mealPlanId: mealPlanEntity.id,
    ...calorieResult,
  };

  return extendedResult;
};

// Fetch user meal plans
const getUserMealPlans = async (userId: string): Promise<MealPlanSummary[]> => {
  const mealPlanRepository = mealRepository.manager.getRepository(MealPlan);
  const mealPlans = await mealPlanRepository.find({
    where: { user: { id: userId } },
    relations: ["calculationResult"],
    order: { start_date: "DESC" },
  });

  return mealPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    start_date: plan.start_date,
    is_active: plan.is_active,
    maintenanceCalories: plan.maintenanceCalories,
    targetCalories: plan.targetCalories,
    goal: plan.goal,
    estimatedWeeklyChange: plan.estimatedWeeklyChange,
    estimatedDaysToGoal: plan.estimatedDaysToGoal,
    calculation_id: plan.calculationResult ? plan.calculationResult.id : null,
  }));
};

// Get meal plan details with nutrition summary
const getMealPlanDetails = async (
  mealPlanId: string
): Promise<MealPlanDetail[]> => {
  const mealPlanDayRepository = mealRepository.manager.getRepository(MealPlanDay);

  const mealPlanDays = await mealPlanDayRepository.find({
    where: { meal_plan: { id: mealPlanId } },
    relations: ["meal_plan_meals", "meal_plan_meals.meal"],
    order: { day_number: "ASC" },
  });

  let weeklyTotalCalories = 0;
  const totalMealTypeCounts: Record<string, number> = {};
  mealPlanDays.forEach((day) => {
    day.meal_plan_meals.forEach((mealPlanMeal) => {
      const mealType = mealPlanMeal.meal.meal_type || "unknown";
      totalMealTypeCounts[mealType] = (totalMealTypeCounts[mealType] || 0) + 1;
    });
  });
  console.log("Total meal type counts:", totalMealTypeCounts);
  const mealPlanDetails: MealPlanDetail[] = mealPlanDays.map((day) => {
    const meals = day.meal_plan_meals.map((mealPlanMeal) => ({
      mealPlanMealId: mealPlanMeal.id,
      meal_time: mealPlanMeal.meal_time,
      meal: {
        meal_id: mealPlanMeal.meal.id,
        name: mealPlanMeal.meal.name,
        calories: mealPlanMeal.meal.calories || 0,
        protein: mealPlanMeal.meal.protein || 0,
        fat: mealPlanMeal.meal.fat || 0,
        carbs: mealPlanMeal.meal.carbs || 0,
        ingredients: mealPlanMeal.meal.ingredients || "",
        meal_type: mealPlanMeal.meal.meal_type || "",
      },
    }));

    let totalCalories = 0;
    const totalNutrition: NutritionSummary = {
      protein: 0,
      fat: 0,
      carbs: 0,
    };

    meals.forEach((m) => {
      totalCalories += m.meal.calories;
      totalNutrition.protein += m.meal.protein;
      totalNutrition.fat += m.meal.fat;
      totalNutrition.carbs += m.meal.carbs;
    });

    weeklyTotalCalories += totalCalories;

    return {
      day_number: day.day_number,
      date: new Date(Date.now() + (day.day_number - 1) * 24 * 60 * 60 * 1000),
      meals,
      totalCalories,
      totalNutrition,
      weeklyTotalCalories: 0,
    };
  });

  mealPlanDetails.forEach((day) => {
    day.weeklyTotalCalories = weeklyTotalCalories;
  });

  return mealPlanDetails;
};

// Get calculation result
 const getCalculationResult = async (
  userId: string,
  mealPlanId: string
): Promise<CalorieResult | null> => {
  const mealPlanRepository = mealRepository.manager.getRepository(MealPlan);

  const mealPlan = await mealPlanRepository.findOne({
    where: {
      id: mealPlanId,
      user: { id: userId },
    },
    relations: ["calculationResult"],
  });

  if (!mealPlan || !mealPlan.calculationResult) return null;

  const calculationResult = mealPlan.calculationResult;

  const allowedGoals = ["gain", "loss", "maintenance"] as const;
  const goal = allowedGoals.includes(calculationResult.goal as any)
    ? (calculationResult.goal as "gain" | "loss" | "maintenance")
    : "maintenance";

  return {
    age: calculationResult.age,
    height: calculationResult.height,
    weight: calculationResult.weight,
    gender: calculationResult.gender,
    activityLevel: calculationResult.activityLevel,
    maintenanceCalories: calculationResult.maintenanceCalories,
    targetCalories: calculationResult.targetCalories,
    goal,
    estimatedWeeklyChange: calculationResult.estimatedWeeklyChange,
    estimatedDaysToGoal: calculationResult.estimatedDaysToGoal,
    is_active: calculationResult.is_active,
    createdAt: calculationResult.createdAt?.toISOString(),
    bmr: calculationResult.bmr ?? 0,
  };
};

//Service for Swap meal
const getSuggestedMeals = async (
  params: GetSuggestedMealsParams & { allergies?: string[] }
): Promise<Meal[]> => {
  const { mealId, mealType, currentCalories, allergies = [] } = params;

  const mealRepo = mealRepository.manager.getRepository(Meal);

  const lowerCal = currentCalories * 0.1;
  const upperCal = currentCalories * 1.9;

  // Các loại món phụ cho phép
  const allSideMealTypes = ["soup", "salty", "xvegetable", "lvegetable", "boil"];
  const isMainDessertCarb = ["main", "carb", "dessert", "snack"].includes(mealType);

  // Xây dựng query
  const query = mealRepo
    .createQueryBuilder("meal")
    .where("meal.id != :mealId", { mealId })
    .andWhere("meal.calories BETWEEN :lowerCal AND :upperCal", { lowerCal, upperCal });

  if (isMainDessertCarb) {
    // Nếu là món chính, cơm, hoặc tráng miệng → chỉ suggest đúng loại đó
    query.andWhere("meal.meal_type = :mealType", { mealType });
  } else {
    // Nếu là món phụ → suggest tất cả các loại phụ có tồn tại
    const existingSideTypes: string[] = await mealRepo
      .createQueryBuilder("meal")
      .select("DISTINCT meal.meal_type", "meal_type")
      .where("meal.meal_type IN (:...types)", { types: allSideMealTypes })
      .getRawMany()
      .then((rows) => rows.map((r) => r.meal_type));

    if (existingSideTypes.length === 0) {
      console.warn("Không có loại món phụ nào hợp lệ trong DB.");
      return [];
    }

    query.andWhere("meal.meal_type IN (:...mealTypes)", { mealTypes: existingSideTypes });
  }

  // Lọc dị ứng
  allergies.forEach((allergen, i) => {
    query.andWhere(`LOWER(meal.ingredients) NOT LIKE :allergen${i}`, {
      [`allergen${i}`]: `%${allergen.toLowerCase()}%`,
    });
  });

  // Ưu tiên món gần calories nhất
  query
    .orderBy("ABS(meal.calories - :currentCalories)", "ASC")
    .addOrderBy("meal.calories IS NULL", "ASC")
    .setParameter("currentCalories", currentCalories);

  const results = await query.getMany();

  if (results.length === 0) {
    console.warn(
      `Không tìm thấy món ăn thay thế cho mealId=${mealId}, mealType=${mealType}, calories=[${lowerCal}, ${upperCal}]`
    );
  }

  return results;
};


// Get or create user meal preference
 const getOrCreatePreference = async (userId: string, mealId: string): Promise<UserMealPreference> => {
        // Tìm kiếm một bản ghi sở thích đã tồn tại
        let preference = await userMealPreferenceRepository.findOne({ 
            where: { userId, mealId } 
        });

        if (!preference) {
            preference = userMealPreferenceRepository.create({ 
                userId, 
                mealId, 
                score: 0
            });
            await userMealPreferenceRepository.save(preference);
        }

        return preference;
}  
/**
 * Hoán đổi một món ăn trong kế hoạch của người dùng và cập nhật điểm sở thích.
 * @param mealPlanMealId ID của bản ghi MealPlanMeal (dòng món ăn trong kế hoạch).
 * @param newMealId ID của món ăn mới sẽ được thay thế vào.
 */
export const swapMealInPlan = async (
  mealPlanMealId: string, 
  newMealId: string       
): Promise<void> => {
  const mealPlanMealRepo = mealRepository.manager.getRepository(MealPlanMeal);

  // 1. Tải bản ghi cần đổi, cùng với tất cả các thông tin liên quan cần thiết.
  const mealPlanMeal = await mealPlanMealRepo.findOne({
    where: { id: mealPlanMealId },
    relations: [
        "meal", // Món ăn cũ
        "meal_plan_day", 
        "meal_plan_day.meal_plan", 
        "meal_plan_day.meal_plan.user"
    ],
  });

  // Kiểm tra xem mọi thứ có tồn tại không
  if (!mealPlanMeal || !mealPlanMeal.meal_plan_day?.meal_plan?.user) {
    throw new Error("Không tìm thấy bản ghi món ăn trong kế hoạch hoặc người dùng liên quan.");
  }

  // 2. Lưu lại ID của món ăn cũ và ID người dùng TRƯỚC KHI thay đổi.
  const originalMealId = mealPlanMeal.meal.id;
  const userId = mealPlanMeal.meal_plan_day.meal_plan.user.id;

  // Không cho phép đổi với chính nó
  if (originalMealId === newMealId) {
      return; 
  }

  // 3. Gán món ăn mới và lưu lại thay đổi trong kế hoạch.
  mealPlanMeal.meal = { id: newMealId } as Meal;
  await mealPlanMealRepo.save(mealPlanMeal);

  // 4. Cập nhật điểm sở thích một cách an toàn.
  const originalMealPreference = await getOrCreatePreference(userId, originalMealId);
  const suggestedMealPreference = await getOrCreatePreference(userId, newMealId);

  originalMealPreference.score -= 1; 
  suggestedMealPreference.score += 1; 

  // Lưu cả hai thay đổi về điểm trong một lần gọi để tối ưu.
  await userMealPreferenceRepository.save([originalMealPreference, suggestedMealPreference]);
};

//update meal plan name
export const updateMealPlanName = async ({ mealPlanId, newName }: UpdateMealPlanNameParams): Promise<void> => {
  const mealPlanRepository = mealRepository.manager.getRepository(MealPlan);

  const mealPlan = await mealPlanRepository.findOne({
    where: { id: mealPlanId },
  });

  if (!mealPlan) {
    throw new Error("Không tìm thấy kế hoạch bữa ăn");
  }

  if (!newName || newName.trim() === "") {
    throw new Error("Tên mới không hợp lệ");
  }

  mealPlan.name = newName.trim();

  await mealPlanRepository.save(mealPlan);
};

const summarizeMealPlanCalories = async (userId: string): Promise<{ calorieSummaryByDay: CalorieSummaryByDay, aiAssessment: AIResponse }> => {
  const mealPlanRepository = mealRepository.manager.getRepository(MealPlan);
  const calorieSummaryRepository = mealRepository.manager.getRepository(MealPlanCalorieSummary);

  // Tìm meal plan đang hoạt động
  const mealPlan = await mealPlanRepository.findOne({
    where: { user: { id: userId }, is_active: true },
    relations: ["user"]
  });

  if (!mealPlan) {
    throw new Error("Không tìm thấy kế hoạch bữa ăn đang hoạt động cho người dùng");
  }

  const mealPlanDetails = await getMealPlanDetails(mealPlan.id);
  const goal = mealPlan.goal || "maintenance";

  const calorieSummaryByDay: CalorieSummaryByDay = {};
  let totalWeeklyCalories = 0;
  const dailyDataForAI: string[] = [];


  for (const day of mealPlanDetails) {
    const summary = new MealPlanCalorieSummary();
    summary.meal_plan = mealPlan;
    summary.user = mealPlan.user;
    summary.day_number = day.day_number;
    summary.goal = goal;

    summary.breakfast_calories = 0;
    summary.lunch_calories = 0;
    summary.dinner_calories = 0;
    summary.snack1_calories = 0;
    summary.snack2_calories = 0;
    summary.snack3_calories = 0;
    summary.total_daily_calories = 0;

    for (const meal of day.meals) {
      const calories = meal.meal.calories;
      const mealTime = meal.meal_time;

      switch (mealTime) {
        case "breakfast":
          summary.breakfast_calories += calories;
          break;
        case "lunch":
          summary.lunch_calories += calories;
          break;
        case "dinner":
          summary.dinner_calories += calories;
          break;
        case "snack1":
          if (goal === "gain") summary.snack1_calories += calories;
          break;
        case "snack2":
          summary.snack2_calories += calories; // Dùng cho cả goal khác
          break;
        case "snack3":
          if (goal === "gain") summary.snack3_calories += calories;
          break;
      }
    }

    // Tính tổng calo
    summary.total_daily_calories =
      summary.breakfast_calories +
      summary.lunch_calories +
      summary.dinner_calories +
      summary.snack2_calories;

    if (goal === "gain") {
      summary.total_daily_calories += summary.snack1_calories + summary.snack3_calories;
    }
    totalWeeklyCalories += summary.total_daily_calories;
    dailyDataForAI.push(`Ngày ${day.day_number}: ${summary.total_daily_calories.toFixed(0)} kcal`);
    // Lưu vào DB
    await calorieSummaryRepository.save(summary);

    // Gán vào object trả về
    calorieSummaryByDay[day.day_number] = {
      targetCalories: mealPlan.targetCalories,
      day_number: summary.day_number,
      goal: summary.goal,
      breakfast_calories: summary.breakfast_calories,
      lunch_calories: summary.lunch_calories,
      dinner_calories: summary.dinner_calories,
      snack1_calories: summary.snack1_calories,
      snack2_calories: summary.snack2_calories,
      snack3_calories: summary.snack3_calories,
      total_daily_calories: summary.total_daily_calories,
      created_at: summary.created_at?.toISOString(),
    };
  }
  const averageDailyCalories = totalWeeklyCalories / mealPlanDetails.length;

const messageToAI = calorieSummaryMessage(
  mealPlan.goal === 'gain' ? 'Tăng cân' : mealPlan.goal === 'loss' ? 'Giảm cân' : 'Duy trì cân nặng',
  mealPlan.targetCalories,
  averageDailyCalories,
  dailyDataForAI
);
const prompt = caloriesSummaryPrompt

  const aiAssessment = await generateAIResponse(messageToAI, prompt);


  return { calorieSummaryByDay, aiAssessment };
};

// Interface for recording progress
export interface RecordProgressParams {
  userId: string;
  weight: number;
}

/**
 * Records a new weight and calorie consumption entry for a user.
 * @param params - The parameters for recording progress.
 * @returns The newly created UserProgress entry.
 */
export const recordUserProgress = async (params: RecordProgressParams): Promise<UserProgress> => {
  const { userId, weight } = params;

  const user = await userRepository.findByIdAsync(userId);
  if (!user) {
    throw new Error('User not found');
  }


  const progressRepository = mealRepository.manager.getRepository(UserProgress);

  const newProgress = progressRepository.create({
    user,
    weight,
  });

  return progressRepository.save(newProgress);
};

/**
 * Retrieves the weight progress for a user, along with their weight target.
 * @param userId - The ID of the user.
 * @returns An object containing the user's progress entries and their weight target.
 */
export const getUserProgress = async (userId: string): Promise<{ progress: UserProgress[], weightTarget: number }> => {
  const user = await userRepository.findByIdAsync(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const progressRepository = mealRepository.manager.getRepository(UserProgress);

  const progress = await progressRepository.find({
    where: { user: { id: userId } },
    order: { recordedAt: 'ASC' },
  });

  return {
    progress,
    weightTarget: user.weightTarget,
  };
};

export const getLargestDayNumber = async (userId: string): Promise<{ max_day: number }> => {
  const maxDayNumberResult = await mealRepository.manager.createQueryBuilder(MealPlanDay, "mpd")
    .leftJoin("mpd.meal_plan", "mp")
    .where("mp.user.id = :userId", { userId })
    .select("MAX(mpd.day_number)", "max_day")
    .getRawOne();

  return { max_day: (maxDayNumberResult && maxDayNumberResult.max_day) ? maxDayNumberResult.max_day : 0 };
};

export {
  ExtendedCalculateCaloriesParams,
  getUserMealPlans,
  getMealPlanDetails,
  getCalculationResult,
  getSuggestedMeals,
  summarizeMealPlanCalories
};