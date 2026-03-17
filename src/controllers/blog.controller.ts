import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

export const blogController = {
  getPosts: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page, limit, offset } = getPagination(req.query.page as string, req.query.limit as string);
      const category = req.query.category as string;

      const where: any = { status: 'PUBLISHED' };
      if (category) where.category = category;

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverColor: true,
            category: true,
            tags: true,
            readingTime: true,
            views: true,
            publishedAt: true,
          },
        }),
        prisma.blogPost.count({ where }),
      ]);

      return successResponse(res, {
        posts,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Get posts error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getCategories: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const categories = await prisma.blogPost.groupBy({
        by: ['category'],
        where: { status: 'PUBLISHED' },
        _count: { category: true },
      });

      return successResponse(res, categories.map((c) => ({ name: c.category, count: c._count.category })));
    } catch (error) {
      console.error('Get categories error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getPost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { slug } = req.params;

      const post = await prisma.blogPost.findUnique({
        where: { slug },
      });

      if (!post || post.status !== 'PUBLISHED') {
        return errorResponse(res, 'Post not found', 404);
      }

      await prisma.blogPost.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      });

      const wordCount = post.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      return successResponse(res, {
        ...post,
        readingTime,
      });
    } catch (error) {
      console.error('Get post error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};