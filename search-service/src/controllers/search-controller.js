const logger = require("./../utils/logger");
const { asyncHandler, APIError } = require("./../middleware/error-handler");
const Search = require("../models/Search");

const searchPostController = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === "") {
    throw new APIError("Query parameter is required and cannot be empty.", 400);
  }
  logger.info(`Search endpoint hit with query: "${query}"`);

  const results = await Search.find(
    {
      $text: { $search: query },
    },
    {
      score: { $meta: "textScore" },
    },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(10);

  if (!results || results.length === 0) {
    logger.warn(`No results found for query: "${query}"`);
    return res.status(404).json({
      message: "No results Found for your query.",
    });
  }

  res.status(200).json({
    data: results,
  });
});

module.exports = { searchPostController };
