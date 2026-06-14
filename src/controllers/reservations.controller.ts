import type { NextFunction, Request, Response } from 'express';
import * as reservationsService from '@/services/reservations.service';

export async function createReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reservation = await reservationsService.createReservation(req.body);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
}

export async function confirmReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reservation = await reservationsService.confirmReservation(req.params.id as string);
    res.json(reservation);
  } catch (err) {
    next(err);
  }
}

export async function cancelReservation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reservation = await reservationsService.cancelReservation(req.params.id as string);
    res.json(reservation);
  } catch (err) {
    next(err);
  }
}
