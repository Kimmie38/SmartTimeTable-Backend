const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Handle common mongoose errors more clearly
  let message = err.message;

  if (err.name === "CastError") {
    message = "Resource not found";
  }
  if (err.code === 11000) {
    // Duplicate key error (e.g. matric number already registered)
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }
  if (err.name === "ValidationError") {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
