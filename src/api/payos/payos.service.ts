import { payos } from '@/utils/payos.client';
import { CreatePaymentDto } from './payos.interface';

export const createPaymentService = async (data: CreatePaymentDto) => {
  const orderCode = Date.now(); // Unique per order
  const {buyerEmail, buyerName } = data;

  const paymentLink = await payos.createPaymentLink({
    orderCode,
    amount:5000,
    description: 'Pay Premium HEALTHYFIT',
    returnUrl: `${process.env.CLIENT_URL}/payment-success?orderCode=${orderCode}`,
    cancelUrl: `${process.env.CLIENT_URL}/payment-cancel?orderCode=${orderCode}`,
    buyerEmail,
    buyerName,
    expiredAt: Math.floor(Date.now() / 1000) + 3600
  });

  return paymentLink;
};
