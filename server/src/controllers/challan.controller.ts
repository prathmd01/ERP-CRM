import { Request, Response, NextFunction } from 'express';
import { challanService, dashboardService } from '../services/challan.service';
import { sendSuccess } from '../utils/response';

export const challanController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await challanService.getAll(req.query as Record<string, string>);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await challanService.getById(String(req.params.id));
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await challanService.create(req.body, req.user!.userId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await challanService.confirm(String(req.params.id), req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await challanService.cancel(String(req.params.id));
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};

export const dashboardController = {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await dashboardService.getStats();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
