import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Update from "../models/updateModel.js";
import Settings from "../models/settingsModel.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.PERF_LOGIN_EMAIL;
  const user = await User.findOne({ email }).select("_id name email role").lean();
  const settings = await Settings.find({
    key: { $in: ["feedback_required", "max_daily_updates"] },
  })
    .select("key value")
    .lean();

  let recentUpdates = [];
  if (user?._id) {
    recentUpdates = await Update.find({ userId: user._id, archived: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id status description createdAt")
      .lean();
  }

  console.log(
    JSON.stringify(
      {
        user,
        settings,
        recentUpdates,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
