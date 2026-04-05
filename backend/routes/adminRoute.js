import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  getSettings,
  updateSetting,
  getAdminStats,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(protect, authorizeRoles("ADMIN"));

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Settings routes
router.get("/settings", getSettings);
router.put("/settings/:key", updateSetting);

// Admin dashboard stats
router.get("/stats", getAdminStats);

export default router;
