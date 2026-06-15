export { AppError } from './AppError';

import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message = 'Invalid request body') {
    super(400, 'validation_error', message);
  }
}

export class ItemNotFoundError extends AppError {
  constructor() {
    super(404, 'item_not_found', 'Item not found');
  }
}

export class InsufficientInventoryError extends AppError {
  constructor() {
    super(409, 'insufficient_inventory', 'Insufficient inventory available');
  }
}

export class ReservationNotFoundError extends AppError {
  constructor() {
    super(404, 'reservation_not_found', 'Reservation not found');
  }
}

export class ReservationCancelledError extends AppError {
  constructor() {
    super(409, 'reservation_cancelled', 'Cannot confirm a cancelled reservation');
  }
}

export class ReservationExpiredError extends AppError {
  constructor() {
    super(409, 'reservation_expired', 'Reservation has expired');
  }
}

export class ReservationConfirmedError extends AppError {
  constructor() {
    super(409, 'reservation_confirmed', 'Cannot cancel a confirmed reservation');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, 'database_error', message);
  }
}
