import { Router } from 'express';
import * as reservationsController from '@/controllers/reservations.controller';
import { validate } from '@/middleware/validate';
import { UuidParamSchema } from '@/schemas/common.schema';
import { CreateReservationSchema } from '@/schemas/reservations.schema';

const router = Router();

router.post(
  '/',
  validate({ body: CreateReservationSchema }),
  reservationsController.createReservation,
);
router.post(
  '/:id/confirm',
  validate({ params: UuidParamSchema }),
  reservationsController.confirmReservation,
);
router.post(
  '/:id/cancel',
  validate({ params: UuidParamSchema }),
  reservationsController.cancelReservation,
);

export default router;
