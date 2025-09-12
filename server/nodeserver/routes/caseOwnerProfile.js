import express from "express";
import { requireAuth } from "@clerk/express";
import { getCaseOwnerProfile } from "../controllers/caseOwnerProfile.js";

const router = express.Router();

// GET /api/caseOwnerProfile?caseOwner=clerk_123
// Police-only access to view case owner profiles
router.get("/caseOwnerProfile", requireAuth(), getCaseOwnerProfile);

export default router;
