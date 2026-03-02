const express = require("express");
const multer = require("multer");
const { uploadMedia } = require("../controllers/mediaController");
const authenticateMiddleware = require("../middleware/auth-middleware");
const logger = require("../utils/logger");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
}).single("file");

router.post(
  "/upload",
  authenticateMiddleware,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof MulterError) {
        logger.error("Multer error", err);
        return res.status(400).json({
          success: false,
          message: "File upload failed",
          error: err.message,
          stack: err.stack,
        });
      }
      if (err) {
        logger.error("File upload failed", err);
        return res.status(500).json({
          success: false,
          message: "File upload failed",
          error: err.message,
          stack: err.stack,
        });
      }

      if (!req.file) {
        logger.info("No file found", req.file);
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }
      next();
    });
  },
  uploadMedia,
);

module.exports = router;
