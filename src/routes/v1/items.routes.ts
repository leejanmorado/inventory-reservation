import { Router } from 'express';
import * as itemsController from '@/controllers/items.controller';
import { validate } from '@/middleware/validate';
import { UuidParamSchema } from '@/schemas/common.schema';
import { CreateItemSchema } from '@/schemas/items.schema';

const router = Router();

router.post('/', validate({ body: CreateItemSchema }), itemsController.createItem);
router.get('/:id', validate({ params: UuidParamSchema }), itemsController.getItemStatus);

export default router;
