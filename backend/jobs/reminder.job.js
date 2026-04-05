import cron from "node-cron";

const startReminderJob = () => {
  cron.schedule("0 18 * * *", async () => {
    console.log("Reminder: submit your daily update");
  });
};

export default startReminderJob;