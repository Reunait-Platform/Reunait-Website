import express from "express";
import { registerCase } from "../controllers/registerCase.js";
import { requireAuth } from "@clerk/express";
import multer from "multer";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Only register case endpoint - authentication handled by Clerk
router.post("/registerCase", requireAuth(), upload.array('images', 2), registerCase);

export default router;