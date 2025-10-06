const express = require("express");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middlewares

// Body parser middleware
app.use(express.json());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Auth Routes
app.use("/api/v1/notetaker");

//Global error handling middleware
app.use(errorHandler);

// Export the app
module.exports = app;
