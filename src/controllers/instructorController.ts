import { Request, Response } from "express";
import mongoose from "mongoose";

import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";

type PopulatedStudent = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  profilePicture?: string;
};

type PopulatedCourse = {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
};

type PopulatedEnrollment = {
  _id: mongoose.Types.ObjectId;
  student: PopulatedStudent | null;
  course: PopulatedCourse | null;
  progress: number;
  status: "active" | "completed";
  enrolledAt: Date;
  completedLessons: mongoose.Types.ObjectId[];
};

export const getInstructorStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = String(res.locals.userId || "");
    const userRole = String(res.locals.userRole || "");

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
      return;
    }

    if (userRole !== "instructor" && userRole !== "admin") {
      res.status(403).json({
        success: false,
        message: "Only instructors and admins can view enrolled students.",
      });
      return;
    }

    // Instructors see only courses they own.
    // Admins can see enrolments across all courses.
    const courseFilter =
      userRole === "admin"
        ? {}
        : {
            instructorId: new mongoose.Types.ObjectId(userId),
          };

    const courses = await Course.find(courseFilter)
      .select("_id title slug")
      .lean();

    if (courses.length === 0) {
      res.status(200).json({
        success: true,
        message: "No courses were found for this instructor.",
        count: 0,
        data: [],
      });
      return;
    }

    const courseIds = courses.map((course) => course._id);

    const enrollmentDocuments = await Enrollment.find({
      course: { $in: courseIds },
    })
      .populate("student", "fullName email profilePicture")
      .populate("course", "title slug")
      .sort({ enrolledAt: -1 })
      .lean();

    const enrollments =
      enrollmentDocuments as unknown as PopulatedEnrollment[];

    const students = enrollments
      .filter(
        (enrollment) =>
          enrollment.student !== null && enrollment.course !== null
      )
      .map((enrollment) => {
        const student = enrollment.student!;
        const course = enrollment.course!;

        const progress = Math.min(
          100,
          Math.max(0, Number(enrollment.progress) || 0)
        );

        const isCompleted =
          enrollment.status === "completed" || progress >= 100;

        return {
          enrollmentId: enrollment._id.toString(),
          id: student._id.toString(),
          fullName: student.fullName || "Student",
          email: student.email || "",
          profilePicture: student.profilePicture || "",
          course: course.title || "Untitled course",
          courseSlug: course.slug || "",
          courseId: course._id.toString(),
          progress,
          status: isCompleted ? "Completed" : "In Progress",
          enrolledAt: enrollment.enrolledAt,
          completedLessons: Array.isArray(enrollment.completedLessons)
            ? enrollment.completedLessons.length
            : 0,
        };
      });

    res.status(200).json({
      success: true,
      message: "Enrolled students retrieved successfully.",
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Get instructor students error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrolled students.",
    });
  }
};