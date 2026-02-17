const express = require("express");
const { CreatePost, deletePost } = require("../controllers/post-controller");
const authenticateMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// for  protected routes
router.use(authenticateMiddleware);

router.post("/create-post", CreatePost);

router.delete("/delete-post/:id", deletePost);

module.exports = router;
