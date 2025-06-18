import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { MealPlan } from "./mealplan.entity";
import { User } from "./users.entity";
@Entity("meal_plan_calorie_summaries")
export class MealPlanCalorieSummary {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MealPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "meal_plan_id" })
  meal_plan: MealPlan;

  @ManyToOne(() => User, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("int")
  day_number: number;

  @Column({ type: "enum", enum: ["gain", "maintenance", "loss"] })
  goal: string;

  @Column("float", { default: 0 })
  breakfast_calories: number;

  @Column("float", { default: 0 })
  lunch_calories: number;

  @Column("float", { default: 0 })
  dinner_calories: number;

  @Column("float", { default: 0 })
  snack1_calories: number;

  @Column("float", { default: 0 })
  snack2_calories: number;

  @Column("float", { default: 0 })
  snack3_calories: number;

  @Column("float")
  total_daily_calories: number;

  @CreateDateColumn()
  created_at: Date;
}