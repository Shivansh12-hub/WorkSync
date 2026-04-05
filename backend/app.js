import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoute.js";
import updateRoutes from "./routes/updateRoute.js";
import feedbackRoutes from "./routes/feedbackRoute.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/updates", updateRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;
