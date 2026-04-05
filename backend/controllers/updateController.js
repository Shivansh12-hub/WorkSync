import Update from "../models/updateModel.js";

export const createUpdate = async (req, res) => {
  try {
    const { description, hours, status } = req.body;
    const userId = req.user.id;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const existing = await Update.findOne({
      userId,
      date: { $gte: start, $lte: end },
    });

    if (existing) {
      return res.status(400).json({
        message: "Daily update already submitted",
      });
    }

    const update = await Update.create({
      userId,
      description,
      hours,
      status,
    });

    res.status(201).json(update);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyUpdates = async (req, res) => {
  try {
    const updates = await Update.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamUpdates = async (req, res) => {
  try {
    const updates = await Update.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};