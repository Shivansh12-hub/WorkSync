import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoute.js";
import updateRoutes from "./routes/updateRoute.js";
import feedbackRoutes from "./routes/feedbackRoute.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/adminRoute.js";

const app = express();

app.use(cors());
app.use(express.json());

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

export default app;
