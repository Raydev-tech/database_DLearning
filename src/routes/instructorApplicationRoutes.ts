
import { Router } from "express";

import {
  submitInstructorApplication,
  getInstructorApplications,
  approveInstructorApplication,
  rejectInstructorApplication,
} from "../controllers/instructorApplicationController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = Router();

// Public application submission
router.post("/", submitInstructorApplication);

// Admin-only application management
router.get(
  "/",
  protect,
  authorize("admin"),
  getInstructorApplications
);

router.patch(
  "/:id/approve",
  protect,
  authorize("admin"),
  approveInstructorApplication
);

router.patch(
  "/:id/reject",
  protect,
  authorize("admin"),
  rejectInstructorApplication
);

export default router;
