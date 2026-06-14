import type { z } from 'zod';
import type { CreateItemSchema, ItemSchema, ItemStatusSchema } from '@/schemas/items.schema';

export type CreateItemDto = z.infer<typeof CreateItemSchema>;
export type ItemDto = z.infer<typeof ItemSchema>;
export type ItemStatusDto = z.infer<typeof ItemStatusSchema>;
