const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// Connect to database

// CRITICAL CHECK: Only connect to the real database if not in the 'test' environment
if (process.env.NODE_ENV !== "test") {
  const DB = process.env.DATABASE;

  mongoose
    .connect(DB, {
      useNewUrlParser: true,
    })
    .then(() => {
      console.log("DB connection successful");
    });

  // Start the server only if we are not testing
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    process.env.NODE_ENV === "production"
      ? console.log(`Server running in production mode on port ${PORT}`)
      : console.log(`Server running in development mode on port ${PORT}`);
  });
} else {
  // Log message when running tests
  console.log(
    "Server setup complete, ready for testing (DB connection managed by Jest setup)."
  );
}

// Global process error handlers remain important
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Do NOT call process.exit(1) in a test environment unless strictly necessary
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
});
