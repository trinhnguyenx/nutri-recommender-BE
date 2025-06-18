import { Router } from "express";
import { calculateCaloriesUser, getMealPlanDetailsController, getUserMealPlansController, getCalculationResultController, getSuggestedMealsForSwap, updateMealInPlan, updateMealPlanNameController, getStatisticsByDayController } from "./calories.controller";
const CaloriesRouter = Router();

CaloriesRouter.post("/calculate", calculateCaloriesUser);
CaloriesRouter.get("/meal-plans/:userId",getUserMealPlansController);
CaloriesRouter.get("/meal-menu/:mealPlanId", getMealPlanDetailsController);
CaloriesRouter.get("/statistics/daily", (req, res, next) => {
  Promise.resolve(getStatisticsByDayController(req, res)).catch(next);
});
CaloriesRouter.get("/calculation-result", (req, res, next) => {
  Promise.resolve(getCalculationResultController(req, res)).catch(next);
});
// Endpoint to get suggested meals for swap
CaloriesRouter.get("/suggested-meals/", getSuggestedMealsForSwap);
// Endpoint to update a meal in the user's meal plans
CaloriesRouter.put("/update/new-meal", (req, res, next) => {
  Promise.resolve(updateMealInPlan(req, res)).catch(next);
});
// Endpoint to update the name of a meal plan
CaloriesRouter.put("/update/meal-plan-name", (req, res, next) => {
  Promise.resolve(updateMealPlanNameController(req, res)).catch(next);
});


export default CaloriesRouter;
