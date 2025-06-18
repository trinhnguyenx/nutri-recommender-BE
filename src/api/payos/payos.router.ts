import { Router } from 'express';
import { createPayment, RecievePaymentStatus } from './payos.controller';

const payos = Router();

payos.post('/create-payment', createPayment);
payos.post("/webhook", (req, res, next) => {
  Promise.resolve(RecievePaymentStatus(req, res)).catch(next);
});
export default payos;
