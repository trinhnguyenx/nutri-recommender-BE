import { payos } from '@/utils/payos.client';
import { CreatePaymentDto } from './payos.interface';
import { paymentRepository } from '@/repository/payment.repository';
import { userRepository } from '@/repository/userRepository';

export const createPaymentService = async (data: CreatePaymentDto) => {
  const orderCode = Date.now();
  const {buyerEmail, buyerName } = data;

  const paymentLink = await payos.createPaymentLink({
    orderCode,
    amount: 5000,
    description: 'Pay Premium HEALTHYFIT',
    returnUrl: `${process.env.CLIENT_URL}/payment-success?orderCode=${orderCode}`,
    cancelUrl: `${process.env.CLIENT_URL}/payment-cancel?orderCode=${orderCode}`,
    buyerEmail,
    buyerName,
    expiredAt: Math.floor(Date.now() / 1000) + 3600
  });

  return paymentLink;
};


export const handlePaymentSuccess = async (orderCode: string, amount: number, paymentLinkId:string, description:string ) => {
  const payment = await paymentRepository.findByOrderCodeAsync(orderCode);

  if (!payment) {
    throw new Error('Không tìm thấy giao dịch thanh toán');
  }

  if (payment.status === 'paid') {
    console.log('Giao dịch đã xử lý trước đó');
    return;
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.paymentLinkId = paymentLinkId;
  payment.description = description;
  payment.amount = amount;
  await paymentRepository.save(payment);

  const user = payment.user;
  if (!user.is_premium) {
    user.is_premium = true;
    await userRepository.saveUserAsync(user);
  }

  console.log(`Đã nâng cấp tài khoản premium cho user: ${user.email}`);
};

