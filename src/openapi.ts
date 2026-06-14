import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from '@/lib/zod';
import { CreateItemSchema, ItemSchema, ItemStatusSchema } from '@/schemas/items.schema';
import {
  CreateReservationSchema,
  ExpireReservationsResponseSchema,
  ReservationCancelResponseSchema,
  ReservationConfirmResponseSchema,
  ReservationSchema,
} from '@/schemas/reservations.schema';

const registry = new OpenAPIRegistry();

const ValidationErrorSchema = z.object({
  error: z.string().openapi({ example: 'validation_error' }),
  message: z.string().openapi({ example: 'body.quantity: Expected number, received string' }),
});

const ItemNotFoundErrorSchema = z.object({
  error: z.string().openapi({ example: 'item_not_found' }),
  message: z.string().openapi({ example: 'Item not found' }),
});

const ReservationNotFoundErrorSchema = z.object({
  error: z.string().openapi({ example: 'reservation_not_found' }),
  message: z.string().openapi({ example: 'Reservation not found' }),
});

const InsufficientInventoryErrorSchema = z.object({
  error: z.string().openapi({ example: 'insufficient_inventory' }),
  message: z.string().openapi({ example: 'Insufficient inventory available' }),
});

const ReservationConfirmConflictSchema = z.object({
  error: z.string().openapi({ example: 'reservation_expired' }),
  message: z.string().openapi({ example: 'Reservation has expired' }),
});

const ReservationCancelConflictSchema = z.object({
  error: z.string().openapi({ example: 'reservation_confirmed' }),
  message: z
    .string()
    .openapi({ example: 'Reservation is already confirmed and cannot be cancelled' }),
});

registry.register('Item', ItemSchema);
registry.register('ItemStatus', ItemStatusSchema);
registry.register('Reservation', ReservationSchema);
registry.register('ReservationConfirmResponse', ReservationConfirmResponseSchema);
registry.register('ReservationCancelResponse', ReservationCancelResponseSchema);
registry.register('CreateItemRequest', CreateItemSchema);
registry.register('CreateReservationRequest', CreateReservationSchema);
registry.register('ExpireReservationsResponse', ExpireReservationsResponseSchema);
registry.register('ValidationError', ValidationErrorSchema);
registry.register('ItemNotFoundError', ItemNotFoundErrorSchema);
registry.register('ReservationNotFoundError', ReservationNotFoundErrorSchema);
registry.register('InsufficientInventoryError', InsufficientInventoryErrorSchema);
registry.register('ReservationConfirmConflict', ReservationConfirmConflictSchema);
registry.register('ReservationCancelConflict', ReservationCancelConflictSchema);

registry.registerPath({
  method: 'post',
  path: '/v1/items',
  tags: ['Items'],
  summary: 'Create a new item',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreateItemSchema } },
    },
  },
  responses: {
    201: {
      description: 'Item created successfully',
      content: { 'application/json': { schema: ItemSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ValidationErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/v1/items/{id}',
  tags: ['Items'],
  summary: 'Get item status',
  description:
    'Returns total, available, held, and confirmed quantities. Available = total − confirmed − active pending.',
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    }),
  },
  responses: {
    200: {
      description: 'Item status',
      content: { 'application/json': { schema: ItemStatusSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ValidationErrorSchema } },
    },
    404: {
      description: 'Item not found',
      content: { 'application/json': { schema: ItemNotFoundErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/reservations',
  tags: ['Reservations'],
  summary: 'Create a reservation (temporary hold)',
  description: 'Holds the requested quantity for 10 minutes. Returns 409 if insufficient stock.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreateReservationSchema } },
    },
  },
  responses: {
    201: {
      description: 'Reservation created',
      content: { 'application/json': { schema: ReservationSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ValidationErrorSchema } },
    },
    404: {
      description: 'Item not found',
      content: { 'application/json': { schema: ItemNotFoundErrorSchema } },
    },
    409: {
      description: 'Insufficient inventory',
      content: { 'application/json': { schema: InsufficientInventoryErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/reservations/{id}/confirm',
  tags: ['Reservations'],
  summary: 'Confirm a reservation',
  description:
    'Permanently deducts the reserved quantity. Idempotent — confirming twice returns the same result. Fails if expired or cancelled.',
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: 'b1ffcd00-8d1c-5f09-cc7e-7cc0ce491b22' }),
    }),
  },
  responses: {
    200: {
      description: 'Reservation confirmed',
      content: { 'application/json': { schema: ReservationConfirmResponseSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ValidationErrorSchema } },
    },
    404: {
      description: 'Reservation not found',
      content: { 'application/json': { schema: ReservationNotFoundErrorSchema } },
    },
    409: {
      description: 'Reservation is expired or cancelled',
      content: {
        'application/json': {
          schema: ReservationConfirmConflictSchema,
          examples: {
            reservation_expired: {
              summary: 'Reservation has expired',
              value: { error: 'reservation_expired', message: 'Reservation has expired' },
            },
            reservation_cancelled: {
              summary: 'Reservation was cancelled',
              value: { error: 'reservation_cancelled', message: 'Reservation has been cancelled' },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/reservations/{id}/cancel',
  tags: ['Reservations'],
  summary: 'Cancel a reservation',
  description:
    'Releases the held quantity back to availability. Idempotent — cancelling twice returns the same result. Cannot cancel a confirmed reservation.',
  request: {
    params: z.object({
      id: z.uuid().openapi({ example: 'b1ffcd00-8d1c-5f09-cc7e-7cc0ce491b22' }),
    }),
  },
  responses: {
    200: {
      description: 'Reservation cancelled',
      content: { 'application/json': { schema: ReservationCancelResponseSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ValidationErrorSchema } },
    },
    404: {
      description: 'Reservation not found',
      content: { 'application/json': { schema: ReservationNotFoundErrorSchema } },
    },
    409: {
      description: 'Reservation is confirmed or expired',
      content: {
        'application/json': {
          schema: ReservationCancelConflictSchema,
          examples: {
            reservation_confirmed: {
              summary: 'Reservation is already confirmed',
              value: {
                error: 'reservation_confirmed',
                message: 'Reservation is already confirmed and cannot be cancelled',
              },
            },
            reservation_expired: {
              summary: 'Reservation has expired',
              value: { error: 'reservation_expired', message: 'Reservation has expired' },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/maintenance/expire-reservations',
  tags: ['Maintenance'],
  summary: 'Expire stale reservations',
  description:
    'Marks all PENDING reservations past their expiry time as EXPIRED, releasing their quantity back to availability.',
  responses: {
    200: {
      description: 'Reservations expired',
      content: { 'application/json': { schema: ExpireReservationsResponseSchema } },
    },
  },
});

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Inventory Reservation API',
      version: '1.0.0',
      description:
        'API for managing inventory reservations with concurrency-safe holds, confirmations, and expirations.',
    },
    servers: [{ url: '/', description: 'Current server' }],
  });
}
