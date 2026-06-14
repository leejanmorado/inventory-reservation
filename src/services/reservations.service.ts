import * as reservationsRepo from '@/repositories/reservations.repository';
import type { CreateReservationDto, ReservationDto } from '@/types/reservations.type';

export async function createReservation(dto: CreateReservationDto): Promise<ReservationDto> {
  return reservationsRepo.createReservation(dto.item_id, dto.customer_id, dto.quantity);
}

export async function confirmReservation(id: string): Promise<ReservationDto> {
  return reservationsRepo.confirmReservation(id);
}

export async function cancelReservation(id: string): Promise<ReservationDto> {
  return reservationsRepo.cancelReservation(id);
}

export async function expireReservations(): Promise<{ expired_count: number }> {
  const count = await reservationsRepo.expireStaleReservations();
  return { expired_count: count };
}
