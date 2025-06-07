import { Router } from 'express';
import { createPayment } from './payos.controller';

const router = Router();

router.post('/create-payment', createPayment);

export default router;
