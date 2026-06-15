import express from 'express';
import { getPolicy } from '../controllers/policyController.js';

const router = express.Router();

// GET /api/policies/:type - Fetch terms, privacy, or refunds policy
router.get('/:type', getPolicy);

export default router;
