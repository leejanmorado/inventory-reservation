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

const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'not_found' }),
  message: z.string().openapi({ example: 'Resource not found' }),
});

registry.register('Item', ItemSchema);
registry.register('ItemStatus', ItemStatusSchema);
registry.register('Reservation', ReservationSchema);
registry.register('ReservationConfirmResponse', ReservationConfirmResponseSchema);
registry.register('ReservationCancelResponse', ReservationCancelResponseSchema);
registry.register('CreateItemRequest', CreateItemSchema);
registry.register('CreateReservationRequest', CreateReservationSchema);
registry.register('ExpireReservationsResponse', ExpireReservationsResponseSchema);
registry.register('Error', ErrorSchema);

const errorResponses = {
  400: {
    description: 'Validation error',
    content: { 'application/json': { schema: ErrorSchema } },
  },
  404: {
    description: 'Not found',
    content: { 'application/json': { schema: ErrorSchema } },
  },
  409: {
    description: 'Conflict',
    content: { 'application/json': { schema: ErrorSchema } },
  },
};

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
    ...errorResponses,
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
    ...errorResponses,
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
    ...errorResponses,
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
    ...errorResponses,
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
    ...errorResponses,
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
