import { Router } from "express";

import { getInstructorStudents } from "../controllers/instructorController.js";
import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/instructor/students
router.get(
  "/students",
  protect,
  authorize("instructor", "admin"),
  getInstructorStudents
);

export default router;