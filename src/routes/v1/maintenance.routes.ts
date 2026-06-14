import { Router } from 'express';
import * as maintenanceController from '@/controllers/maintenance.controller';

const router = Router();

router.post('/expire-reservations', maintenanceController.expireReservations);

export default router;
