import { PaymentTransaction } from '@/model/payment.entity';
import dataSource from '../config/typeorm.config';

export const paymentRepository = dataSource.getRepository(PaymentTransaction).extend({
  async createPaymentTransactionAsync(data: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const payment = this.create(data);
    return this.save(payment);
  },

  async findByOrderCodeAsync(orderCode: string): Promise<PaymentTransaction | null> {
    return this.findOne({
      where: { orderCode },
      relations: ['user'],
    });
  },

  async updatePaymentStatusAsync(orderCode: string, status: string): Promise<PaymentTransaction | null> {
    await this.update({ orderCode }, { status });
    return this.findByOrderCodeAsync(orderCode);
  }
});
