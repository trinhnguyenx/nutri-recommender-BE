import { Request, Response } from "express";
import { calculateCaloriesAndRecommend, getMealPlanDetails, deleteMealPlan, getUserMealPlans, getCalculationResult, getSuggestedMeals, swapMealInPlan, updateMealPlanName, recordUserProgress, getUserProgress, getLargestDayNumber, setFavoriteMeal } from "./calories.service";

export const calculateCaloriesUser = async (req: Request, res: Response) => {
  try {
    const { height, weight, age, gender, weightTarget, activityLevel, userId, allergies, weeklyGainRate, planName } = req.body;

    if (!height || !weight || !age || !gender || !weightTarget || !userId || !allergies || !weeklyGainRate || !planName) {
      throw new Error("Missing required parameters");
    }

    const params = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age, 10),
      gender,
      weightTarget: parseFloat(weightTarget),
      activityLevel: activityLevel || "moderate",
      userId,
      allergies,
      weeklyGainRate: parseFloat(weeklyGainRate),
      planName: planName || "Default Meal Plan",
    };

    const result = await calculateCaloriesAndRecommend(params);
    res.status(200).json({
      message: "Calorie calculation and meal recommendation successful",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to calculate calories and recommend meals",
    });
  }
};

export const getUserMealPlansController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      throw new Error("Missing userId parameter");
    }

    const mealPlans = await getUserMealPlans(userId);
    res.status(200).json({
      message: "Successfully retrieved meal plans",
      data: mealPlans,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to retrieve meal plans",
    });
  }
};

export const getMealPlanDetailsController = async (req: Request, res: Response) => {
  try {
    const { mealPlanId } = req.params;
    if (!mealPlanId) {
      throw new Error("Missing mealPlanId parameter");
    }

    const mealPlanDetails = await getMealPlanDetails(mealPlanId);
    res.status(200).json({
      message: "Successfully retrieved meal plan details",
      data: mealPlanDetails,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to retrieve meal plan details",
    });
  }
};

export const getCalculationResultController = async (req: Request, res: Response) => {
  try {
    const { userId, mealPlanId } = req.query;

    if (!userId || !mealPlanId) {
      return res.status(400).json({ message: "Missing userId or mealPlanId" });
    }

    const result = await getCalculationResult(String(userId), String(mealPlanId));

    if (!result) {
      return res.status(404).json({ message: "Calculation result not found" });
    }

    return res.status(200).json({
      message: "Successfully retrieved calculation result",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to retrieve calculation result",
    });
  }
};

//Controller for swap meal
export const getSuggestedMealsForSwap = async (req: Request, res: Response) => {
  try {
    const { mealId, mealType, currentCalories, allergies } = req.query;

    if (!mealId || !mealType || !currentCalories) {
      throw new Error("Missing required query parameters");
    }

    // Parse allergies: nếu không có hoặc rỗng thì thành mảng rỗng
    const allergyList = typeof allergies === "string" && allergies.trim() !== "" 
      ? allergies.split(",").map(a => a.trim().toLowerCase())
      : [];

    const suggestedMeals = await getSuggestedMeals({
      mealId: String(mealId),
      mealType: String(mealType),
      currentCalories: parseFloat(String(currentCalories)),
      allergies: allergyList,
    });

    res.status(200).json({
      message: "Lấy danh sách món ăn thay thế thành công",
      data: suggestedMeals,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Lỗi khi lấy món ăn thay thế",
    });
  }
};

// update swap meal controller
export const updateMealInPlan = async (req: Request, res: Response) => {
  try {
    const { mealPlanMealId, newMealId } = req.body;

    if (!mealPlanMealId || !newMealId) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }

    await swapMealInPlan(mealPlanMealId, newMealId);

    res.status(200).json({ message: 'Cập nhật món ăn thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi khi cập nhật món ăn' });
  }
};

//update Name Meal Plan

export const updateMealPlanNameController = async (req: Request, res: Response) => {
  try {
    const { mealPlanId, newName } = req.body;

    if (!mealPlanId || !newName) {
      return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
    }

    await updateMealPlanName({ mealPlanId, newName });

    res.status(200).json({ message: "Cập nhật tên kế hoạch bữa ăn thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Lỗi khi cập nhật tên kế hoạch bữa ăn" });
  }
};

export const recordUserProgressController = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      weight,
      meals,
      sick,
      sleep,
      hunger,
      caloBreakfast,
      caloLunch,
      caloDinner,
      caloSnack,
    } = req.body;

    // Kiểm tra tham số bắt buộc
    if (!userId || weight === undefined || meals === undefined) {
      return res.status(400).json({ message: "Missing required parameters: userId, weight, meals" });
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ message: "Invalid weight value" });
    }

    const progressParams = {
      userId,
      weight: parsedWeight,
      meals,
      sick,
      sleep,
      hunger,
      caloBreakfast ,
      caloLunch,
      caloDinner,
      caloSnack,
    };

    const result = await recordUserProgress(progressParams);

    return res.status(201).json({
      message: "Successfully recorded user progress",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Failed to record user progress",
    });
  }
};


export const getUserProgressController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId parameter" });
    }

    const result = await getUserProgress(userId);

    res.status(200).json({
      message: "Successfully retrieved user progress",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve user progress",
    });
  }
};

export const getLargestDayNumberController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      throw new Error("Missing userId parameter");
    }

    const result = await getLargestDayNumber(userId);
    res.status(200).json({
      message: "Successfully retrieved the largest day number",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to retrieve the largest day number",
    });
  }
};

export const setFavoriteMealController = async (req: Request, res: Response) => {
  try {
    const { userId, mealId, isFavorite } = req.body;
    console.log("setFavoriteMealController called with:", { userId, mealId, isFavorite });
    if (!userId || !mealId || typeof isFavorite !== 'boolean') {
      return res.status(400).json({ message: 'Missing or invalid parameters: userId, mealId, isFavorite' });
    }
    await setFavoriteMeal(userId, mealId, isFavorite);
    res.status(200).json({ message: `Cập nhật trạng thái yêu thích thành công cho mealId=${mealId}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Lỗi khi cập nhật trạng thái yêu thích món ăn' });
  }
};
export const deleteMealPlanController = async (req: Request, res: Response) => {
  try {
    const { mealPlanId, userId } = req.query;
    if (!mealPlanId || !userId) {
      return res.status(400).json({ message: "Missing mealPlanId parameter" });
    }

    // Xoá kế hoạch bữa ăn từ cơ sở dữ liệu
    const result = await deleteMealPlan(String(mealPlanId), String(userId));
    res.status(200).json({
      message: "Successfully deleted meal plan",
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to delete meal plan",
    });
  }
}