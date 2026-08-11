import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { JwtPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    next();
  };
};

export const authorizeAdmin = authorize(Role.ADMIN);
export const authorizeSales = authorize(Role.ADMIN, Role.SALES);
export const authorizeWarehouse = authorize(Role.ADMIN, Role.WAREHOUSE);
export const authorizeAccounts = authorize(Role.ADMIN, Role.ACCOUNTS);
export const authorizeSalesOrAccounts = authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS);
export const authorizeWarehouseOrSales = authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES);
export const authorizeAllRoles = authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS);
