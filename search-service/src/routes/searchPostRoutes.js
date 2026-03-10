const express = require("express");
const { searchPostController } = require("../controllers/search-controller");
const authenticateMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticateMiddleware);
router.get("/posts", searchPostController);

module.exports = router;
