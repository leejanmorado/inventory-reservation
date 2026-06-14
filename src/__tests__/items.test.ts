import supertest from 'supertest';
import app from '@/app';
import { supabase } from '@/db/client';

describe('Items API', () => {
  const itemIds: string[] = [];

  afterAll(async () => {
    if (itemIds.length) {
      await supabase.from('reservations').delete().in('item_id', itemIds);
      await supabase.from('items').delete().in('id', itemIds);
    }
  });

  it('POST /v1/items — creates an item and returns 201', async () => {
    const res = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Widget', initial_quantity: 10 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Widget', total_quantity: 10 });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    itemIds.push(res.body.id);
  });

  it('POST /v1/items — returns 400 for missing fields', async () => {
    const res = await supertest(app).post('/v1/items').send({});
    expect(res.status).toBe(400);
  });

  it('GET /v1/items/:id — returns item status with quantity breakdown', async () => {
    const createRes = await supertest(app)
      .post('/v1/items')
      .send({ name: 'Gadget', initial_quantity: 5 });
    const itemId = createRes.body.id;
    itemIds.push(itemId);

    const res = await supertest(app).get(`/v1/items/${itemId}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: itemId,
      name: 'Gadget',
      total_quantity: 5,
      available_quantity: 5,
      confirmed_quantity: 0,
      held_quantity: 0,
    });
  });

  it('GET /v1/items/:id — returns 404 for unknown item', async () => {
    const res = await supertest(app).get('/v1/items/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('item_not_found');
  });
});
