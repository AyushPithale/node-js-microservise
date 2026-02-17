const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log(token);
  if (!token) {
    logger.warn("Access attempt without token");
    return res
      .status(401)
      .json({ message: "Unauthorized ! Please login again to continue" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token!");
      return res.status(429).json({
        message: "Invalid token!",
        success: false,
      });
    }
    req.user = user;
    next();
  });
};

module.exports = { validateToken };
