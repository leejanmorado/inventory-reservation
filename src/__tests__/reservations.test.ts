import supertest from 'supertest';
import app from '@/app';
import { supabase } from '@/db/client';

describe('Reservations API', () => {
  let itemId: string;

  beforeAll(async () => {
    const res = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Reservations Test Item', initial_quantity: 50 });
    itemId = res.body.id;
  });

  afterAll(async () => {
    await supabase.from('reservations').delete().eq('item_id', itemId);
    await supabase.from('items').delete().eq('id', itemId);
  });

  it('POST /v1/reservations — creates a PENDING reservation', async () => {
    const res = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-create',
      quantity: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      item_id: itemId,
      customer_id: 'cust-create',
      quantity: 3,
      status: 'PENDING',
    });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.expires_at).toBeDefined();
    expect(res.body.confirmed_at).toBeNull();
    expect(res.body.cancelled_at).toBeNull();
  });

  it('POST /v1/reservations — returns 400 for quantity of zero', async () => {
    const res = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-zero',
      quantity: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('POST /v1/reservations — returns 400 for negative quantity', async () => {
    const res = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-negative',
      quantity: -1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('POST /v1/reservations — returns 409 when stock is insufficient', async () => {
    const res = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-greedy',
      quantity: 9999,
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('insufficient_inventory');
  });

  it('POST /v1/reservations — returns 404 for unknown item', async () => {
    const res = await supertest(app).post('/v1/reservations').send({
      item_id: '00000000-0000-0000-0000-000000000000',
      customer_id: 'cust-ghost',
      quantity: 1,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('item_not_found');
  });

  it('POST /v1/reservations/:id/confirm — confirms a PENDING reservation', async () => {
    const createRes = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-confirm',
      quantity: 2,
    });
    const reservationId = createRes.body.id;

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: reservationId,
      status: 'CONFIRMED',
      confirmed_at: expect.any(String),
    });
  });

  it('POST /v1/reservations/:id/confirm — returns 409 for already-cancelled reservation', async () => {
    const createRes = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-cancel-then-confirm',
      quantity: 1,
    });
    const reservationId = createRes.body.id;
    await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reservation_cancelled');
  });

  it('POST /v1/reservations/:id/confirm — returns 404 for unknown reservation', async () => {
    const res = await supertest(app).post(
      '/v1/reservations/00000000-0000-0000-0000-000000000000/confirm',
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('reservation_not_found');
  });

  it('POST /v1/reservations/:id/confirm — returns 409 for expired reservation and does not deduct inventory', async () => {
    const itemRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Expiry Confirm Item', initial_quantity: 10 });
    const expItemId = itemRes.body.id;

    const reservationRes = await supertest(app).post('/v1/reservations').send({
      item_id: expItemId,
      customer_id: 'cust-exp-confirm',
      quantity: 5,
    });
    const reservationId = reservationRes.body.id;

    // Force the reservation past its expiry and run maintenance to mark it EXPIRED
    await supabase
      .from('reservations')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', reservationId);
    await supertest(app).post('/v1/maintenance/expire-reservations');

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reservation_expired');

    // No inventory should have been deducted
    const statusRes = await supertest(app).get(`/v1/items/${expItemId}`);
    expect(statusRes.body.available_quantity).toBe(10);
    expect(statusRes.body.confirmed_quantity).toBe(0);

    await supabase.from('reservations').delete().eq('item_id', expItemId);
    await supabase.from('items').delete().eq('id', expItemId);
  });

  it('POST /v1/reservations/:id/cancel — cancels a PENDING reservation', async () => {
    const createRes = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-cancel',
      quantity: 1,
    });
    const reservationId = createRes.body.id;

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: reservationId,
      status: 'CANCELLED',
      cancelled_at: expect.any(String),
    });
  });

  it('POST /v1/reservations/:id/cancel — returns 404 for unknown reservation', async () => {
    const res = await supertest(app).post(
      '/v1/reservations/00000000-0000-0000-0000-000000000000/cancel',
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('reservation_not_found');
  });

  it('POST /v1/reservations/:id/cancel — returns 409 for expired reservation and does not release inventory', async () => {
    const itemRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Cancel Expiry Item', initial_quantity: 10 });
    const cancelExpItemId = itemRes.body.id;

    const reservationRes = await supertest(app).post('/v1/reservations').send({
      item_id: cancelExpItemId,
      customer_id: 'cust-cancel-exp',
      quantity: 5,
    });
    const reservationId = reservationRes.body.id;

    await supabase
      .from('reservations')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', reservationId);
    await supertest(app).post('/v1/maintenance/expire-reservations');

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reservation_expired');

    // Quantity was already released by expiration — available should still be 10
    const statusRes = await supertest(app).get(`/v1/items/${cancelExpItemId}`);
    expect(statusRes.body.available_quantity).toBe(10);
    expect(statusRes.body.held_quantity).toBe(0);

    await supabase.from('reservations').delete().eq('item_id', cancelExpItemId);
    await supabase.from('items').delete().eq('id', cancelExpItemId);
  });

  it('POST /v1/reservations/:id/cancel — returns 409 for already-confirmed reservation and does not release inventory', async () => {
    const itemRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Cancel After Confirm Item', initial_quantity: 10 });
    const cancelConfItemId = itemRes.body.id;

    const reservationRes = await supertest(app).post('/v1/reservations').send({
      item_id: cancelConfItemId,
      customer_id: 'cust-cancel-conf',
      quantity: 5,
    });
    const reservationId = reservationRes.body.id;

    await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);

    const statusBefore = await supertest(app).get(`/v1/items/${cancelConfItemId}`);
    expect(statusBefore.body.confirmed_quantity).toBe(5);
    expect(statusBefore.body.available_quantity).toBe(5);

    const res = await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reservation_confirmed');

    // Inventory must not have been released
    const statusAfter = await supertest(app).get(`/v1/items/${cancelConfItemId}`);
    expect(statusAfter.body.confirmed_quantity).toBe(5);
    expect(statusAfter.body.available_quantity).toBe(5);

    await supabase.from('reservations').delete().eq('item_id', cancelConfItemId);
    await supabase.from('items').delete().eq('id', cancelConfItemId);
  });

  describe('Idempotency — confirm twice does not double-deduct', () => {
    it('second confirm returns the same CONFIRMED state without changing confirmed_quantity', async () => {
      const itemRes = await supertest(app)
        .post('/v1/items')
        .send({ name: 'Idempotency Item', initial_quantity: 10 });
      const idempItemId = itemRes.body.id;

      const reservationRes = await supertest(app).post('/v1/reservations').send({
        item_id: idempItemId,
        customer_id: 'cust-idemp',
        quantity: 5,
      });
      const reservationId = reservationRes.body.id;

      const confirm1 = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);
      expect(confirm1.status).toBe(200);
      expect(confirm1.body).toEqual({
        id: reservationId,
        status: 'CONFIRMED',
        confirmed_at: expect.any(String),
      });

      const statusAfterFirst = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterFirst.body.confirmed_quantity).toBe(5);

      // Second confirm — idempotent, must not double-deduct
      const confirm2 = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);
      expect(confirm2.status).toBe(200);
      expect(confirm2.body).toEqual({
        id: reservationId,
        status: 'CONFIRMED',
        confirmed_at: expect.any(String),
      });

      const statusAfterSecond = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterSecond.body.confirmed_quantity).toBe(5); // still 5, not 10

      await supabase.from('reservations').delete().eq('item_id', idempItemId);
      await supabase.from('items').delete().eq('id', idempItemId);
    });
  });

  describe('Idempotency — cancel twice does not double-release', () => {
    it('second cancel returns the same CANCELLED state without changing available_quantity', async () => {
      const itemRes = await supertest(app)
        .post('/v1/items')
        .send({ name: 'Cancel Idempotency Item', initial_quantity: 10 });
      const idempItemId = itemRes.body.id;

      const reservationRes = await supertest(app).post('/v1/reservations').send({
        item_id: idempItemId,
        customer_id: 'cust-cancel-idemp',
        quantity: 5,
      });
      const reservationId = reservationRes.body.id;

      const cancel1 = await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);
      expect(cancel1.status).toBe(200);
      expect(cancel1.body).toEqual({
        id: reservationId,
        status: 'CANCELLED',
        cancelled_at: expect.any(String),
      });

      const statusAfterFirst = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterFirst.body.available_quantity).toBe(10);
      expect(statusAfterFirst.body.held_quantity).toBe(0);

      // Second cancel — idempotent, must not double-release
      const cancel2 = await supertest(app).post(`/v1/reservations/${reservationId}/cancel`);
      expect(cancel2.status).toBe(200);
      expect(cancel2.body).toEqual({
        id: reservationId,
        status: 'CANCELLED',
        cancelled_at: expect.any(String),
      });

      const statusAfterSecond = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterSecond.body.available_quantity).toBe(10); // still 10, not 15

      await supabase.from('reservations').delete().eq('item_id', idempItemId);
      await supabase.from('items').delete().eq('id', idempItemId);
    });
  });
});
