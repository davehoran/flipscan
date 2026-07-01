import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import stripeWebhookRouter from "./routes/stripeWebhook";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use("/api/webhooks", express.raw({ type: "application/json" }), stripeWebhookRouter);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// The browser reaches this API through the Vite dev/prod proxy (same origin),
// so cross-origin credentialed requests should be limited to an explicit
// allowlist rather than reflecting any origin. CORS_ALLOWED_ORIGINS is a
// comma-separated list; the Replit dev domain is always permitted.
const allowedOrigins = new Set(
  [
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? []),
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : undefined,
  ]
    .map((o) => o?.trim())
    .filter((o): o is string => Boolean(o)),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Same-origin / non-browser requests have no Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
