
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import InstructorApplication from "../models/InstructorApplication.js";
import User from "../models/User.js";

// PUBLIC: Submit an instructor application
export const submitInstructorApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Full name, email and password are required.",
      });
      return;
    }

    const cleanName = String(fullName).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanName.length < 2) {
      res.status(400).json({
        success: false,
        message: "Please enter your full name.",
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (String(password).length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
      return;
    }

    // An existing account cannot apply again using the same email.
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          "An account already exists with this email address. Please log in instead.",
      });
      return;
    }

    const existingApplication =
      await InstructorApplication.findOne({
        email: cleanEmail,
        status: "pending",
      });

    if (existingApplication) {
      res.status(409).json({
        success: false,
        message:
          "You already have a pending instructor application.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    await InstructorApplication.create({
      fullName: cleanName,
      email: cleanEmail,
      passwordHash,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message:
        "Your instructor application has been submitted successfully. Please wait for admin approval.",
    });
  } catch (error: unknown) {
    // Handles a duplicate pending application caused by
    // simultaneous requests.
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message:
          "You already have a pending instructor application.",
      });
      return;
    }

    console.error("Submit instructor application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit your application.",
    });
  }
};

// ADMIN: Get all instructor applications
export const getInstructorApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const applications = await InstructorApplication.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get instructor applications error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch instructor applications.",
    });
  }
};

// ADMIN: Approve an instructor application
export const approveInstructorApplication = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
      return;
    }

    const application = await InstructorApplication.findById(id)
      .select("+passwordHash");

    if (!application) {
      res.status(404).json({
        success: false,
        message: "Instructor application not found.",
      });
      return;
    }

    if (application.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `This application has already been ${application.status}.`,
      });
      return;
    }

    const existingUser = await User.findOne({
      email: application.email,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          "A user account already exists with this email. Resolve the duplicate before approving this application.",
      });
      return;
    }

    // The password is already hashed. Do not hash it again.
    const instructor = await User.create({
      fullName: application.fullName,
      email: application.email,
      password: application.passwordHash,
      role: "instructor",
      isActive: true,
      isVerified: false,
    });

    application.status = "approved";
    application.reviewedAt = new Date();

    await application.save();

    res.status(200).json({
      success: true,
      message:
        "Instructor application approved. The instructor can now log in.",
      instructor: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        role: instructor.role,
      },
    });
  } catch (error) {
    console.error("Approve instructor application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to approve instructor application.",
    });
  }
};

// ADMIN: Reject an instructor application
export const rejectInstructorApplication = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
      return;
    }

    const application = await InstructorApplication.findOne({
      _id: id,
      status: "pending",
    });

    if (!application) {
      res.status(404).json({
        success: false,
        message:
          "Pending instructor application not found.",
      });
      return;
    }

    application.status = "rejected";
    application.reviewedAt = new Date();
    application.rejectionReason =
      typeof reason === "string" ? reason.trim() : "";

    await application.save();

    res.status(200).json({
      success: true,
      message: "Instructor application rejected.",
    });
  } catch (error) {
    console.error("Reject instructor application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reject instructor application.",
    });
  }
};
