import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './users.entity';
import { Meal } from './meal.entity';
import { DateTimeEntity } from './base/datetime.entity';

@Entity('user_meal_preferences')
export class UserMealPreference extends DateTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  mealId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @ManyToOne(() => User, user => user.preferences)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Meal, meal => meal.preferences)
  @JoinColumn({ name: 'mealId' })
  meal: Meal;
}
