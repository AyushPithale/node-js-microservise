const logger = require("../utils/logger");
const { asyncHandler, APIError } = require("../middleware/error-handler");
const {
  validateUserRegistration,
  validateLogin,
} = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const RefreshToken = require("../models/refreshToken");
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
const loginUser = asyncHandler(async (req, res) => {
  logger.info("Login endpoint hit");

  const { error, value } = validateLogin(req.body);

  if (error) {
    logger.warn("Validation error", error.details[0].message);
    throw new APIError(error.details[0].message, 400);
  }

  const { email, password } = value;
  const user = await User.findOne({ email });
  console.log("user", user);

  if (!user) {
    logger.warn("User not found", email);
    throw new APIError("User not found", 404);
  }

  const isPasswordIsValid = await user.comparePassword(password);

  if (!isPasswordIsValid) {
    logger.warn("Invalid password", email);
    throw new APIError("Invalid password", 400);
  }

  const { accessToken, refreshToken } = await generateToken(user);
  console.log("accessToken ", accessToken);
  res.status(201).json({ success: true, accessToken, refreshToken });
});

// refresh token
const refreshToken = asynceHandler(async (req, res) => {
  logger.info("refreshToken endpoint hit");

  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn("Refresh token missing");
    throw new APIError("Refresh token missing", 400);
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  
  if (!storedToken || storedToken.expireAt < new Date()) {
    logger.warn("Invalid refresh Token");
    throw new APIError("Invalid refresh Token");
  }
});
// logout

module.exports = {
  registerUser,
  loginUser,
};
