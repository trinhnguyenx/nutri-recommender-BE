export interface CreatePaymentDto {
  amount: number;
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  orderCode: number;
}