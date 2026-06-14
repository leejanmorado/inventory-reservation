import { z } from '@/lib/zod';

export const ReservationStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED']);

export const CreateReservationSchema = z.object({
  item_id: z.uuid().openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
  customer_id: z.string().min(1).openapi({ example: 'customer-123' }),
  quantity: z.number().int().positive().openapi({ example: 5 }),
});

export const ReservationSchema = z.object({
  id: z.uuid().openapi({ example: 'b1ffcd00-8d1c-5f09-cc7e-7cc0ce491b22' }),
  item_id: z.uuid().openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
  customer_id: z.string().openapi({ example: 'customer-123' }),
  quantity: z.number().int().openapi({ example: 5 }),
  status: ReservationStatusEnum.openapi({ example: 'PENDING' }),
  expires_at: z.string().openapi({ example: '2024-01-01T00:10:00.000Z' }),
  confirmed_at: z.string().nullable().openapi({ example: null }),
  cancelled_at: z.string().nullable().openapi({ example: null }),
  created_at: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
});

export const ReservationConfirmResponseSchema = z.object({
  id: z.uuid().openapi({ example: 'b1ffcd00-8d1c-5f09-cc7e-7cc0ce491b22' }),
  status: z.literal('CONFIRMED').openapi({ example: 'CONFIRMED' }),
  confirmed_at: z.string().nullable().openapi({ example: '2024-01-01T00:05:00.000Z' }),
});

export const ReservationCancelResponseSchema = z.object({
  id: z.uuid().openapi({ example: 'b1ffcd00-8d1c-5f09-cc7e-7cc0ce491b22' }),
  status: z.literal('CANCELLED').openapi({ example: 'CANCELLED' }),
  cancelled_at: z.string().nullable().openapi({ example: '2024-01-01T00:03:00.000Z' }),
});

export const ExpireReservationsResponseSchema = z.object({
  expired_count: z.number().int().openapi({ example: 3 }),
});
