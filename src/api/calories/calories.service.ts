import { mealRepository } from "../../repository/meal.Repository";
import { Between, Not } from "typeorm";
import { Meal } from "../../model/meal.entity";
import { MealPlan } from "../../model/mealplan.entity";
import { MealPlanDay } from "../../model/mealplanday.entity";
import { MealPlanMeal } from "../../model/mealplanmeals.entity";
import { CalculationResult } from "../../model/caculation.result";
import { userRepository } from "../../repository/userRepository";
import {MealPlanSummary, GetSuggestedMealsParams } from "./calories.interface";

interface ExtendedCalculateCaloriesParams {
  height: number;
  weight: number;
  age: number;
  gender: string;
  weightTarget: number;
  activityLevel?: string;
  userId: string;
  weeklyGainRate: number;
  allergies: string[];
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

interface NutritionSummary {
  protein: number;
  fat: number;
  carbs: number;
}

interface ExtendedCalorieResult extends CalorieResult {
  mealPlan: { [day: number]: MealPlanResponse };
  totalCalories: { [day: number]: number };
  totalNutrition: { [day: number]: NutritionSummary };
  weeklyTotalCalories: number;
  mealPlanId: string;
}

interface CalorieResult {
  maintenanceCalories: number;
  targetCalories: number;
  goal: "gain" | "loss" | "maintenance";
  estimatedWeeklyChange: number;
  estimatedDaysToGoal: number;
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
  const { height, weight, age, gender, weightTarget, userId, allergies, weeklyGainRate } = params;
  if (!height || !weight || !age || !gender || !weightTarget || !userId || !allergies || !weeklyGainRate) {
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
  return tdee; // Maintenance
};

// Define meal slots based on goal
const getMealSlots = (goal: "gain" | "loss" | "maintenance"): (keyof MealPlanResponse)[] => {
  return goal === "gain"
    ? ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"]
    : ["breakfast", "lunch", "snack2", "dinner"];
};

// Distribute calories across meals
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
    result.breakfast = Math.round(targetCalories * (Math.random() * 0.05 + 0.2)); // 20-25%
    result.lunch = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); // 25-30%
    result.dinner = Math.round(targetCalories * (Math.random() * 0.05 + 0.2)); // 20-25%
    result.snack1 = Math.round(targetCalories * 0.1); // 10%
    result.snack2 = Math.round(targetCalories * 0.1); // 10%
    result.snack3 = Math.round(targetCalories * 0.1); // 10%
    const total = Object.values(result).reduce((sum, val) => sum + val, 0);
    const adjust = targetCalories - total;
    result.lunch += adjust; // Adjust lunch to match target
  } else {
    result.breakfast = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); // 25-30%
    result.lunch = Math.round(targetCalories * (Math.random() * 0.05 + 0.3)); // 30-35%
    result.dinner = Math.round(targetCalories * (Math.random() * 0.05 + 0.25)); // 25-30%
    result.snack2 = Math.round(targetCalories * 0.1); // 10%
    const total = Object.values(result).reduce((sum, val) => sum + val, 0);
    const adjust = targetCalories - total;
    result.lunch += adjust; // Adjust lunch to match target
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
  goal: "gain" | "loss" | "maintenance"
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

  for (let day = 1; day <= 7; day++) {
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

// Update user profile in database
const updateUserProfile = async (params: ExtendedCalculateCaloriesParams) => {
  const user = await userRepository.findByIdAsync(params.userId);
  if (!user) {
    throw new Error("User not found");
  }

  Object.assign(user, {
    height: params.height,
    weight: params.weight,
    age: params.age,
    gender: params.gender,
    weightTarget: params.weightTarget,
    activityLevel: params.activityLevel ?? "moderate",
    allergies: params.allergies,
  });

  return userRepository.save(user);
};

// Create meal plan entity
const createMealPlan = async (user: any): Promise<MealPlan> => {
  const mealPlan = new MealPlan();
  mealPlan.user = user;
  mealPlan.name = `7-day[${new Date().toISOString().split("T")[0]}[${new Date().getTime()}]]`;
  mealPlan.start_date = new Date();
  mealPlan.is_active = true;
  mealPlan.maintenanceCalories = 0; // Will be updated later
  mealPlan.targetCalories = 0; // Will be updated later
  mealPlan.goal = "maintenance"; // Will be updated later
  return mealRepository.createMealPlanAsync(mealPlan);
};

// Create meal plan days
const createMealPlanDays = async (plan: MealPlan): Promise<MealPlanDay[]> => {
  const days: MealPlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const mealPlanDay = new MealPlanDay();
    mealPlanDay.meal_plan = plan;
    mealPlanDay.day_number = i + 1;
    days.push(await mealRepository.createMealPlanDayAsync(mealPlanDay));
  }
  return days;
};

// Link meals to plan days
const linkMealsToPlanDays = async (
  mealPlan: { [day: number]: MealPlanResponse },
  mealPlanDays: MealPlanDay[]
) => {
  for (let day = 1; day <= 7; day++) {
    const planDay = mealPlanDays[day - 1];
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
}: ExtendedCalculateCaloriesParams): Promise<ExtendedCalorieResult> => {
  validateInputs({ height, weight, age, gender, weightTarget, userId, allergies, weeklyGainRate });

  const bmr = calculateBMR({ height, weight, age, gender });
  const activityMultiplier = getActivityMultiplier(activityLevel);
  const tdee = bmr * activityMultiplier;

  const weightDifference = weightTarget - weight;
  const calories = adjustCaloriesForGoal(tdee, weightDifference, weeklyGainRate);

  const estimatedDaysToGoal =
    weightDifference !== 0 && weeklyGainRate > 0
      ? Math.ceil((Math.abs(weightDifference) / weeklyGainRate) * 7)
      : 0;

  const calorieResult: CalorieResult = {
    maintenanceCalories: Math.round(tdee),
    targetCalories: Math.round(calories),
    goal: weightDifference > 0 ? "gain" : weightDifference < 0 ? "loss" : "maintenance",
    estimatedWeeklyChange: weightDifference !== 0 ? weeklyGainRate : 0,
    estimatedDaysToGoal,
  };

  const currentUser = await updateUserProfile({
    userId,
    height,
    weight,
    age,
    gender,
    weightTarget,
    activityLevel,
    allergies,
    weeklyGainRate,
  });

  await mealRepository.createOrUpdateCalculationResultAsync(currentUser, calorieResult);

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
    calorieResult.goal
  );

  const mealPlanEntity = await createMealPlan(currentUser);
  mealPlanEntity.maintenanceCalories = calorieResult.maintenanceCalories;
  mealPlanEntity.targetCalories = calorieResult.targetCalories;
  mealPlanEntity.goal = calorieResult.goal;
  mealPlanEntity.estimatedWeeklyChange = calorieResult.estimatedWeeklyChange;
  mealPlanEntity.estimatedDaysToGoal = calorieResult.estimatedDaysToGoal;
  await mealRepository.createMealPlanAsync(mealPlanEntity);

  const mealPlanDays = await createMealPlanDays(mealPlanEntity);
  await linkMealsToPlanDays(mealPlan, mealPlanDays);

  return {
    ...calorieResult,
    mealPlan,
    totalCalories,
    totalNutrition,
    weeklyTotalCalories,
    mealPlanId: mealPlanEntity.id,
  };
};

// Fetch user meal plans
const getUserMealPlans = async (userId: string): Promise<MealPlanSummary[]> => {
  const mealPlanRepository = mealRepository.manager.getRepository(MealPlan);
  const mealPlans = await mealPlanRepository.find({
    where: { user: { id: userId } },
    select: ["id", "name", "start_date", "is_active"],
  });

  return mealPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    start_date: plan.start_date,
    is_active: plan.is_active,
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
  userId: string
): Promise<CalorieResult | null> => {
  const calculationResultRepository = mealRepository.manager.getRepository(CalculationResult);
  const calculationResult = await calculationResultRepository.findOne({
    where: { user: { id: userId } },
    relations: ["user"],
  });

  if (!calculationResult) return null;

  const allowedGoals = ["gain", "loss", "maintenance"] as const;
  const goal = allowedGoals.includes(calculationResult.goal as any)
    ? calculationResult.goal as "gain" | "loss" | "maintenance"
    : "maintenance";

  return {
    maintenanceCalories: calculationResult.maintenanceCalories,
    targetCalories: calculationResult.targetCalories,
    goal,
    estimatedWeeklyChange: calculationResult.estimatedWeeklyChange,
    estimatedDaysToGoal: calculationResult.estimatedDaysToGoal,
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

  const query = mealRepo
    .createQueryBuilder("meal")
    .where("meal.id != :mealId", { mealId })
    .andWhere("meal.meal_type = :mealType", { mealType })
    .andWhere("meal.calories BETWEEN :lowerCal AND :upperCal", { lowerCal, upperCal });

  allergies.forEach((allergen, index) => {
    query.andWhere(`LOWER(meal.ingredients) NOT LIKE :allergen${index}`, {
      [`allergen${index}`]: `%${allergen.toLowerCase()}%`,
    });
  });

  return await query.orderBy("meal.calories", "ASC").limit(10).getMany();
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

export {
  ExtendedCalculateCaloriesParams,
  getUserMealPlans,
  getMealPlanDetails,
  getCalculationResult,
  getSuggestedMeals,
};