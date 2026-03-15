require("dns").setServers(["8.8.8.8", "1.1.1.1"])
require("dotenv").config();
const logger = require("./utils/logger");
const express = require("express");
const mongoose = require("mongoose");
const { errorHandler } = require("./middleware/error-handler");
const app = express();
const PORT = process.env.PORT || 3003;
const helmet = require("helmet");
const cors = require("cors");
const Redis = require("ioredis");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const mediaRoutes = require("./routes/mediaRoutes");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

mongoose
  .connect(process.env.MONGODB_URI, {
    family: 4,
  })
  .then(() => {
    logger.info("MongoDB connected");
  })
  .catch((error) => {
    logger.error("MongoDB connection error", error);
  });

app.use(cors());
app.use(helmet());
app.use(express.json());

const redisClient = new Redis(process.env.REDIS_URL);

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

app.use("/api/media", sensitiveRoutesRateLimiter);
app.use(
  "/api/media",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  mediaRoutes,
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();

    // consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
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
