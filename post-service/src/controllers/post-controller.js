const logger = require("../utils/logger");
const Post = require("../models/Post");
const { asyncHandler, APIError } = require("../middleware/error-handler");

const CreatePost = asyncHandler(async (req, res, next) => {
  const { content, mediaIds } = req.body;

  const newPost = await Post.create({
    user: req.user.userId,
    content,
    mediaIds: mediaIds || [],
  });

  if (!newPost) {
    return next(new APIError("Post not created", 400));
  }
  logger.info("Post created successfully", newPost);
  res.status(201).json({
    success: true,
    message: "Post created successfully",
  });
});

const deletePost = asyncHandler(async (req, res, next) => {});

module.exports = { CreatePost, deletePost };
