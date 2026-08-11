import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';
import { sendSuccess } from '../utils/response';

export const customerController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.getAll(req.query as Record<string, string>);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.getById(String(req.params.id));
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.create(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.update(String(req.params.id), req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await customerService.delete(String(req.params.id));
      sendSuccess(res, { message: 'Customer deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};
