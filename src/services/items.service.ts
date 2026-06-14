import { ItemNotFoundError } from '@/errors';
import * as itemsRepo from '@/repositories/items.repository';
import type { CreateItemDto, ItemDto, ItemStatusDto } from '@/types/items.type';

export async function createItem(dto: CreateItemDto): Promise<ItemDto> {
  return itemsRepo.createItem(dto.name, dto.initial_quantity);
}

export async function getItemStatus(id: string): Promise<ItemStatusDto> {
  const status = await itemsRepo.getItemStatus(id);
  if (!status) throw new ItemNotFoundError();
  return status;
}
