import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import connectDB from "./config/db.js";
import startReminderJob from "./jobs/reminder.job.js";
import startAutoArchiveJob from "./jobs/autoArchive.job.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localEnvPath = path.resolve(__dirname, ".env");
const rootEnvPath = path.resolve(__dirname, "..", ".env");

const localEnv = dotenv.config({ path: localEnvPath });
if (localEnv.error) {
  dotenv.config({ path: rootEnvPath });
}

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  startReminderJob();
  startAutoArchiveJob();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Server startup failed:", error.message);
  process.exit(1);
}
