import { Router } from 'express';
import { createPayment, ReceivePaymentStatus  } from './payos.controller';

const router = Router();

router.post('/create-payment', createPayment);
router.get("/webhook", (req, res, next) => {
  Promise.resolve(ReceivePaymentStatus(req, res)).catch(next);
});
export default router;
