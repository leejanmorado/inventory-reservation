import type { NextFunction, Request, Response } from 'express';
import * as reservationsService from '@/services/reservations.service';

export async function expireReservations(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reservationsService.expireReservations();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
