import "dotenv/config";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  debug: false,
  release: process.env.SENTRY_RELEASE || "reunite-backend@1.0.0",
  environment: process.env.NODE_ENV || "development",
  ignoreErrors: [
    'Not allowed by CORS',
  ],
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Send structured logs to Sentry
  enableLogs: true,
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling
  profileSessionSampleRate: 1.0,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: "trace",
});
