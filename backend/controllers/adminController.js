import User from "../models/userModel.js";
import Settings from "../models/settingsModel.js";
import bcrypt from "bcrypt";

// Get all users with role filtering
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter).select("-password").sort("-createdAt");

    res.json({
      message: "Users retrieved successfully",
      count: users.length,
      users,
    });
  }
  catch (error) {
    console.error("[ADMIN] Get users error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get single user
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("[ADMIN] Get user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update user role/status
export const updateUser = async (req, res) => {
  try {
    const { role, name } = req.body;
    const userId = req.params.id;

    // Prevent admin from changing their own role
    if (userId === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (name) updateData.name = name;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[ADMIN] Updated user ${userId}: ${JSON.stringify(updateData)}`);
    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("[ADMIN] Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting self
    if (userId === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[ADMIN] Deleted user ${userId}`);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[ADMIN] Delete user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create user 
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "EMPLOYEE",
    });

    console.log(`[ADMIN] Created user ${user._id}`);
    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[ADMIN] Create user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.find();

    // If no settings exist, create defaults
    if (settings.length === 0) {
      const defaults = [
        {
          key: "max_daily_updates",
          value: 5,
          type: "number",
          description: "Maximum daily updates per employee",
        },
        {
          key: "min_update_hours",
          value: 0.5,
          type: "number",
          description: "Minimum hours per update",
        },
        {
          key: "max_update_hours",
          value: 12,
          type: "number",
          description: "Maximum hours per update",
        },
        {
          key: "feedback_required",
          value: true,
          type: "boolean",
          description: "Require manager feedback on updates",
        },
        {
          key: "auto_archive_days",
          value: 30,
          type: "number",
          description: "Auto-archive updates after N days",
        },
      ];

      await Settings.insertMany(defaults);
      return res.json({
        message: "Default settings created",
        settings: defaults,
      });
    }

    res.json({
      message: "Settings retrieved successfully",
      settings,
    });
  } catch (error) {
    console.error("[ADMIN] Get settings error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update setting
export const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    console.log(`[ADMIN] Updated setting ${key} to ${value}`);
    res.json({
      message: "Setting updated successfully",
      setting,
    });
  } catch (error) {
    console.error("[ADMIN] Update setting error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get dashboard stats for admin
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const employeeCount = await User.countDocuments({ role: "EMPLOYEE" });
    const managerCount = await User.countDocuments({ role: "MANAGER" });
    const adminCount = await User.countDocuments({ role: "ADMIN" });

    const stats = {
      totalUsers,
      employeeCount,
      managerCount,
      adminCount,
      roles: {
        EMPLOYEE: employeeCount,
        MANAGER: managerCount,
        ADMIN: adminCount,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("[ADMIN] Get stats error:", error);
    res.status(500).json({ message: error.message });
  }
};
