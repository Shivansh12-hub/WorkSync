import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localEnvPath = path.resolve(__dirname, ".env");
const rootEnvPath = path.resolve(__dirname, "..", ".env");

const localEnv = dotenv.config({ path: localEnvPath });
if (localEnv.error) {
  dotenv.config({ path: rootEnvPath });
}

const [
  { default: app },
  { default: connectDB },
  { default: logger },
  { default: startReminderJob },
  { default: startAutoArchiveJob },
  { startMissedUpdateAlertJob },
  { startBlockedTaskReminderJob },
  { startNotificationDeliveryJob },
] = await Promise.all([
  import("./app.js"),
  import("./config/db.js"),
  import("./utils/logger.js"),
  import("./jobs/reminder.job.js"),
  import("./jobs/autoArchive.job.js"),
  import("./jobs/missedUpdateAlert.job.js"),
  import("./jobs/blockedTaskReminder.job.js"),
  import("./jobs/notificationDelivery.job.js"),
]);

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  startReminderJob();
  startAutoArchiveJob();
  startMissedUpdateAlertJob();
  startBlockedTaskReminderJob();
  startNotificationDeliveryJob();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Server started");
  });
} catch (error) {
  logger.error({ err: error }, "Server startup failed");
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});
