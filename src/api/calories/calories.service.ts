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

// Filter meals by meal_time (updated to not rely on meal.meal_time)
const mealTimeFilter = (meal: Meals, time: keyof MealPlanResponse): boolean => {
  const mainMealTypes = ["main", "carb", "salty", "soup", "xvegetable", "lvegetable", "boil"];
  const snackMealTypes = ["snack", "dessert"];
  return (
    (["breakfast", "lunch", "dinner"].includes(time) && (mainMealTypes.includes(meal.meal_type) || meal.meal_type === "dessert")) ||
    (["snack1", "snack2", "snack3"].includes(time) && snackMealTypes.includes(meal.meal_type))
  );
};

// Select snack or dessert meal (Optimized version)
const selectSnackOrDessert = (
  meals: Meals[],
  mealType: string,
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string
): Meals | null => {
  const repeatDays = 2;

  // LỚP 1: Thử tìm kiếm theo cách "lý tưởng"
  const idealMeals = meals.filter(
    (m) =>
      m.meal_type === mealType &&
      (m.suitable === suitable || m.suitable === "any") &&
      isMealAllergenFree(m, allergies) &&
      !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
      !usedMealIds.has(m.id)
  );

  if (idealMeals.length > 0) {
    // Nếu tìm thấy các món lý tưởng, áp dụng logic chọn tối ưu -> ngẫu nhiên
    let bestCandidate: Meals | null = null;
    let minDifference = Infinity;

    for (const meal of idealMeals) {
      const difference = Math.abs(meal.calories - targetCalories);
      if (difference < minDifference) {
        minDifference = difference;
        bestCandidate = meal;
      }
    }

    const calorieThreshold = 0.15; // Ngưỡng 15%
    if (bestCandidate && minDifference <= targetCalories * calorieThreshold) {
      console.log(`Selected optimal ${mealType}: ${bestCandidate.name}`);
      return bestCandidate;
    } else {
      const randomMeal = idealMeals[Math.floor(Math.random() * idealMeals.length)];
      console.log(`No optimal meal found. Selected random ${mealType}: ${randomMeal.name}`);
      return randomMeal;
    }
  }

  // LỚP 2: Kích hoạt cơ chế "Dự phòng" (tôn trọng dị ứng)
  console.warn(`No ideal meal found for ${mealType}. Activating allergy-aware fallback.`);
  const fallbackMeals = meals.filter(
    (m) => m.meal_type === mealType && isMealAllergenFree(m, allergies)
  );

  if (fallbackMeals.length > 0) {
    const fallbackMeal = fallbackMeals[Math.floor(Math.random() * fallbackMeals.length)];
    console.log(`FALLBACK: Selected random allergy-free ${mealType}: ${fallbackMeal.name}.`);
    return fallbackMeal;
  }

  // LỚP 3: Cơ chế "Dự phòng cuối cùng" (bỏ qua dị ứng)
  console.warn(`No allergy-free fallback found for ${mealType}. Activating LAST RESORT fallback.`);
  const lastResortMeals = meals.filter((m) => m.meal_type === mealType);

  if (lastResortMeals.length > 0) {
    const fallbackMeal = lastResortMeals[Math.floor(Math.random() * lastResortMeals.length)];
    console.log(`LAST RESORT FALLBACK: Selected random ${mealType}: ${fallbackMeal.name}. This may ignore allergies.`);
    return fallbackMeal;
  }

  // Trường hợp cuối cùng: không có món nào cùng loại trong CSDL
  console.error(`CRITICAL: No meals of type '${mealType}' found in the database at all.`);
  return null;
};


// Helper function to find the best meal based on criteria
const findBestMeal = (
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
  }
): Meals | null => {
  let bestMeal: Meals | null = null;
  let minDifference = Infinity;
  const repeatDays = 2;

  const mealTypes = Array.isArray(criteria.mealType) ? criteria.mealType : [criteria.mealType];

  for (const meal of meals) {
    // Basic filtering
    if (
      !mealTypes.includes(meal.meal_type) ||
      !(meal.suitable === criteria.suitable || meal.suitable === "any") ||
      !isMealAllergenFree(meal, criteria.allergies) ||
      criteria.usedMealIds.has(meal.id)
    ) {
      continue;
    }

    // Conditionally apply the repeat rule
    if (!criteria.ignoreRepeatRule) {
      if (isMealUsedInLastNDays(meal.id, meal.meal_type, criteria.mealPlan, criteria.time, criteria.currentDay, repeatDays)) {
        continue;
      }
    }

    // If all filters pass, check if it's a better candidate
    const difference = Math.abs(meal.calories - criteria.targetCalories);
    if (difference < minDifference) {
      minDifference = difference;
      bestMeal = meal;
    }
  }
  return bestMeal;
};

// Helper function for Weighted Random Selection based on user preference scores
const selectMealWithPreference = (
  meals: Meals[]
): Meals | null => {
  if (meals.length === 0) {
    return null;
  }

  let totalWeight = 0;
  const weightedMeals = meals.map(meal => {
    // Trọng số được tính dựa trên điểm, đảm bảo luôn > 0
    const weight = Math.max(0.1, 1 + (meal.score || 0));
    totalWeight += weight;
    return { meal, weight };
  });

  const randomValue = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (const { meal, weight } of weightedMeals) {
    cumulativeWeight += weight;
    if (randomValue <= cumulativeWeight) {
      return meal; // Trả về món ăn được chọn
    }
  }

  return meals[meals.length - 1]; // Fallback
};

// Helper function that wraps findBestMeal with a random fallback
const findMealWithFallback = (
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
  }
): Meals | null => {
  // 1. Try the ideal search first
  const bestMeal = findBestMeal(meals, criteria);
  if (bestMeal) {
    return bestMeal;
  }

  // 2. If ideal search fails, activate fallback (respecting allergies)
  const mealTypes = Array.isArray(criteria.mealType)
    ? criteria.mealType
    : [criteria.mealType];
  console.warn(
    `No ideal meal found for type(s) '${mealTypes.join(
      ", "
    )}'. Activating allergy-aware fallback.`
  );

  const fallbackMeals = meals.filter(
    (m) =>
      mealTypes.includes(m.meal_type) && isMealAllergenFree(m, criteria.allergies)
  );

  if (fallbackMeals.length > 0) {
    const fallbackMeal =
      fallbackMeals[Math.floor(Math.random() * fallbackMeals.length)];
    console.log(
      `FALLBACK: Selected random allergy-free meal of type '${fallbackMeal.meal_type}': ${fallbackMeal.name}. This ignores other rules.`
    );
    return fallbackMeal;
  }

  // 3. If allergy-aware fallback fails, activate last-resort fallback (ignoring allergies)
  console.warn(
    `No allergy-free fallback found for type(s) '${mealTypes.join(
      ", "
    )}'. Activating LAST RESORT fallback (may ignore allergies).`
  );

  const lastResortMeals = meals.filter((m) => mealTypes.includes(m.meal_type));

  if (lastResortMeals.length > 0) {
    const fallbackMeal =
      lastResortMeals[Math.floor(Math.random() * lastResortMeals.length)];
    console.log(
      `LAST RESORT FALLBACK: Selected random meal of type '${fallbackMeal.meal_type}': ${fallbackMeal.name}. This IGNORES ALL RULES.`
    );
    return fallbackMeal;
  }

  // 4. Final case: no meals of this type exist at all
  console.error(
    `CRITICAL: No meals of type(s) '${mealTypes.join(
      ", "
    )}' found in the database at all.`
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
  time: "lunch" | "dinner",
  currentDay: number
): "COMPOSED_WITH_CARB" | "COMPOSED_NO_CARB" | "SINGLE_DISH" => {
  const dayOfWeek = (currentDay - 1) % 7; // 0=Sun, 1=Mon, ..., 6=Sat (adjust if start day is different)

  switch (goal) {
    case "loss":
      // For weight loss, carb at lunch, no carb at dinner.
      return time === "lunch" ? "COMPOSED_WITH_CARB" : "COMPOSED_NO_CARB";

    case "maintenance":
      // For maintenance, carb at lunch, single dish for dinner for variety.
      return time === "lunch" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";

    case "gain":
      // For weight gain, implement the flexible weekly carb schedule.
      // Days 0, 1 (e.g., Sun, Mon): Carb at lunch only.
      if ([0, 3].includes(dayOfWeek)) {
        return time === "lunch" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";
      }
      // Days 2, 3 (e.g., Tue, Wed): Carb at dinner only.
      if ([1, 4].includes(dayOfWeek)) {
        return time === "dinner" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";
      }
      // Days 4, 5 (e.g., Thu, Fri): Carb at both lunch and dinner.
      if ([2, 5].includes(dayOfWeek)) {
        return "COMPOSED_WITH_CARB";
      }
      // Day 6 (e.g., Sat): Flexible, let's do carb at lunch.
      if (dayOfWeek === 6) {
        return time === "lunch" ? "COMPOSED_WITH_CARB" : "SINGLE_DISH";
      }
      // Fallback for any unexpected case
      return "COMPOSED_WITH_CARB";

    default:
      // Default strategy if goal is not specified.
      return "COMPOSED_WITH_CARB";
  }
};

const selectMainMeals = (
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  goal: "gain" | "loss" | "maintenance",
  allowedMealTypes: string[],
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string
): Meals[] => {
  const selectedMeals: Meals[] = [];

  // Determine the strategy for this specific meal
  const strategy = determineMealStrategy(goal, time as "lunch" | "dinner", currentDay);
  console.log(`Day ${currentDay}, ${time}: Meal strategy is '${strategy}'`);

  // --- STRATEGY: SINGLE_DISH ---
  if (strategy === "SINGLE_DISH") {
    const mainMeal = findMealWithFallback(meals, { // Use fallback to ensure a meal is always found
      mealType: "main",
      targetCalories: targetCalories * 0.8,
      allergies,
      usedMealIds,
      suitable,
      mealPlan,
      time,
      currentDay,
    });

    if (mainMeal) {
      console.log(`Selected SINGLE_DISH strategy: ${mainMeal.name}`);
      selectedMeals.push(mainMeal);
      usedMealIds.add(mainMeal.id);

      // Add a dessert to complement
      const dessert = selectSnackOrDessert(meals, "dessert", mealPlan, time, currentDay, targetCalories * 0.2, allergies, usedMealIds, suitable);
      if (dessert) {
        selectedMeals.push(dessert);
        usedMealIds.add(dessert.id);
      }
    } else {
       console.error(`CRITICAL: No 'main' dish found for SINGLE_DISH strategy on day ${currentDay}, ${time}.`);
    }
    return selectedMeals;
  }

  // --- STRATEGY: COMPOSED (with or without carb) ---
  console.log(`Composing meal for ${time} on day ${currentDay}`);
  let remainingCalories = targetCalories;
  const sideDishTypes = ["salty", "soup", "xvegetable", "lvegetable", "boil"];
  let numberOfSideDishes = 3;

  // 1. Select Carb (if applicable)
  if (strategy === "COMPOSED_WITH_CARB") {
    const carb = selectCarbByGoal(meals, goal, allergies);
    if (carb) {
      selectedMeals.push(carb);
      usedMealIds.add(carb.id);
      remainingCalories -= carb.calories;
      console.log(`Selected carb: ${carb.name} (${carb.calories} kcal)`);
    } else {
      console.warn(`No suitable carb found for ${time} on day ${currentDay}`);
    }
  } else {
    // Strategy is COMPOSED_NO_CARB, so we can add an extra side dish
    numberOfSideDishes = 4;
    console.log(`Strategy is COMPOSED_NO_CARB. Selecting ${numberOfSideDishes} side dishes.`);
  }


  // 2. Select Side Dishes
  const shuffledSideTypes = sideDishTypes.sort(() => 0.5 - Math.random());
  let sidesSelectedCount = 0;

  for (const sideType of shuffledSideTypes) {
    if (sidesSelectedCount >= numberOfSideDishes) break;

    const sideTargetCalories = remainingCalories / (numberOfSideDishes - sidesSelectedCount);
    const sideMeal = findMealWithFallback(meals, {
      mealType: sideType,
      targetCalories: sideTargetCalories,
      allergies,
      usedMealIds,
      suitable,
      mealPlan,
      time,
      currentDay,
    });

    if (sideMeal) {
      selectedMeals.push(sideMeal);
      usedMealIds.add(sideMeal.id);
      remainingCalories -= sideMeal.calories;
      sidesSelectedCount++;
      console.log(
        `Selected side (${sideType}): ${sideMeal.name} (${sideMeal.calories} kcal)`
      );
    }
  }
  if (sidesSelectedCount < numberOfSideDishes) {
     console.warn(`Could only select ${sidesSelectedCount} out of ${numberOfSideDishes} side dishes.`);
  }

  // 3. Select Dessert
  const dessertTargetCalories = remainingCalories > 0 ? remainingCalories : targetCalories * 0.1;
  const dessert = selectSnackOrDessert(meals, "dessert", mealPlan, time, currentDay, dessertTargetCalories, allergies, usedMealIds, suitable);
  if (dessert) {
    selectedMeals.push(dessert);
    usedMealIds.add(dessert.id);
    console.log(`Selected dessert: ${dessert.name} (${dessert.calories} kcal)`);
  }

  return selectedMeals;
};

// Generate 7-day meal plan
const generate7DayMealPlan = (
  meals: Meals[],
  allergies: string[],
  calorieTargets: { [key in keyof MealPlanResponse]: number },
  goal: "gain" | "loss" | "maintenance",
  startDay: number
): { mealPlan: { [day: number]: MealPlanResponse }; totalCalories: { [day: number]: number }; totalNutrition: { [day: number]: NutritionSummary }; weeklyTotalCalories: number } => {
  
  if (!meals || meals.length === 0) {
    throw new Error("Empty meal list");
  }

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
        selectedMeals = selectMainMeals(
          meals,
          mealPlan,
          time,
          day,
          calorieTargets[time] ?? 0,
          goal,
          ["main", "carb", "salty", "soup", "xvegetable", "lvegetable", "boil"],
          allergies,
          usedMealIds,
          suitable
        );
        if (selectedMeals.length === 0) {
          console.warn(`Could not find any suitable meals for ${time} on day ${day}.`);
        }
      } else {
        const snack = selectSnackOrDessert(
          meals,
          "snack",
          mealPlan,
          time,
          day,
          calorieTargets[time] ?? 0,
          allergies,
          usedMealIds,
          suitable
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
    height, weight, age, gender, weightTarget, userId, allergies, weeklyGainRate,activityLevel, planName});

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
  
  const maxMealPlansInGoal = estimatedDaysToGoal > 0 ? Math.floor(estimatedDaysToGoal / 7) : 0;
  const currentPlanWeek = Math.floor((startDay - 1) / 7);

  if (maxMealPlansInGoal > 0 && currentPlanWeek >= maxMealPlansInGoal) {
      throw new Error("Bạn đã tạo tối đa số thực đơn cho mục tiêu này.");
  }

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
  const { mealPlan, totalCalories, totalNutrition, weeklyTotalCalories } = generate7DayMealPlan(
    meals,
    allergies,
    calorieTargets,
    calorieResult.goal,
    startDay
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

  // Lấy meal_type của mealId
  const currentMeal = await mealRepo
    .createQueryBuilder("meal")
    .select("meal.meal_type", "meal_type")
    .where("meal.id = :mealId", { mealId })
    .getRawOne();

  if (!currentMeal) {
    console.warn(`Không tìm thấy món ăn với mealId=${mealId}`);
    return [];
  }

  const currentMealType = currentMeal.meal_type;

  // Danh sách meal_type hợp lệ cho các loại không phải main/dessert/carb
  const allMealType = ["soup", "salty", "xvegetable", "lvegetable", "boil"];

  // Kiểm tra allMealType có trong DB
  const existingMealTypes = await mealRepo
    .createQueryBuilder("meal")
    .select("DISTINCT meal.meal_type", "meal_type")
    .getRawMany()
    .then((results) => results.map((r) => r.meal_type));

  const validMealTypes = allMealType.filter((type) => existingMealTypes.includes(type));
  if (validMealTypes.length === 0 && !["main", "dessert", "carb"].includes(currentMealType)) {
    console.warn("Không tìm thấy meal_type hợp lệ trong database cho allMealType");
    return [];
  }

  // Tính khoảng calorie
  const lowerCal = currentCalories * 0.1;
  const upperCal = currentCalories * 1.9;

  // Xây dựng query
  const query = mealRepo
    .createQueryBuilder("meal")
    .where("meal.id != :mealId", { mealId })
    .andWhere("meal.calories BETWEEN :lowerCal AND :upperCal", { lowerCal, upperCal });

  // Lọc meal_type
  if (["main", "dessert", "carb"].includes(currentMealType)) {
    query.andWhere("meal.meal_type = :mealType", { mealType: currentMealType });
  } else {
    query.andWhere("meal.meal_type IN (:...validMealTypes)", { validMealTypes });
  }

  // Lọc dị ứng
  allergies.forEach((allergen, index) => {
    query.andWhere(`LOWER(meal.ingredients) NOT LIKE :allergen${index}`, {
      [`allergen${index}`]: `%${allergen.toLowerCase()}%`,
    });
  });

  // Sắp xếp theo độ gần với currentCalories
  query
    .orderBy(`ABS(meal.calories - :currentCalories)`, "ASC")
    .addOrderBy("meal.calories IS NULL", "ASC")
    .setParameters({ currentCalories });

  // Lấy kết quả
  const meals = await query.getMany();

  if (meals.length === 0) {
    console.warn(
      `Không tìm thấy món ăn thay thế cho mealId=${mealId}, mealType=${
        ["main", "dessert", "carb"].includes(currentMealType) ? currentMealType : validMealTypes.join(", ")
      }, calories=[${lowerCal}, ${upperCal}]`
    );
  }

  return meals;
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
        "meal_plan_day.mealPlan", 
        "meal_plan_day.mealPlan.user" // Quan trọng: để lấy được userId
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

  const prompt = `Bạn là một chuyên gia dinh dưỡng và huấn luyện viên sức khỏe AI. Nhiệm vụ của bạn là phân tích dữ liệu calo hàng ngày của người dùng và đưa ra những nhận xét, lời khuyên thân thiện, chi tiết và mang tính xây dựng để giúp họ đạt được mục tiêu.

Ngữ cảnh:
Người dùng đang theo một kế hoạch ăn uống được cá nhân hóa. Họ muốn biết họ đang thực hiện kế hoạch đó tốt như thế nào.

Hãy phân tích dữ liệu calo của người dùng và đưa ra nhận xét.

**Định dạng đầu ra mong muốn là một đối tượng JSON với hai khóa: "title" (một chuỗi ngắn gọn, hấp dẫn) và "reply" (một chuỗi chứa nội dung phản hồi chi tiết).**
`;

  const messageToAI = `
  Mục tiêu của tôi: ${mealPlan.goal === 'gain' ? 'Tăng cân' : mealPlan.goal === 'loss' ? 'Giảm cân' : 'Duy trì cân nặng'}
  Lượng calo mục tiêu hàng ngày: ${mealPlan.targetCalories.toFixed(0)} kcal
  Lượng calo tiêu thụ trung bình hàng ngày trong tuần: ${averageDailyCalories.toFixed(0)} kcal
  Dữ liệu chi tiết các ngày:
  ${dailyDataForAI.join('\n')}

  Dựa vào dữ liệu trên, hãy viết một phản hồi cho tôi theo cấu trúc sau:

  1.  **Nhận xét chung:**
      *   So sánh lượng calo tiêu thụ trung bình hàng ngày với lượng calo mục tiêu.
      *   Đánh giá mức độ tuân thủ kế hoạch của tôi.
      *   Chỉ ra những ngày tôi làm tốt và những ngày có thể cần cải thiện.
  2.  **Lời khuyên & Động viên:**
      *   Nếu tôi làm tốt: Khen ngợi và khuyến khích tôi tiếp tục duy trì. Đưa ra một vài mẹo nhỏ để tối ưu hơn nữa.
      *   Nếu tôi chưa đạt mục tiêu: Đừng chỉ trích. Thay vào đó, hãy đưa ra những gợi ý cụ thể và dễ thực hiện. Ví dụ: "Tôi thấy một vài ngày bạn đã tiêu thụ hơi nhiều calo hơn mục tiêu. Có lẽ bạn có thể thử thay thế bữa ăn nhẹ X bằng Y vào lần tới?" hoặc "Để đạt được mục tiêu ${mealPlan.goal}, việc duy trì lượng calo gần với ${mealPlan.targetCalories} là rất quan trọng. Hãy thử chuẩn bị trước bữa ăn để kiểm soát tốt hơn nhé."
      *   Cung cấp thêm 1-2 lời khuyên chung về dinh dưỡng hoặc lối sống phù hợp với mục tiêu của tôi (ví dụ: uống đủ nước, ngủ đủ giấc, tầm quan trọng của protein khi tăng cân...).
  3.  **Kết luận:** Một câu kết thúc tích cực và động viên.

  **Giọng văn:** Thân thiện, tích cực, chuyên nghiệp và dễ hiểu. Sử dụng "bạn" và "tôi" để tạo cảm giác cá nhân hóa.
  `;

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