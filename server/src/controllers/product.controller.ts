import { Request, Response, NextFunction } from 'express';
import { productService, inventoryService } from '../services/product.service';
import { sendSuccess } from '../utils/response';

export const productController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.getAll(req.query as Record<string, string>);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.getById(String(req.params.id));
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.create(req.body, req.user!.userId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.update(String(req.params.id), req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};

export const inventoryController = {
  async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getInventory(req.query as Record<string, string>);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getMovements(req.query as Record<string, string>);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async createMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.createMovement(req.body, req.user!.userId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  },
};
