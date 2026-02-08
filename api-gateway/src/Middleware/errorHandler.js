const logger = require("../utils/logger");

class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.name = "APIError";
  }
}

// async handler
const asyncHandler = (fun) => (req, res, next) => {
  Promise.resolve(fun(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  logger.error(err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({ success: false, message: err.message });
};

module.exports = { APIError, asyncHandler, errorHandler };
