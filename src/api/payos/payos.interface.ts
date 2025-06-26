import { User } from '../../model/users.entity';
export interface CreatePaymentDto {
  amount: number;
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  orderCode: number;
  user: User;

}