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
    expect(res.body.expires_at).toBeDefined();
    expect(res.body.confirmed_at).toBeNull();
    expect(res.body.cancelled_at).toBeNull();
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
    expect(res.body).toMatchObject({ id: reservationId, status: 'CONFIRMED' });
    expect(res.body.confirmed_at).not.toBeNull();
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
    expect(res.body).toMatchObject({ id: reservationId, status: 'CANCELLED' });
    expect(res.body.cancelled_at).not.toBeNull();
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

  describe('Idempotency — confirm twice does not double-deduct', () => {
    it('second confirm returns the same CONFIRMED state without changing confirmed_quantity', async () => {
      // Dedicated item so confirmed_quantity is unambiguous
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

      // First confirm
      const confirm1 = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);
      expect(confirm1.status).toBe(200);
      expect(confirm1.body.status).toBe('CONFIRMED');

      const statusAfterFirst = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterFirst.body.confirmed_quantity).toBe(5);

      // Second confirm — idempotent, must not double-deduct
      const confirm2 = await supertest(app).post(`/v1/reservations/${reservationId}/confirm`);
      expect(confirm2.status).toBe(200);
      expect(confirm2.body.status).toBe('CONFIRMED');

      const statusAfterSecond = await supertest(app).get(`/v1/items/${idempItemId}`);
      expect(statusAfterSecond.body.confirmed_quantity).toBe(5); // still 5, not 10

      // Cleanup
      await supabase.from('reservations').delete().eq('item_id', idempItemId);
      await supabase.from('items').delete().eq('id', idempItemId);
    });
  });
});
