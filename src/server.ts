import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://decent-learning.vercel.app",
  "https://instructor-decent.vercel.app",
];

// ==========================================
// CORS CONFIGURATION
// ==========================================

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked this origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==========================================
// BODY PARSERS
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/student", dashboardRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/instructor", instructorRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Decent Learning API 🚀",
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("API Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
);

// ==========================================
// MONGODB CONNECTION & SERVER STARTUP
// ==========================================

const startServer = async (): Promise<void> => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI || MONGODB_URI.trim() === "") {
      throw new Error(
        "MONGODB_URI is missing from environment variables"
      );
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Decent Learning API running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

void startServer();

export default app;