import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '@/errors';

const REQUEST_PROPERTIES = ['body', 'query', 'params'] as const;
type RequestProperty = (typeof REQUEST_PROPERTIES)[number];

export function validate(schemas: Partial<Record<RequestProperty, ZodType>>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const prop of REQUEST_PROPERTIES) {
      const schema = schemas[prop];
      if (!schema) continue;
      const result = schema.safeParse(req[prop]);
      if (!result.success) {
        next(new ValidationError());
        return;
      }
      Object.assign(req, { [prop]: result.data });
    }
    next();
  };
}
