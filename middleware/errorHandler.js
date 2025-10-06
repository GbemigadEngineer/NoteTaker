module.exports = function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    // Detialed error for development
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  } else {
    // Clean error message for production
    // Also check if error is an operational error
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Programming or unknown error
      console.error("ERROR: ", err);
      res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
      });
    }
  }
};
