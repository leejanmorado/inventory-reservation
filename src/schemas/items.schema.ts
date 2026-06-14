import { z } from '@/lib/zod';

export const CreateItemSchema = z.object({
  name: z.string().min(1).openapi({ example: 'White T-Shirt' }),
  initial_quantity: z.number().int().positive().openapi({ example: 100 }),
});

export const ItemSchema = z.object({
  id: z.uuid().openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
  name: z.string().openapi({ example: 'White T-Shirt' }),
  total_quantity: z.number().int().openapi({ example: 100 }),
  created_at: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
});

export const ItemStatusSchema = z.object({
  id: z.uuid().openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
  name: z.string().openapi({ example: 'White T-Shirt' }),
  total_quantity: z.number().int().openapi({ example: 100 }),
  available_quantity: z.number().int().openapi({ example: 85 }),
  held_quantity: z.number().int().openapi({ example: 10 }),
  confirmed_quantity: z.number().int().openapi({ example: 5 }),
  created_at: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
});
