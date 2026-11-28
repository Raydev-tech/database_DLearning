
import mongoose, { Schema, Document } from "mongoose";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface IInstructorApplication extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  status: ApplicationStatus;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const instructorApplicationSchema =
  new Schema<IInstructorApplication>(
    {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      passwordHash: {
        type: String,
        required: true,
        select: false,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      reviewedAt: {
        type: Date,
      },
      rejectionReason: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

// Prevent multiple pending applications for the same email.
instructorApplicationSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
  }
);

const InstructorApplication =
  mongoose.models.InstructorApplication ||
  mongoose.model<IInstructorApplication>(
    "InstructorApplication",
    instructorApplicationSchema
  );

export default InstructorApplication;
