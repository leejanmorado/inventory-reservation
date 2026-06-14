import * as reservationsRepo from '@/repositories/reservations.repository';
import type {
  CreateReservationDto,
  ReservationCancelResponseDto,
  ReservationConfirmResponseDto,
  ReservationDto,
} from '@/types/reservations.type';

export async function createReservation(dto: CreateReservationDto): Promise<ReservationDto> {
  return reservationsRepo.createReservation(dto.item_id, dto.customer_id, dto.quantity);
}

export async function confirmReservation(id: string): Promise<ReservationConfirmResponseDto> {
  const { id: resId, confirmed_at } = await reservationsRepo.confirmReservation(id);
  return { id: resId, status: 'CONFIRMED', confirmed_at };
}

export async function cancelReservation(id: string): Promise<ReservationCancelResponseDto> {
  const { id: resId, cancelled_at } = await reservationsRepo.cancelReservation(id);
  return { id: resId, status: 'CANCELLED', cancelled_at };
}

export async function expireReservations(): Promise<{ expired_count: number }> {
  const count = await reservationsRepo.expireStaleReservations();
  return { expired_count: count };
}
