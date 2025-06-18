import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { User } from "./users.entity";

@Entity("calculation_results")
export class CalculationResult {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("float")
  maintenanceCalories: number;

  @Column("float")
  targetCalories: number;

  @Column({ type: "varchar" })
  goal: string;

  @Column("float")
  estimatedWeeklyChange: number;

  @Column("int")
  estimatedDaysToGoal: number;

  @Column("float", { nullable: true }) 
  bmr?: number;

  @Column({ default: "" })
  gender: string;

  @Column("int", { default: 0 })
  age: number;

  @Column("float", { default: 0 })
  height: number;

  @Column("float", { default: 0 })
  weight: number;

  @Column({ default: "" })
  activityLevel: string;

  @Column({ default: false })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.calculationResults, {
    onDelete: "CASCADE",
  })
  user: User;
}
