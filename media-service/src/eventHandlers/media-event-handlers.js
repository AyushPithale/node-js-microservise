const logger = require("../utils/logger");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const Media = require("../models/media");
const { deleteMediaCloudinary } = require("../utils/cloudinary");

const handlePostDeleted = asyncHandler(async (event) => {
  logger.info("Post deleted event received", event);

  const { postId, mediaIds } = event;
  const mediaToDelete = await Media.find({ publicId: { $in: mediaIds } });

  if (!mediaToDelete) {
    logger.warn("No media found for deletion", mediaIds);
    return;
  }

  for (const media of mediaToDelete) {
    await deleteMediaCloudinary(media.publicId);
    await Media.findByIdAndDelete(media._id);
    logger.info(
      `Media deleted successfully ${media.publicId} assoisted with ${postId}`,
    );
  }

  logger.info(
    `All media deleted successfully ${mediaToDelete.length} assoisted with ${postId}`,
  );
});

module.exports = {
  handlePostDeleted,
};
