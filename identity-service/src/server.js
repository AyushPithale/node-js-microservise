require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const logger = require("./utils/logger");
const identityServiceRoutes = require("./routes/identity-service");
const { errorHandler } = require("./middleware/error-handler");
const Redis = require("ioredis");
const rateLimit = require("express-rate-limit");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { RedisStore } = require("rate-limit-redis");
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info("MongoDB connected");
  })
  .catch((error) => {
    logger.error("MongoDB connection error", error);
  });

const redisClient = new Redis(process.env.REDIS_URL);

///////////////////////////
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} ${req.url}`);
  logger.info(`Request body ${JSON.stringify(req.body)}`);
  next();
});

// DDOS protection // rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 100, // max number of request user can send from perticular ip
  duration: 1, // in 60 seconds
});

// redis rate limiting
app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ message: "Too many requests" });
    });
});

// ip based rate limiting
const sensitiveRoutesRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

/// apply this limiter to routes
app.use("/api/auth/register", sensitiveRoutesRateLimiter);

// Routes
app.use("/api/auth", identityServiceRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

//  unhandled rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", promise, reason);
  process.exit(1);
});

module.exports = app;
