import { UserMealPreference } from "../model/user.meal.preference.entity";
import dataSource from "../config/typeorm.config";

export const userMealPreferenceRepository = dataSource.getRepository(UserMealPreference);
