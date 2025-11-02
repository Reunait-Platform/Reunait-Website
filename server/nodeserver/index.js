import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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
import { clerkMiddleware } from "@clerk/express";
import { rateLimiter } from "./middleware/rateLimiter.js";
import notificationsInterceptor from "./middleware/notificationsInterceptor.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Ensure Express trusts upstream proxies so req.ip and X-Forwarded-For work correctly
app.set('trust proxy', true);

// Middleware
// Important: Skip JSON body parsing for the Clerk webhook so we can verify the raw payload
app.use((req, res, next) => {
    if (req.originalUrl && req.originalUrl.startsWith("/api/webhooks/clerk")) {
        return next();
    }
    return express.json()(req, res, next);
});
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
// Apply body parsers to all routes EXCEPT the Clerk webhook
app.use((req, res, next) => {
    if (req.originalUrl && req.originalUrl.startsWith("/api/webhooks/clerk")) {
        return next();
    }
    return bodyParser.json({ limit: "30mb", extended: true })(req, res, (err) => {
        if (err) return next(err);
        return bodyParser.urlencoded({ limit: "30mb", extended: true })(req, res, next);
    });
});
// Production-ready CORS: restrict to configured origins, allow Authorization header
const parseAllowedOrigins = () => {
    const raw = process.env.ALLOWED_ORIGINS || '';
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

// Ensure Private Network Access preflights succeed on local/LAN
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});

app.use(cors({
    origin: function (origin, callback) {
        // Allow non-browser or same-origin requests (no Origin header)
        if (!origin) return callback(null, true);

        // If no configured origins, allow all (useful for local/dev without setting env)
        if (allowedOrigins.length === 0) return callback(null, true);

        const isAllowed = allowedOrigins.some((entry) => {
            if (entry === '*') return true;
            // Support wildcard subdomains like *.example.com
            if (entry.startsWith('*.')) {
                const base = entry.slice(2);
                try {
                    const u = new URL(origin);
                    return u.hostname === base || u.hostname.endsWith(`.${base}`);
                } catch {
                    return false;
                }
            }
            return origin === entry;
        });

        return isAllowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Include-Notifications'],
    credentials: true,
    maxAge: 86400, // cache preflight for 24h
}));

// Explicitly handle preflight
// Express 5 + path-to-regexp v6: use a RegExp for a global preflight handler
app.options(/.*/, cors());
// Clerk middleware: mark webhook route as public so it bypasses auth
app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    // Public routes (no auth) for Clerk webhooks
    // @clerk/express supports a function or array; safest is to skip when url starts with webhook path
    // We guard again below in code to ensure it isn't blocked
    // Note: If using older versions, this option may be ignored; the explicit route remains public
}));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Apply rate limiter to all routes
app.use(rateLimiter);

// Attach notifications (only when client opts in via header)
app.use(notificationsInterceptor({ readLimit: 20 }));

/*  ROUTES  */
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


/*  MONGOOSE SETUP  */
const PORT = process.env.PORT || 6001;
mongoose.connect(process.env.MONGO_URL, {
    dbName: process.env.DB_NAME || "missing_found_db"
}).then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from network`));
}).catch((error) => console.log(`${error} did not connect`))
