const logger = require("../utils/logger");

const authenticateMiddleware = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn("Access  attempted without user ID");

    return res.status(401).json({
      success: false,
      message: "Unauthorized ! Please login again to continue",
    });
  }

  req.user = { userId };

  next();
};

module.exports = authenticateMiddleware;
