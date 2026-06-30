import 'dotenv/config';
import './instrument.js';
import * as Sentry from "@sentry/node";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./routes/auth.js"
import casesRoutes from "./routes/cases.js"
import findMatchesRoutes from "./routes/find-matches.js"
import userAuthRoutes from "./routes/user-auth.js"
import reportRoutes from "./routes/report.js"
import caseOwnerProfileRoutes from "./routes/caseOwnerProfile.js"
import homepageRoutes from "./routes/homepage.js"
import testimonialRoutes from "./routes/testimonial.js"
import volunteerRoutes from "./routes/volunteer.js"
import notificationsRoutes from "./routes/notifications.js"
import policeStationsRoutes from "./routes/police-stations.js"
import supportRoutes from "./routes/support.js"
import healthRoutes from "./routes/health.js"
import policiesRoutes from "./routes/policies.js"
import { clerkMiddleware } from "@clerk/express";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { skipJsonForWebhooks, bodyParserMiddleware } from "./middleware/bodyParser.js";
import { corsMiddleware, privateNetworkAccess } from "./middleware/cors.js";
import { startServer } from "./lib/server.js";
import fs from 'fs';

const app = express();

// Ensure Express trusts upstream proxies so req.ip and X-Forwarded-For work correctly
app.set('trust proxy', true);

/*  MIDDLEWARE  */
// Skip JSON body parsing for webhooks so we can verify the raw payload
app.use(skipJsonForWebhooks);
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
// Apply body parsers to all routes EXCEPT webhooks (need raw body for signature verification)
app.use(bodyParserMiddleware);

// CORS configuration
app.use(privateNetworkAccess);
app.use(corsMiddleware);
// Explicitly handle preflight
app.options(/.*/, cors());
// Clerk middleware: bypass middleware completely for payment callbacks/webhooks and policy routes to prevent redirect loops
const EXCLUDED_CLERK_ROUTES = [
    '/api/webhooks/clerk',
    '/api/support/webhook',
    '/api/support/callback',
];

app.use((req, res, next) => {
    if (EXCLUDED_CLERK_ROUTES.includes(req.path) || req.path.startsWith('/api/policies')) {
        return next();
    }
    return clerkMiddleware({
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
    })(req, res, next);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Apply rate limiter to all routes
app.use(rateLimiter);

/*  ROUTES  */
// Health check endpoint (before other routes for faster response)
app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/cases", casesRoutes);
app.use("/api", findMatchesRoutes);
app.use("/api", userAuthRoutes);
app.use("/api", reportRoutes);
app.use("/api", caseOwnerProfileRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api", notificationsRoutes);
app.use("/api/police-stations", policeStationsRoutes);
app.use("/api", supportRoutes);
app.use("/api/policies", policiesRoutes);

// Custom error handler for CORS violations (placed before Sentry to prevent noise in dashboard)
app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation: Origin not allowed.'
        });
    }
    next(err);
});

// Sentry error handler must be registered after all controllers/routes and before other error handlers
Sentry.setupExpressErrorHandler(app);

/*  START SERVER  */
const PORT = process.env.PORT || 6001;

startServer(app, PORT).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
