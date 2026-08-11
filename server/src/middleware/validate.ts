import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(source === 'body' ? req.body : req.query);
      if (source === 'body') {
        req.body = parsed;
      } else {
        req.query = parsed as typeof req.query;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
