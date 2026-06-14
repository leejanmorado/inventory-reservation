import type { NextFunction, Request, Response } from 'express';
import * as itemsService from '@/services/items.service';

export async function createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await itemsService.createItem(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function getItemStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await itemsService.getItemStatus(req.params.id as string);
    res.json(status);
  } catch (err) {
    next(err);
  }
}
