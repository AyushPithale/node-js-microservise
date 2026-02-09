require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger");
const { errorHandler } = require("./Middleware/errorHandler");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const proxy = require("express-http-proxy");
const app = express();
const PORT = process.env.PORT || 3000;
const test = "test";
const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} ${req.url}`);
  logger.info(`Request body ${JSON.stringify(req.body)}`);
  next();
});

// ip based rate limiting
const rateLimiter = rateLimit({
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

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error("Proxy error", err);
    res.status(500).json({ message: "Internal server error" });
  },
};

app.use(rateLimiter);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
  logger.info(`API Gateway running on port ${process.env.PORT}`);
});
