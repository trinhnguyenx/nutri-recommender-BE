import { payos } from '@/utils/payos.client';
import { CreatePaymentDto } from './payos.interface';
import { paymentRepository } from '@/repository/payment.repository';
import { userRepository } from '@/repository/userRepository';
import { PaymentTransaction } from '@/model/payment.entity';


export const createPaymentService = async (data: CreatePaymentDto & { userId: string }) => {
const orderCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  // const orderCode = 123
  const { buyerEmail, buyerName, userId } = data;

  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new Error('User không tồn tại');
  }

  const paymentLink = await payos.createPaymentLink({
    orderCode: Number(orderCode),
    amount: 1000,
    description: 'Pay Premium HEALTHYFIT',
    returnUrl: `${process.env.CLIENT_URL}/payment-success?orderCode=${orderCode.toString()}`,
    cancelUrl: `${process.env.CLIENT_URL}/payment-cancel?orderCode=${orderCode.toString()}`,
    buyerEmail,
    buyerName,
    expiredAt: Math.floor(Date.now() / 1000) + 3600,
  });

await paymentRepository.createPaymentTransactionAsync({
    orderCode: orderCode.toString(),
    amount: paymentLink.amount,
    user,
    description: 'Pay Premium HEALTHYFIT',
    status: 'pending',
  });

  return paymentLink;
};



export const handlePaymentSuccess = async (orderCode: string, paymentLinkId: string) => {
  if (orderCode === "123") {
    console.log("Bypassed logic for test orderCode 123");
    return;
  }

  const payment = await paymentRepository.findByOrderCodeAsync(orderCode);

  if (!payment) {
    // throw new Error('Không tìm thấy giao dịch thanh toán');
    return;
  }

  if (payment.status === 'paid') {
    console.log('Giao dịch đã xử lý trước đó');
    return;
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.paymentLinkId = paymentLinkId;
  await paymentRepository.save(payment);

  const user = payment.user;
  if (!user.is_premium) {
    user.is_premium = true;
    user.meal_plan_count = 10;
    await userRepository.saveUserAsync(user);
  }

  console.log(`Đã nâng cấp tài khoản premium cho user: ${user.email}`);
};
