const logger = require("../utils/logger");
const { uploadMediaCloudinary } = require("../utils/cloudinary");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const Media = require("../models/media");

const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  // logger.info("File details", file);
  if (!file)
    throw new APIError({ success: false, message: "No file uploaded" }, 400);

  const { originalname, mimetype, buffer } = req.file;
  const userId = req.user.userId;

  logger.info("File details", { originalname, mimetype, userId });

  const uploadResult = await uploadMediaCloudinary(file);

  if (!uploadResult) throw new APIError("Failed to upload media", 500);
  // console.log("uploadResult", uploadResult);
  logger.info("Media uploaded successfully", uploadResult.public_id);

  const newMedia = await Media.create({
    publicId: uploadResult.public_id,
    url: uploadResult.secure_url,
    originalname,
    mimetype,
    userId,
  });

  console.log("newMedia", newMedia);
  if (!newMedia) throw new APIError("Failed to create media", 500);

  logger.info("Media created successfully", newMedia.publicId);

  res.status(201).json({
    success: true,
    message: "Media uploaded successfully",
    mediaID: newMedia.publicId,
    url: newMedia.url,
  });
});

const getAllMedias = asyncHandler(async (req, res) => {
  const result = await Media.find({});
  res.status(200).json({
    success: true,
    message: "Medias fetched successfully",
    data: result,
  });
});

module.exports = { uploadMedia, getAllMedias };
