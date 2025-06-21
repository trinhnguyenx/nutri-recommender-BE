import { generateAIResponse } from "../../utils/gemini.utils";
import { mealRepository } from "../../repository/meal.Repository";
import { Meal } from "../../model/meal.entity";
import { MealPlan } from "../../model/mealplan.entity";
import { MealPlanDay } from "../../model/mealplanday.entity";
import { MealPlanMeal } from "../../model/mealplanmeals.entity";
import { CalculationResult } from "../../model/caculation.result";
import { userRepository } from "../../repository/userRepository";
import {MealPlanSummary, GetSuggestedMealsParams } from "./calories.interface";
import { CalorieResult,ExtendedCalculateCaloriesParams, MealPlanResponse, MealPlanEntry, NutritionSummary, UpdateMealPlanNameParams, CalorieSummaryByDay} from "./calories.interface";
import { MealPlanCalorieSummary } from "@/model/mealplan.calories.summary";
import { UserProgress } from "@/model/user.progress.entity";
import { AIResponse } from "../chatbot/chatbot.interface";

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
    result.lunch += adjust; // Adjust lunch to match target
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

// Select dessert meal
const selectDessertMeal = (
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  goal: "gain" | "loss" | "maintenance",
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string
): Meals | null => {
  const repeatDays = 2;
  const dessertMeals = meals
    .filter(
      (m) =>
        m.meal_type === "dessert" &&
        (m.suitable === suitable || m.suitable === "any") &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id) &&
        m.calories <= targetCalories * 1.2 // Allow slight flexibility
    )
    .sort((a, b) => Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories));

  if (dessertMeals.length > 0) {
    const dessert = dessertMeals[0];
    console.log(`Selected dessert for ${time} on day ${currentDay}: ${dessert.name} (${dessert.calories} kcal)`);
    return dessert;
  }

  console.warn(`No dessert available for ${time} on day ${currentDay}`);
  return null;
};

// Select random snack or dessert
const selectRandomMeal = (
  meals: Meals[],
  mealType: string,
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string
): Meals | null => {
  const repeatDays = 2;
  const filteredMeals = meals
    .filter(
      (m) =>
        m.meal_type === mealType &&
        (m.suitable === suitable || m.suitable === "any") &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    );

  if (filteredMeals.length > 0) {
    const meal = filteredMeals[Math.floor(Math.random() * filteredMeals.length)];
    console.log(`Selected ${mealType} for ${time} on day ${currentDay}: ${meal.name} (${meal.calories} kcal)`);
    return meal;
  }

  console.warn(`No ${mealType} available for ${time} on day ${currentDay}`);
  return null;
};

// Select random snack for gain
const selectRandomSnackForGain = (
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  allergies: string[],
  usedMealIds: Set<string>
): Meals | null => {
  return selectRandomMeal(meals, "snack", mealPlan, time, currentDay, allergies, usedMealIds, "gain");
};

// Select random dessert for snack
const selectRandomDessertForSnack = (
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  allergies: string[],
  usedMealIds: Set<string>
): Meals | null => {
  return selectRandomMeal(meals, "dessert", mealPlan, time, currentDay, allergies, usedMealIds, "loss");
};

// Select meals for main meal slots
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
  suitable: string,
  isMainUsed: boolean
): Meals[] => {
  const selectedMeals: Meals[] = [];
  const repeatDays = 2;

  if (time === "dinner" && goal === "gain" && isMainUsed) {
    let carb = meals.filter(
      (m) =>
        m.meal_type === "carb" &&
        m.name.toLowerCase() === "cơm trắng" &&
        m.suitable === "any" &&
        m.calories >= 200 &&
        m.calories <= 300 &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    );
    console.log(`Available Cơm trắng 220g for ${time} on day ${currentDay}: ${carb.map((m) => m.calories)}`);

    if (carb.length > 0) {
      selectedMeals.push(carb[0]);
      usedMealIds.add(carb[0].id);
      console.log(`Selected Cơm trắng for ${time} on day ${currentDay}: ${carb[0].name} (${carb[0].calories} kcal)`);
    } else {
      console.warn(`No Cơm trắng 220g available for ${time} on day ${currentDay}, trying alternative carb`);
      const fallbackCarb = meals
        .filter(
          (m) =>
            m.meal_type === "carb" &&
            mealTimeFilter(m, time) &&
            (m.suitable === "any") &&
            isMealAllergenFree(m, allergies) &&
            !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
            !usedMealIds.has(m.id)
        )
        .sort((a, b) => Math.abs(a.calories - targetCalories * 0.25) - Math.abs(b.calories - targetCalories * 0.25));

      if (fallbackCarb.length > 0) {
        selectedMeals.push(fallbackCarb[0]);
        usedMealIds.add(fallbackCarb[0].id);
        console.log(`Selected fallback carb for ${time} on day ${currentDay}: ${fallbackCarb[0].name} (${fallbackCarb[0].calories} kcal)`);
      } else {
        console.warn(`No carb available for ${time} on day ${currentDay}`);
      }
    }

    const sideTypes = ["salty", "soup", "xvegetable", "lvegetable", "boil"];
    const selectedSideTypes = sideTypes.sort(() => Math.random() - 0.5).slice(0, 3);
    let remainingCalories = targetCalories * 0.65;
    if (selectedMeals.length > 0) {
      remainingCalories -= selectedMeals[0].calories;
    }

    for (const type of selectedSideTypes) {
      const sideMeals = meals
        .filter(
          (m) =>
            m.meal_type === type &&
            mealTimeFilter(m, time) &&
            (m.suitable === suitable || m.suitable === "any") &&
            isMealAllergenFree(m, allergies) &&
            !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
            !usedMealIds.has(m.id)
        )
        .sort((a, b) => Math.abs(a.calories - remainingCalories / (3 - selectedMeals.length + 1)) - Math.abs(b.calories - remainingCalories / (3 - selectedMeals.length + 1)));

      if (sideMeals.length > 0) {
        const side = sideMeals[0];
        selectedMeals.push(side);
        usedMealIds.add(side.id);
        remainingCalories -= side.calories;
        console.log(`Selected ${side.meal_type} for ${time} on day ${currentDay}: ${side.name} (${side.calories} kcal)`);
      } else {
        console.warn(`No ${type} available for ${time} on day ${currentDay}`);
        const fallbackSides = meals.filter(
          (m) =>
            sideTypes.includes(m.meal_type) &&
            isMealAllergenFree(m, allergies) &&
            !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
            !usedMealIds.has(m.id)
        );
        if (fallbackSides.length > 0) {
          const side = fallbackSides[0];
          selectedMeals.push(side);
          usedMealIds.add(side.id);
          remainingCalories -= side.calories;
          console.log(`Fallback ${side.meal_type} for ${time} on day ${currentDay}: ${side.name} (${side.calories} kcal)`);
        } else {
          console.warn(`No fallback side available for ${time} on day ${currentDay}`);
        }
      }
    }

    const dessert = selectDessertMeal(meals, mealPlan, time, currentDay, targetCalories * 0.1, goal, allergies, usedMealIds, suitable);
    if (dessert) {
      selectedMeals.push(dessert);
      usedMealIds.add(dessert.id);
    }

    return selectedMeals;
  }

  const mainMeals = meals
    .filter(
      (m) =>
        m.meal_type === "main" &&
        mealTimeFilter(m, time) &&
        (m.suitable === suitable || m.suitable === "any") &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    )
    .sort((a, b) => Math.abs(a.calories - targetCalories * 0.8) - Math.abs(b.calories - targetCalories * 0.8));

  if (mainMeals.length > 0) {
    const mainMeal = mainMeals[0];
    selectedMeals.push(mainMeal);
    usedMealIds.add(mainMeal.id);
    console.log(`Selected main for ${time} on day ${currentDay}: ${mainMeal.name} (${mainMeal.calories} kcal)`);

    const dessert = selectDessertMeal(meals, mealPlan, time, currentDay, targetCalories * 0.1, goal, allergies, usedMealIds, suitable);
    if (dessert) {
      selectedMeals.push(dessert);
      usedMealIds.add(dessert.id);
    }
    return selectedMeals;
  }

  let carb = null;
  if (goal === "gain" || goal === "maintenance") {
    const whiteRice220g = meals.filter(
      (m) =>
        m.meal_type === "carb" &&
        m.name.toLowerCase() === "cơm trắng" &&
        m.suitable === "any" &&
        m.calories >= 200 &&
        m.calories <= 300 &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    );
    console.log(`Available Cơm trắng 220g for ${time} on day ${currentDay}: ${whiteRice220g.map((m) => m.calories)}`);
    if (whiteRice220g.length > 0) {
      carb = whiteRice220g[0];
    }
  } else if (goal === "loss") {
    const whiteRice120g = meals.filter(
      (m) =>
        m.meal_type === "carb" &&
        m.name.toLowerCase() === "cơm trắng" &&
        m.suitable === "loss" &&
        m.calories >= 100 &&
        m.calories <= 150 &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    );
    console.log(`Available Cơm trắng 120g for ${time} on day ${currentDay}: ${whiteRice120g.map((m) => m.calories)}`);
    if (whiteRice120g.length > 0) {
      carb = whiteRice120g[0];
    }
  }

  if (!carb) {
    const carbMeals = meals
      .filter(
        (m) =>
          m.meal_type === "carb" &&
          mealTimeFilter(m, time) &&
          (m.suitable === (goal === "gain" ? "any" : "loss") || m.suitable === "any") &&
          isMealAllergenFree(m, allergies) &&
          !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
          !usedMealIds.has(m.id)
      )
      .sort((a, b) => Math.abs(a.calories - targetCalories * 0.25) - Math.abs(b.calories - targetCalories * 0.25));

    if (carbMeals.length > 0) {
      carb = carbMeals[0];
    }
  }

  if (carb) {
    selectedMeals.push(carb);
    usedMealIds.add(carb.id);
    console.log(`Selected carb for ${time} on day ${currentDay}: ${carb.name} (${carb.calories} kcal)`);
  } else {
    console.warn(`No carb available for ${time} on day ${currentDay}, skipping carb`);
  }

  const sideTypes = ["salty", "soup", "xvegetable", "lvegetable", "boil"];
  let sidesSelected = 0;
  let remainingCalories = targetCalories * 0.65;
  const usedSideTypes: string[] = [];

  if (selectedMeals.length > 0) {
    remainingCalories -= selectedMeals[0].calories;
  }

  while (sidesSelected < 3 && sideTypes.length > 0) {
    const availableSideTypes = sideTypes.filter((t) => !usedSideTypes.includes(t));
    if (availableSideTypes.length === 0) {
      break;
    }

    const sideMeals = meals
      .filter(
        (m) =>
          availableSideTypes.includes(m.meal_type) &&
          mealTimeFilter(m, time) &&
          (m.suitable === suitable || m.suitable === "any") &&
          isMealAllergenFree(m, allergies) &&
          !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
          !usedMealIds.has(m.id)
      )
      .sort((a, b) => Math.abs(a.calories - remainingCalories / (3 - sidesSelected)) - Math.abs(b.calories - remainingCalories / (3 - sidesSelected)));

    if (sideMeals.length > 0) {
      const side = sideMeals[0];
      selectedMeals.push(side);
      usedMealIds.add(side.id);
      usedSideTypes.push(side.meal_type);
      console.log(`Selected ${side.meal_type} for ${time} on day ${currentDay}: ${side.name} (${side.calories} kcal)`);
      sidesSelected++;
      remainingCalories -= side.calories;
    } else {
      const fallbackSides = meals.filter(
        (m) =>
          availableSideTypes.includes(m.meal_type) &&
          isMealAllergenFree(m, allergies) &&
          !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
          !usedMealIds.has(m.id)
      );
      if (fallbackSides.length > 0) {
        const side = fallbackSides[Math.floor(Math.random() * fallbackSides.length)];
        selectedMeals.push(side);
        usedMealIds.add(side.id);
        usedSideTypes.push(side.meal_type);
        console.log(`Selected ${side.meal_type} for ${time} on day ${currentDay}: ${side.name} (${side.calories} kcal)`);
        sidesSelected++;
        remainingCalories -= side.calories;
      } else {
        console.warn(`No ${availableSideTypes.join(", ")} available for ${time} on day ${currentDay}`);
        sideTypes.splice(sideTypes.indexOf(availableSideTypes[0]), 1);
      }
    }
  }

  const dessert = selectDessertMeal(meals, mealPlan, time, currentDay, targetCalories * 0.1, goal, allergies, usedMealIds, suitable);
  if (dessert) {
    selectedMeals.push(dessert);
    usedMealIds.add(dessert.id);
  }

  return selectedMeals;
};

// Select snack meal
const selectSnackMeal = (
  meals: Meals[],
  mealPlan: { [day: number]: MealPlanResponse },
  time: keyof MealPlanResponse,
  currentDay: number,
  targetCalories: number,
  goal: "gain" | "loss" | "maintenance",
  allergies: string[],
  usedMealIds: Set<string>,
  suitable: string
): Meals | null => {
  const repeatDays = 2;
  const snackMeals = meals
    .filter(
      (m) =>
        m.meal_type === "snack" &&
        (m.suitable === suitable || m.suitable === "any") &&
        isMealAllergenFree(m, allergies) &&
        !isMealUsedInLastNDays(m.id, m.meal_type, mealPlan, time, currentDay, repeatDays) &&
        !usedMealIds.has(m.id)
    )
    .sort((a, b) => Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories));

  if (snackMeals.length > 0) {
    const snack = snackMeals[0];
    console.log(`Selected snack for ${time} on day ${currentDay}: ${snack.name} (${snack.calories} kcal)`);
    return snack;
  }

  if (goal === "gain") {
    const snack = selectRandomSnackForGain(meals, mealPlan, time, currentDay, allergies, usedMealIds);
    if (snack) {
      console.log(`Selected snack for ${time} on day ${currentDay}: ${snack.name} (${snack.calories} kcal)`);
      return snack;
    }
  } else {
    const dessert = selectRandomDessertForSnack(meals, mealPlan, time, currentDay, allergies, usedMealIds);
    if (dessert) {
      console.log(`Selected dessert for ${time} on day ${currentDay}: ${dessert.name} (${dessert.calories} kcal)`);
      return dessert;
    }
  }

  console.warn(`No snack or dessert available for ${time} on day ${currentDay}`);
  return null;
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
    let isMainMealUsed = false;

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
          suitable,
          time === "dinner" ? isMainMealUsed : false
        );

        if (time === "lunch" && selectedMeals.some((m) => m.meal_type === "main")) {
          isMainMealUsed = true;
          console.log(`Main meal used in lunch on day ${day}`);
        }
      } else {
        const snack = selectSnackMeal(
          meals,
          mealPlan,
          time,
          day,
          calorieTargets[time] ?? 0,
          goal,
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

      console.log(`Day[${day}][${time}]: ${mealCalories} kcal`);
    }

    weeklyTotalCalories += totalCalories[day];
    console.log(`Day[${day}]: Total calories: ${totalCalories[day]} kcal, Nutrition: Protein=${totalNutrition[day].protein}g, Fat=${totalNutrition[day].fat}g, Carbs=${totalNutrition[day].carbs}g`);
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
// update swap meal
export const swapMealInPlan = async (
  mealPlanMealId: string,
  newMealId: string
): Promise<void> => {
  const mealPlanMealRepo = mealRepository.manager.getRepository(MealPlanMeal);

  const mealPlanMeal = await mealPlanMealRepo.findOne({
    where: { id: mealPlanMealId },
    relations: ["meal"],
  });

  if (!mealPlanMeal) {
    throw new Error("Không tìm thấy bản ghi món ăn trong kế hoạch");
  }

  mealPlanMeal.meal = { id: newMealId } as Meal; // chỉ gán id mới

  await mealPlanMealRepo.save(mealPlanMeal);
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