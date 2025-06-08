import { config } from "dotenv";
import { join } from "path";
import { DataSource } from "typeorm";
import { resolve } from "path";


import { User } from "../model/users.entity";
import {Meal} from "../model/meal.entity";
import { MealPlan } from "../model/mealplan.entity";
import { MealPlanDay } from "../model/mealplanday.entity";
import { MealPlanMeal } from "../model/mealplanmeals.entity";
import { CalculationResult } from "../model/caculation.result";
import { Conversation } from "../model/conversation.entity";
import { Message } from "../model/message.entity";
import { PaymentTransaction } from "../model/payment.entity";

config({ path: resolve(__dirname, "../../.env") });
export default new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Meal, MealPlan, MealPlanDay, MealPlanMeal, CalculationResult, Conversation, Message, PaymentTransaction],
  logging: true,
  migrationsTableName: "migrations",
  migrations: [join(__dirname, "../../src/migrations/**/*.ts")],
  synchronize: false,
  
});
