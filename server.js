const app = require("./app");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// Connect to database

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("DB connection successful");
  });

// start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  process.env.NODE_ENV === "production"
    ? console.log(`Server running in production mode on port ${PORT}`)
    : console.log(`Server running in development mode on port ${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});
