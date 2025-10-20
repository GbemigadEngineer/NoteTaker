const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const noteRoutes = require("./routes/noteRoutes");
const path = require("path");
const app = express();


// Middlewares

// Body parser middleware
app.use(express.json());

// 1. Serve static files (Crucial for Development Only)
// This makes uploaded files (like images) publicly accessible via a URL.
if (process.env.NODE_ENV === "development") {
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  // Example access: http://localhost:3000/uploads/attachments-12345.png
}

// Logging middleware
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Auth Routes
app.use("/api/v1/notetaker", noteRoutes);

//Global error handling middleware
app.use(errorHandler);

// Export the app
module.exports = app;
