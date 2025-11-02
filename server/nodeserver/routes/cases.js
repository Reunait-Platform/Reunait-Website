import express from "express";
import { requireAuth } from "@clerk/express";
import { getCases } from "../controllers/getCases.js";
import { getCaseById } from "../controllers/getCaseById.js";
import { updateCaseStatus } from "../controllers/updateCaseStatus.js";
import { flagCase } from "../controllers/flagCase.js";

const router = express.Router();

// GET /cases - Fetch cases with pagination and filters (public)
router.get("/", getCases);
// PUT /cases/:id/status - Update case status (authenticated)
router.put("/:id/status", requireAuth(), updateCaseStatus);
// POST /cases/:id/flag - Flag a case (authenticated)
router.post("/:id/flag", requireAuth(), flagCase);
// GET /cases/:id - Fetch single case (public) - MUST come after more specific routes
router.get("/:id", getCaseById);

export default router;
