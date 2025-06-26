import { generateAIResponse } from "../../utils/gemini.utils";
import { mealRepository } from "../../repository/meal.Repository";
import { Meal } from "../../model/meal.entity";
import { MealPlan } from "../../model/mealplan.entity";
import { MealPlanDay } from "../../model/mealplanday.entity";
import { MealPlanMeal } from "../../model/mealplanmeals.entity";
import { CalculationResult } from "../../model/caculation.result";
import { userRepository } from "../../repository/userRepository";
import { userMealPreferenceRepository } from "../../repository/user.meal.preference.repository";
import {progressRepository} from "../../repository/progress.Repository";
import {MealPlanSummary, GetSuggestedMealsParams } from "./calories.interface";
import { CalorieResult,ExtendedCalculateCaloriesParams, MealPlanResponse, MealPlanEntry, NutritionSummary, UpdateMealPlanNameParams, RecordProgressParams} from "./calories.interface";
import { MealPlanCalorieSummary } from "@/model/mealplan.calories.summary";
import { UserProgress } from "@/model/user.progress.entity";
import { AIResponse } from "../chatbot/chatbot.interface";
import { UserMealPreference } from "../../model/user.meal.preference.entity";
import { In } from 'typeorm';
import { caloriesSummaryPrompt, calorieSummaryMessage } from '@/utils/prompt';
import {CalculateRepository} from "@/repository/calcutionResult.Reposity";
import { get } from "http";


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
  is_favourite?: boolean;
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

const selectMealWithCombinedScore = (
  meals: (Meals & { score: number })[],
  targetCalories: number,
  logContext: string = "unknown"
): Meals | null => {
  if (meals.length === 0) {
    console.warn(`No meals available for selection in context: ${logContext}`);
    return null;
  }

  // Compute calorie scores
  const calorieDiffs = meals.map(meal => Math.abs(meal.calories - targetCalories));
  const maxDiff = Math.max(...calorieDiffs, 1); // Avoid division by zero
  const calorieScores = calorieDiffs.map(diff => 1 - diff / maxDiff);

  // Normalize preference scores
  const scores = meals.map(m => m.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const normalizedScores = maxScore > minScore
    ? scores.map(score => (score - minScore) / (maxScore - minScore))
    : meals.map(() => 1);

  // Compute combined scores (60% calorie, 40% preference)
  const combinedScores = meals.map((_, index) => 0.6 * calorieScores[index] + 0.4 * normalizedScores[index]);

  // Weighted random selection
  let totalWeight = combinedScores.reduce((sum, score) => sum + score, 0);
  if (totalWeight <= 0) {
    const randomIndex = Math.floor(Math.random() * meals.length);
    console.log(`Fallback random selection (${logContext}): ${meals[randomIndex].name}`);
    return meals[randomIndex];
  }

  const randomValue = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < meals.length; i++) {
    cumulative += combinedScores[i];
    if (randomValue <= cumulative) {
      console.log(`Selected meal (${logContext}): ${meals[i].name} (calorie score: ${calorieScores[i].toFixed(2)}, preference score: ${normalizedScores[i].toFixed(2)})`);
      return meals[i];
    }
  }
  return meals[meals.length - 1];
};


// Updated selectSnackOrDessert using combined score
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
  const repeatDays = 1;

  // Ideal case
  const mealsWithScore = await getMealsWithPreference(userId, [mealType], mealRepo);
  const idealMeals = mealsWithScore.filter(
    (m) =>
      (m.suitable === suitable || m.suitable === "any") &&
      isMealAllergenFree(m, allergies) &&
      !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
      !usedMealIds.has(m.id)
  );

  if (idealMeals.length > 0) {
    const selectedMeal = selectMealWithCombinedScore(idealMeals, targetCalories, `${mealType} selection`);
    if (selectedMeal) {
      console.log(`Selected ${mealType}: ${selectedMeal.name}`);
      return selectedMeal;
    }
  }

  // Fallback: allergy-aware
  console.warn(`No ideal meal found for ${mealType}. Activating allergy-aware fallback.`);
  const allergyFreeMeals = mealsWithScore.filter((m) => isMealAllergenFree(m, allergies));
  if (allergyFreeMeals.length > 0) {
    const selectedMeal = selectMealWithCombinedScore(allergyFreeMeals, targetCalories, `${mealType} allergy-free fallback`);
    if (selectedMeal) {
      console.log(`FALLBACK: Selected allergy-free ${mealType}: ${selectedMeal.name}`);
      return selectedMeal;
    }
  }

  console.error(`CRITICAL: No meals of type '${mealType}' found in the database.`);
  return null;
};

// Helper function to select a meal from a specific type using combined score
const selectMealFromType = async (
  userId: string,
  mealType: string,
  allergies: string[],
  targetCalories: number,
  usedMealIds: Set<string>,
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  suitable: string,
  mealRepo: any
): Promise<Meals | null> => {
  const mealsWithScore = await getMealsWithPreference(userId, [mealType], mealRepo);
  const filteredMeals = mealsWithScore.filter(
    m =>
      (m.suitable === suitable || m.suitable === "any") &&
      isMealAllergenFree(m, allergies) &&
      !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, 1) &&
      !usedMealIds.has(m.id)
  );
  if (filteredMeals.length === 0) return null;
  return selectMealWithCombinedScore(filteredMeals, targetCalories, `${mealType} selection`);
};

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
    // Chỉ bữa trưa có cơm, sáng và tối luôn không có cơm
    if (time === "lunch") return "COMPOSED_WITH_CARB";
    return "COMPOSED_NO_CARB";
  }

  if (goal === "gain") {
    // Xen kẽ đa dạng, mỗi ngày tối đa 2 bữa có cơm (ưu tiên sáng và trưa, nếu không thì trưa và tối)
    if (cycle % 3 === 0) {
      // Ngày này: sáng và trưa có cơm
      if (time === "breakfast" || time === "lunch") return "COMPOSED_WITH_CARB";
      return "SINGLE_DISH";
    } else if (cycle % 3 === 1) {
      // Ngày này: trưa và tối có cơm
      if (time === "lunch" || time === "dinner") return "COMPOSED_WITH_CARB";
      return "SINGLE_DISH";
    } else {
      // Ngày này: chỉ trưa có cơm
      if (time === "lunch") return "COMPOSED_WITH_CARB";
      return "SINGLE_DISH";
    }
  }

  if (goal === "maintenance") {
    // Xen kẽ, mỗi ngày tối đa 1–2 bữa có cơm, ưu tiên trưa, sau đó sáng hoặc tối
    if (cycle % 2 === 0) {
      // Ngày chẵn: trưa có cơm, sáng và tối là single
      if (time === "lunch") return "COMPOSED_WITH_CARB";
      return "SINGLE_DISH";
    } else {
      // Ngày lẻ: tối có cơm, sáng và trưa là single
      if (time === "dinner") return "COMPOSED_WITH_CARB";
      return "SINGLE_DISH";
    }
  }

  return "SINGLE_DISH";
};




const isDoubleCarbDay = (goal: string, currentDay: number): boolean => {
  const allowedGoals = ["gain", "loss", "maintenance"] as const;
  const safeGoal = allowedGoals.includes(goal as any) ? (goal as "gain" | "loss" | "maintenance") : "maintenance";
  const breakfastStrategy = determineMealStrategy(safeGoal, "breakfast", currentDay);
  const lunchStrategy = determineMealStrategy(safeGoal, "lunch", currentDay);
  const dinnerStrategy = determineMealStrategy(safeGoal, "dinner", currentDay);
  return breakfastStrategy === "COMPOSED_WITH_CARB" && lunchStrategy === "COMPOSED_WITH_CARB" && dinnerStrategy === "COMPOSED_WITH_CARB";
};

// Updated selectMainMeals using combined score
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
  const strategy = determineMealStrategy(goal, time as "lunch" | "dinner" | "breakfast", currentDay);
  console.log(`Day ${currentDay}, ${time}: Strategy is '${strategy}'`);

  if (strategy === "SINGLE_DISH") {
    const mainMeal = await selectMealFromType(
      userId,
      "main",
      allergies,
      targetCalories * 0.8,
      usedMealIds,
      mealPlan,
      time,
      currentDay,
      suitable,
      mealRepo
    );
    if (mainMeal) {
      selectedMeals.push(mainMeal);
      usedMealIds.add(mainMeal.id);
      const dessert = await selectSnackOrDessert(
        userId,
        "dessert",
        mealPlan,
        time,
        currentDay,
        targetCalories * 0.2,
        allergies,
        usedMealIds,
        suitable,
        mealRepo
      );
      if (dessert) {
        selectedMeals.push(dessert);
        usedMealIds.add(dessert.id);
      }
    } else {
      console.error(`CRITICAL: No 'main' dish found for SINGLE_DISH strategy on day ${currentDay}, ${time}.`);
    }
    return selectedMeals;
  }

  let remainingCalories = targetCalories;
  const doubleCarb = isDoubleCarbDay(goal, currentDay);
  const sideDishTypes = doubleCarb ? ["salty", "soup"] : ["salty", "soup", "xvegetable", "lvegetable", "boil"];  
  let numberOfSideDishes = 3;

  if (strategy === "COMPOSED_WITH_CARB") {
    const carb = selectCarbByGoal(meals, goal, allergies);
    if (carb) {
      selectedMeals.push(carb);
      usedMealIds.add(carb.id);
      remainingCalories -= carb.calories;
    } else {
      console.warn(`No suitable carb found for ${time} on day ${currentDay}`);
    }
  } else {
    numberOfSideDishes = 4;
  }

  const shuffledSideTypes = sideDishTypes.sort(() => 0.5 - Math.random());
  let sidesSelectedCount = 0;

  for (const sideType of shuffledSideTypes) {
    if (sidesSelectedCount >= numberOfSideDishes) break;
    const sideTargetCalories = remainingCalories / (numberOfSideDishes - sidesSelectedCount);
    const sideMeal = await selectMealFromType(
      userId,
      sideType,
      allergies,
      sideTargetCalories,
      usedMealIds,
      mealPlan,
      time,
      currentDay,
      suitable,
      mealRepo
    );
    if (sideMeal) {
      selectedMeals.push(sideMeal);
      usedMealIds.add(sideMeal.id);
      remainingCalories -= sideMeal.calories;
      sidesSelectedCount++;
    }
  }

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

  originalMealPreference.score -= 5; 
  suggestedMealPreference.score += 5; 

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

export const summarizeMealPlanCaloriesToday = async (
  userId: string,
): Promise<{
  todaySummary: MealPlanCalorieSummary,
  aiAssessment?: string,
}> => {
  const mealPlanRepo = mealRepository.manager.getRepository(MealPlan);
  const summaryRepo = mealRepository.manager.getRepository(MealPlanCalorieSummary);

 const mealPlans = await mealPlanRepo.find({
  where: { user: { id: userId } },
  relations: ['user'],
});

  const mealPlan = mealPlans[0]; 

  if (!mealPlan) throw new Error('Không tìm thấy kế hoạch bữa ăn đang hoạt động cho người dùng');

  const mealPlanDetails = await getMealPlanDetails(mealPlan.id);
  const goal = mealPlan.goal || 'maintenance';

  const today = new Date();
  const startDate = new Date(mealPlan.start_date);
  const diffInMs = today.getTime() - startDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const todayDayNumber = diffInDays + 2;

  if (todayDayNumber < 1 || todayDayNumber > mealPlanDetails.length) {
    throw new Error(`Hôm nay không nằm trong phạm vi của kế hoạch bữa ăn`);
  }

  const todayData = mealPlanDetails.find((day) => day.day_number === todayDayNumber);
  console.log(mealPlanDetails);
  if (!todayData) {
    throw new Error(`Không có dữ liệu cho ngày ${todayDayNumber}`);
  }

  const summary = new MealPlanCalorieSummary();
  summary.meal_plan = mealPlan;
  summary.user = mealPlan.user;
  summary.day_number = todayDayNumber;
  summary.goal = goal;

  summary.breakfast_calories = 0;
  summary.lunch_calories = 0;
  summary.dinner_calories = 0;
  summary.snack1_calories = 0;
  summary.snack2_calories = 0;
  summary.snack3_calories = 0;

  for (const meal of todayData.meals) {
    const calories = meal.meal.calories;
    const mealTime = meal.meal_time;

    switch (mealTime) {
      case 'breakfast':
        summary.breakfast_calories += calories;
        break;
      case 'lunch':
        summary.lunch_calories += calories;
        break;
      case 'dinner':
        summary.dinner_calories += calories;
        break;
      case 'snack1':
        if (goal === 'gain') summary.snack1_calories += calories;
        break;
      case 'snack2':
        summary.snack2_calories += calories;
        break;
      case 'snack3':
        if (goal === 'gain') summary.snack3_calories += calories;
        break;
    }
  }

  summary.total_daily_calories =
    summary.breakfast_calories +
    summary.lunch_calories +
    summary.dinner_calories +
    summary.snack2_calories;

  if (goal === 'gain') {
    summary.total_daily_calories += summary.snack1_calories + summary.snack3_calories;
  }

  await summaryRepo.save(summary);

  // if (withAI) {
  //   const message = calorieSummaryMessage(
  //     goal === 'gain' ? 'Tăng cân' : goal === 'loss' ? 'Giảm cân' : 'Duy trì cân nặng',
  //     mealPlan.targetCalories,
  //     summary.total_daily_calories,
  //     [`Ngày hôm nay (day ${todayDayNumber}): ${summary.total_daily_calories.toFixed(0)} kcal`]
  //   );

  //   const aiAssessment = await generateAIResponse(message, caloriesSummaryPrompt);
  // }

  return {
    todaySummary: summary,
  };
};


// Interface for recording progress

/**
 * Records a new weight and calorie consumption entry for a user.
 * @param params - The parameters for recording progress.
 * @returns The newly created UserProgress entry.
 */

export const recordUserProgress = async (params: RecordProgressParams): Promise<UserProgress> => {
  const {
    userId,
    weight,
    meals,
    sick,
    sleep,
    hunger,
    caloBreakfast = 0,
    caloLunch = 0,
    caloDinner = 0,
    caloSnack = 0,
  } = params;

  const user = await userRepository.findByIdAsync(userId);
  if (!user) throw new Error('User not found');

  let finalBreakfast = 0, finalLunch = 0, finalDinner = 0, finalSnack = 0;

  if (meals === true) {
    const { todaySummary } = await summarizeMealPlanCaloriesToday(userId);

    if (!todaySummary) throw new Error(`No meal plan summary for today`);

    finalBreakfast = todaySummary.breakfast_calories;
    finalLunch = todaySummary.lunch_calories;
    finalDinner = todaySummary.dinner_calories;

    finalSnack = (todaySummary.snack1_calories || 0) + (todaySummary.snack2_calories || 0) + (todaySummary.snack3_calories || 0);
  } else {
    finalBreakfast = caloBreakfast || 0;
    finalLunch = caloLunch || 0;
    finalDinner = caloDinner || 0;
    finalSnack = caloSnack || 0;
  }
 
  const newProgress = progressRepository.create({
    user,
    weight,
    meals,
    sick,
    sleep,
    hunger,
    caloBreakfast: finalBreakfast,
    caloLunch: finalLunch,
    caloDinner: finalDinner,
    caloSnack: finalSnack,

  });

  return progressRepository.save(newProgress);
};


/**
 * Retrieves the weight progress for a user, along with their weight target.
 * @param userId - The ID of the user.
 * @returns An object containing the user's progress entries and their weight target.
 */
export const getUserProgress = async (userId: string): Promise<{ 
  progress: UserProgress[], 
  weightTarget: number,
  targetCalories: number,
  goal: string,
  gender: string,
  age: number,
  height: number,
  activityLevel: string,
  bmr: number
}> => {
  const user = await userRepository.findByIdAsync(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const progressRepository = mealRepository.manager.getRepository(UserProgress);

  const progress = await progressRepository.find({
    where: { user: { id: userId } },
    order: { recordedAt: 'ASC' },
  });

   const caculationResult = await CalculateRepository.findOne({
    where: {
    user: { id: userId },
    is_active: true
  },
  });
  if (!caculationResult) {
    throw new Error('No active calculation result found for user');
  }
    
  return {
    progress,
    weightTarget: user.weightTarget,
    targetCalories: caculationResult.targetCalories,
    goal: caculationResult.goal,
    gender: caculationResult.gender,
    age: caculationResult.age,
    height: caculationResult.height,
    activityLevel: caculationResult.activityLevel,
    bmr: caculationResult.bmr ?? 0,
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

const setFavoriteMeal = async (
  userId: string,
  mealId: string,
  isFavorite: boolean
): Promise<void> => {
  const user = await userRepository.findByIdAsync(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const meal = await mealRepository.findByIdAsync(mealId);
  if (!meal) {
    throw new Error("Meal not found");
  }

  // Thay thế đoạn query trực tiếp bằng hàm getOrCreatePreference
  const userMealPreference = await getOrCreatePreference(userId, mealId);

  // Cập nhật trạng thái yêu thích
  meal.is_favourite = isFavorite;

  // Tính điểm yêu thích
  const previousScore = userMealPreference.score;
  userMealPreference.score = isFavorite ? previousScore + 20 : previousScore - 20;

  // Lưu thay đổi
  await mealRepository.save(meal);
  await userMealPreferenceRepository.save(userMealPreference);

  console.log(`Meal ${mealId} favorite status updated to ${isFavorite} for user ${userId}`);
}

export const addnewMealandPlusScore = async (userId: string, mealData: Partial<Meals>): Promise<Meals> => {
  const mealRepo = mealRepository.manager.getRepository(Meal);
  
  // Create a new meal entity. The ID will be auto-generated by the database, so we don't pass it.
  const newMeal = mealRepo.create({
    name: mealData.name,
    calories: mealData.calories,
    protein: mealData.protein,
    fat: mealData.fat,
    carbs: mealData.carbs,
    ingredients: mealData.ingredients,
    meal_type: mealData.meal_type || 'main', // Default to 'main' if not provided by AI
    suitable: mealData.suitable || "any",
    is_favourite: mealData.is_favourite || false,
  });

  const savedMeal = await mealRepo.save(newMeal);

  // Get or create the preference entry and add score
  const userMealPreference = await getOrCreatePreference(userId, savedMeal.id);
  userMealPreference.score += 30; 
  await userMealPreferenceRepository.save(userMealPreference);

  // Return the full meal data, including the new ID
  return {
    id: savedMeal.id,
    name: savedMeal.name,
    calories: savedMeal.calories,
    protein: savedMeal.protein,
    fat: savedMeal.fat,
    carbs: savedMeal.carbs,
    ingredients: savedMeal.ingredients,
    meal_type: savedMeal.meal_type,
    suitable: savedMeal.suitable,
    is_favourite: savedMeal.is_favourite,
  };
}

export {
  ExtendedCalculateCaloriesParams,
  getUserMealPlans,
  getMealPlanDetails,
  getCalculationResult,
  getSuggestedMeals,
  setFavoriteMeal
};