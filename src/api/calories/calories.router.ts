import { Router } from "express";
import { calculateCaloriesUser, getMealPlanDetailsController, getUserMealPlansController, getCalculationResultController, getSuggestedMealsForSwap, updateMealInPlan } from "./calories.controller";
const CaloriesRouter = Router();

CaloriesRouter.post("/calculate", calculateCaloriesUser);
CaloriesRouter.get("/meal-plans/:userId",getUserMealPlansController);
CaloriesRouter.get("/meal-menu/:mealPlanId", getMealPlanDetailsController);
CaloriesRouter.get("/calculation-result/:userId", getCalculationResultController);
// Endpoint to get suggested meals for swap
CaloriesRouter.get("/suggested-meals/", getSuggestedMealsForSwap);
// Endpoint to update a meal in the user's meal plans
CaloriesRouter.put("/update/new-meal", (req, res, next) => {
  Promise.resolve(updateMealInPlan(req, res)).catch(next);
});



export default CaloriesRouter;
