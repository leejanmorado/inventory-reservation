import supertest from 'supertest';
import app from '@/app';
import { supabase } from '@/db/client';

describe('Maintenance API — expire reservations', () => {
  it('POST /v1/maintenance/expire-reservations — returns expired_count', async () => {
    const res = await supertest(app).post('/v1/maintenance/expire-reservations');
    expect(res.status).toBe(200);
    expect(typeof res.body.expired_count).toBe('number');
    expect(res.body.expired_count).toBeGreaterThanOrEqual(0);
  });

  it('expires PENDING reservations past their expiry and releases held quantity', async () => {
    const itemRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Expiration Test Item', initial_quantity: 10 });
    const itemId = itemRes.body.id;

    // Create a reservation that holds 7 units
    const reservationRes = await supertest(app).post('/v1/reservations').send({
      item_id: itemId,
      customer_id: 'cust-expire',
      quantity: 7,
    });
    const reservationId = reservationRes.body.id;

    // Verify units are currently held
    const statusBefore = await supertest(app).get(`/v1/items/${itemId}`);
    expect(statusBefore.body.held_quantity).toBe(7);
    expect(statusBefore.body.available_quantity).toBe(3);

    // Force the reservation past its expiry by backdating expires_at
    await supabase
      .from('reservations')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', reservationId);

    // Run expiration
    const expireRes = await supertest(app).post('/v1/maintenance/expire-reservations');
    expect(expireRes.status).toBe(200);
    expect(expireRes.body.expired_count).toBeGreaterThanOrEqual(1);

    // Held units should now be released
    const statusAfter = await supertest(app).get(`/v1/items/${itemId}`);
    expect(statusAfter.body.held_quantity).toBe(0);
    expect(statusAfter.body.available_quantity).toBe(10);

    // Cleanup
    await supabase.from('reservations').delete().eq('item_id', itemId);
    await supabase.from('items').delete().eq('id', itemId);
  });
});
