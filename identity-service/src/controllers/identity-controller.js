const logger = require("../utils/logger");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const { validateUserRegistration } = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
// user-registration

const registerUser = asyncHandler(async (req, res) => {
  logger.info("Registration endpoint hit");

  const { error, value } = validateUserRegistration(req.body);
  if (error) {
    logger.warn("Validation error", error.details[0].message);
    throw new APIError(error.details[0].message, 400);
  }

  const { username, password, email } = value;

  let user = await User.findOne({ $or: [{ email }, { username }] });
  if (user) {
    logger.warn("User already exists", email);
    throw new APIError("User already exists", 400);
  }

  user = await User.create({ username, password, email });

  // error  on creating user
  if (!user) {
    logger.warn("User not created", email);
    throw new APIError("User not created", 500);
  }

  logger.info("User registered successfully", user._id);

  const { accessToken, refreshToken } = await generateToken(user);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
  });
});
// user login

// refresh token

// logout

module.exports = {
  registerUser,
};
