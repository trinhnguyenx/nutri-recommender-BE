import { Request, Response } from 'express';
import { createPaymentService } from './payos.service';

export const createPayment = async (req: Request, res: Response) => {
  try {
    const paymentLink = await createPaymentService(req.body);
    res.json(paymentLink);
  } catch (error: any) {
    console.error('Lỗi tạo thanh toán:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể tạo thanh toán' });
  }
};
