import { Router } from 'express';
import itemsRoutes from './v1/items.routes';
import maintenanceRoutes from './v1/maintenance.routes';
import reservationsRoutes from './v1/reservations.routes';

const v1 = Router();

v1.use('/items', itemsRoutes);
v1.use('/reservations', reservationsRoutes);
v1.use('/maintenance', maintenanceRoutes);

export default v1;
