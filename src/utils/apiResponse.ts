import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): Response => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    message,
  });
};