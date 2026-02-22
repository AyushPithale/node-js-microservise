const logger = require("../utils/logger");
const Post = require("../models/Post");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const { validatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
  const cachedkey = `post:${input}`;
  await req.redisClient.del(cachedkey);

  const keys = await req.redisClient.keys("posts:*");

  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

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

  // invalidate or delete old cache of post after new post  creation
  await invalidatePostCache(req, newPost._id.toString());

  logger.info("Post created successfully", newPost);
  res.status(201).json({
    success: true,
    message: "Post created successfully",
  });
});

const getAllPost = asyncHandler(async (req, res, next) => {
  logger.info("Get all post request received");

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  // creating cache key
  const cacheKey = `posts:${page}:${limit}`;

  const cachedPost = await req.redisClient.get(cacheKey);

  if (cachedPost) {
    return res.status(200).json({
      success: true,
      message: "Posts fetch succesfully",
      posts: JSON.parse(cachedPost),
    });
  }

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  if (!posts) {
    logger.warn("Failed to fetch posts");
    throw new APIError("Failed to fetch posts", 404);
  }

  const totalNoPost = await Post.countDocuments();

  const result = {
    posts,
    currentPage: page,
    totalPages: Math.ceil(totalNoPost / limit),
    totalPosts: totalNoPost,
  };

  // save it in redis cache after given time it will  be deleted
  await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

  res.status(200).json({
    success: true,
    ...result,
  });
});

const getPost = asyncHandler(async (req, res, next) => {
  logger.info("Get post request received ", req.params);

  const postId = req.params.id;
  const cachekey = `post:${postId}`;

  const cachedPost = await req.redisClient.get(cachekey);

  if (cachedPost) {
    return res.status(200).json({
      success: true,
      message: "Post fetch succesfully",
      posts: JSON.parse(cachedPost),
    });
  }

  const SinglePostById = await Post.findById(postId);

  if (!SinglePostById) {
    logger.warn("No Post found");
    return res.status(404).json({
      success: false,
      message: "No Post found",
    });
  }

  await req.redisClient.setex(cachedPost, 3600, JSON.stringify(SinglePostById));

  res.status(201).json(SinglePostById);
});

const deletePost = asyncHandler(async (req, res, next) => {
  logger.info("Delete post request received", req.params);

  const id = req.params.id;

  const post = await Post.findOneAndDelete({
    _id: id,
    user: req.user.userId,
  });

  if (!post) {
    logger.warn("Post not found", post);
    throw new APIError("Post not found", 404);
  }

  await invalidatePostCache(req, req.params.id);

  res.json({
    message: "post deleted successfully ",
  });
});

module.exports = { CreatePost, getAllPost, deletePost, getPost };
