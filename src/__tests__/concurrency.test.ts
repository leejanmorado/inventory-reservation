import supertest from 'supertest';
import app from '@/app';
import { supabase } from '@/db/client';

describe('Concurrency — simultaneous reservations exceeding stock', () => {
  it('only one of two racing reservations succeeds when stock is exactly 5', async () => {
    const itemRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Concurrency Test Item', initial_quantity: 5 });
    const itemId = itemRes.body.id;

    // Fire both reservations simultaneously; each requests all 5 units
    const [res1, res2] = await Promise.all([
      supertest(app).post('/v1/reservations').send({
        item_id: itemId,
        customer_id: 'cust-race-1',
        quantity: 5,
      }),
      supertest(app).post('/v1/reservations').send({
        item_id: itemId,
        customer_id: 'cust-race-2',
        quantity: 5,
      }),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status === 409);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].body.error).toBe('insufficient_inventory');

    // Item should show all 5 held, none available
    const statusRes = await supertest(app).get(`/v1/items/${itemId}`);
    expect(statusRes.body.held_quantity).toBe(5);
    expect(statusRes.body.available_quantity).toBe(0);

    // Cleanup
    await supabase.from('reservations').delete().eq('item_id', itemId);
    await supabase.from('items').delete().eq('id', itemId);
  });
});
