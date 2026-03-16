const logger = require("../utils/logger");
const Search = require("../models/Search");

async function handlePostCreatedEvent(event) {
  logger.info("Post created event received:", event);

  const { postId, userId, content, createdAt } = event;

  const newSearch = await Search.create({
    postId,
    userId,
    content,
    createdAt,
  });

  if (!newSearch) {
    logger.warn("Search not created");
    throw new APIError("Search not created", 400);
  }

  logger.info("Search created successfully", newSearch);

  return newSearch;
}


async function handlePostDeleteEvent(event) {
  logger.info("Post deleted event received:", event);

  const { postId } = event;

  const deletedSearch = await Search.findOneAndDelete({ postId: postId });
  console.log("deletedSearch", deletedSearch);
  if (!deletedSearch) {
    logger.warn("Search not deleted");
    throw new APIError("Search not deleted", 400);
  }

  logger.info("Search deleted successfully", deletedSearch);

  return deletedSearch;
}

module.exports = { handlePostCreatedEvent, handlePostDeleteEvent };
