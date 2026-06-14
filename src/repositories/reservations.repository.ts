import { supabase } from '@/db/client';
import {
  type AppError,
  DatabaseError,
  InsufficientInventoryError,
  ItemNotFoundError,
  ReservationCancelledError,
  ReservationConfirmedError,
  ReservationExpiredError,
  ReservationNotFoundError,
} from '@/errors';
import type { ReservationDto } from '@/types/reservations.type';

function mapRpcError(message: string): AppError {
  switch (message) {
    case 'item_not_found':
      return new ItemNotFoundError();
    case 'insufficient_inventory':
      return new InsufficientInventoryError();
    case 'reservation_not_found':
      return new ReservationNotFoundError();
    case 'reservation_cancelled':
      return new ReservationCancelledError();
    case 'reservation_expired':
      return new ReservationExpiredError();
    case 'reservation_confirmed':
      return new ReservationConfirmedError();
    default:
      return new DatabaseError(message);
  }
}

export async function createReservation(
  itemId: string,
  customerId: string,
  quantity: number,
): Promise<ReservationDto> {
  const { data, error } = await supabase.rpc('create_reservation', {
    p_item_id: itemId,
    p_customer_id: customerId,
    p_quantity: quantity,
  });

  if (error) throw mapRpcError(error.message);

  if (!data || data.length === 0) {
    throw new DatabaseError('No reservation returned');
  }

  return data[0];
}

export async function getReservationById(id: string): Promise<ReservationDto | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select(
      'id, item_id, customer_id, quantity, status, expires_at, confirmed_at, cancelled_at, created_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new DatabaseError(error.message);
  }

  return data;
}

export async function confirmReservation(id: string): Promise<ReservationDto> {
  const { data, error } = await supabase.rpc('confirm_reservation', {
    p_reservation_id: id,
  });

  if (error) throw mapRpcError(error.message);

  if (!data || data.length === 0) {
    throw new DatabaseError('No reservation returned');
  }

  return data[0];
}

export async function cancelReservation(id: string): Promise<ReservationDto> {
  const { data, error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: id,
  });

  if (error) throw mapRpcError(error.message);

  if (!data || data.length === 0) {
    throw new DatabaseError('No reservation returned');
  }

  return data[0];
}

export async function expireStaleReservations(): Promise<number> {
  const { data, error } = await supabase.rpc('expire_reservations');

  if (error) throw new DatabaseError(error.message);

  return data ?? 0;
}
