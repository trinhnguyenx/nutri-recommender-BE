import { Request, Response } from 'express';
import { createPaymentService, handlePaymentSuccess } from './payos.service';

export const createPayment = async (req: Request, res: Response) => {
  try {
    const paymentLink = await createPaymentService(req.body);
    res.json(paymentLink);
    console.log('Thanh toán đã được tạo thành công:', paymentLink);
  } catch (error: any) {
    console.error('Lỗi tạo thanh toán:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể tạo thanh toán' });
  }
};

export const ReceivePaymentStatus = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const paymentLinkId = data?.data?.paymentLinkId;
    if (!paymentLinkId) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }
    console.log('Nhận trạng thái thanh toán:', data);
    // Kiểm tra mã code thanh toán thành công
    if (data?.code === '00') {
      const orderCode = data.data.orderCode;
      console.log('Thanh toán thành công cho orderCode:', orderCode);
      await handlePaymentSuccess(orderCode,paymentLinkId);
    }

    res.status(200).json({ message: 'Đã xử lý webhook' });
  } catch (error: any) {
    console.error('Lỗi lấy trạng thái thanh toán:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Không thể xử lý trạng thái thanh toán' });
  }
};
