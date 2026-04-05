import cron from "node-cron";
import Update from "../models/updateModel.js";
import Settings from "../models/settingsModel.js";

const startAutoArchiveJob = () => {
  // Run daily at 01:00 AM server time.
  cron.schedule("0 1 * * *", async () => {
    try {
      const setting = await Settings.findOne({ key: "auto_archive_days" }).lean();
      const archiveDays = Number(setting?.value ?? 30);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - archiveDays);

      const result = await Update.updateMany(
        {
          archived: false,
          createdAt: { $lt: cutoff },
        },
        {
          $set: {
            archived: true,
            archivedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[AUTO-ARCHIVE] Archived ${result.modifiedCount} updates older than ${archiveDays} days`);
      }
    } catch (error) {
      console.error("[AUTO-ARCHIVE] Job failed:", error.message);
    }
  });
};

export default startAutoArchiveJob;
