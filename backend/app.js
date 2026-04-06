import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import securityHeaders from "./middleware/securityHeaders.middleware.js";
import requestLogger from "./middleware/requestLogger.middleware.js";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics.middleware.js";
import redisClient from "./utils/redisClient.js";

import authRoutes from "./routes/authRoute.js";
import updateRoutes from "./routes/updateRoute.js";
import feedbackRoutes from "./routes/feedbackRoute.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/adminRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/metrics", metricsHandler);

app.get("/readyz", async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const redisReady = redisClient.isOpen || !process.env.REDIS_URL;

  if (!dbReady || !redisReady) {
    return res.status(503).json({
      status: "not-ready",
      checks: {
        mongodb: dbReady,
        redis: redisReady,
      },
    });
  }

  return res.json({
    status: "ready",
    checks: {
      mongodb: true,
      redis: true,
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: mongoStatusMap[mongoStatus],
    mongooseVersion: mongoose.version,
  });
});

// Diagnostic endpoint for MongoDB
app.get("/health/db", async (req, res) => {
  try {
    const testDoc = await mongoose.connection.db.admin().ping();
    res.json({
      status: "ok",
      mongodb: "connected",
      ping: testDoc,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      mongodb: "disconnected",
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/updates", updateRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;
