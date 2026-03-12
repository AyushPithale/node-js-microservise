require("dotenv").config();

const express = require("express");
const logger = require("./utils/logger");
const searchPosts = require("./routes/searchPostRoutes");
const { errorHandler } = require("./middleware/error-handler");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitMq");
const {
  handlePostCreatedEvent,
} = require("./event-handlers/search.EventHandler");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

connectDB();

const redisClient = new Redis(process.env.REDIS_URL);

const app = express();

app.use(cors());
app.use(helmet());

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

app.use(express.json());

app.use("/api/search", sensitiveRoutesRateLimiter);

app.use(
  "/api/search",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  searchPosts,
);

app.use(errorHandler);

const PORT = process.env.PORT || 3004;

async function startServer() {
  try {
    await connectRabbitMQ();

    await consumeEvent("post:created", handlePostCreatedEvent);

    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();

//  unhandled rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", promise, reason);
  process.exit(1);
});

module.exports = app;
