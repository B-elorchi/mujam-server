import { Router } from 'express';
import { blogController } from '../controllers/blog.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, blogController.getPosts);
router.get('/categories', blogController.getCategories);
router.get('/:slug', optionalAuth, blogController.getPost);

export default router;