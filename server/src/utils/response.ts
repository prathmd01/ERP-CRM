import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): void => {
  const response: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string, statusCode = 400): void => {
  const response: ApiResponse = { success: false, message };
  res.status(statusCode).json(response);
};

export const getPagination = (page?: string, limit?: string) => {
  const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '10', 10) || 10));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

export const generateChallanNumber = (): string => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `CH-${datePart}-${randomPart}`;
};
