import { supabase } from '@/db/client';
import { DatabaseError } from '@/errors';
import type { ItemDto, ItemStatusDto } from '@/types/items.type';

export async function createItem(name: string, totalQuantity: number): Promise<ItemDto> {
  const { data, error } = await supabase
    .from('items')
    .insert({ name, total_quantity: totalQuantity })
    .select('id, name, total_quantity, created_at')
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

export async function getItemById(id: string): Promise<ItemDto | null> {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, total_quantity, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  return data;
}

export async function getItemStatus(id: string): Promise<ItemStatusDto | null> {
  const { data, error } = await supabase.rpc('get_item_status', { p_item_id: id });

  if (error) throw new DatabaseError(error.message);

  if (!data || data.length === 0) return null;

  return data[0];
}
