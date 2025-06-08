import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './users.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderCode: string;

  @Column()
  amount: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  paymentLinkId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @ManyToOne(() => User, (user) => user.paymentTransactions)
  user: User;
}
