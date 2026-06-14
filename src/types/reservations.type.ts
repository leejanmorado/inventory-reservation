import type { z } from 'zod';
import type {
  CreateReservationSchema,
  ReservationCancelResponseSchema,
  ReservationConfirmResponseSchema,
  ReservationSchema,
  ReservationStatusEnum,
} from '@/schemas/reservations.schema';

export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;
export type ReservationDto = z.infer<typeof ReservationSchema>;
export type ReservationConfirmResponseDto = z.infer<typeof ReservationConfirmResponseSchema>;
export type ReservationCancelResponseDto = z.infer<typeof ReservationCancelResponseSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;
