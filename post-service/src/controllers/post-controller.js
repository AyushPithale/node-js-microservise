const logger = require("../utils/logger");
const Post = require("../models/Post");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const { validatePost } = require("../utils/validation");

const CreatePost = asyncHandler(async (req, res) => {
  const { content, mediaIds } = req.body;

  const { error, value } = validatePost({ content, mediaIds });
  if (error) {
    throw new APIError(error.details[0].message, 400);
  }

  const newPost = await Post.create({
    user: req.user.userId,
    content: value.content,
    mediaIds: value.mediaIds || [],
  });

  if (!newPost) {
    throw new APIError("Post not created", 400);
  }
  logger.info("Post created successfully", newPost);
  res.status(201).json({
    success: true,
    message: "Post created successfully",
  });
});

const deletePost = asyncHandler(async (req, res, next) => {
  logger.info("Delete post request received", req.params);
});

module.exports = { CreatePost, deletePost };
