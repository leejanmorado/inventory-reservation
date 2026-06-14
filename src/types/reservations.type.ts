import type { z } from 'zod';
import type {
  CreateReservationSchema,
  ReservationSchema,
  ReservationStatusEnum,
} from '@/schemas/reservations.schema';

export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;
export type ReservationDto = z.infer<typeof ReservationSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;
