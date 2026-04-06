import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import {
  createUpdate,
  getMyUpdates,
  getTeamUpdates,
  getTeamEmployees,
  editUpdate,
} from "../controllers/updateController.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("EMPLOYEE"), createUpdate);
router.get("/me", protect, getMyUpdates);
router.get("/employees", protect, authorizeRoles("MANAGER", "ADMIN"), getTeamEmployees);
router.get(
  "/team",
  protect,
  authorizeRoles("MANAGER", "ADMIN"),
  getTeamUpdates
);
router.put("/:id", protect, authorizeRoles("EMPLOYEE"), editUpdate);

export default router;