const logger = require("../utils/logger");
const { uploadMediaCloudinary } = require("../utils/cloudinary");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const Media = require("../models/media");

const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file)
    throw new APIError({ success: false, message: "No file uploaded" }, 400);

  const { originalName, mineType, buffer } = req.file;
  const userId = req.user.userId;

  logger.info("File details", { originalName, mineType, buffer, userId });

  const uploadResult = await uploadMediaCloudinary(file);

  if (!uploadResult) throw new APIError("Failed to upload media", 500);

  logger.info("Media uploaded successfully", uploadResult.public_id);

  const newMedia = await Media.create({
    public_id: uploadResult.public_id,
    url: uploadResult.secure_url,
    originalName,
    mineType,
    userId,
  });

  if (!newMedia) throw new APIError("Failed to create media", 500);

  logger.info("Media created successfully", newMedia.public_id);

  res.status(201).json({
    success: true,
    message: "Media uploaded successfully",
    newMedia,
  });
});

module.exports = { uploadMedia };
