const joi = require("joi");

// user registration validation
const validateUserRegistration = (data) => {
  const schema = joi.object({
    username: joi.string().min(3).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).max(50).required(),
  });

  return schema.validate(data);
};

const validateLogin = (data) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).max(50).required(),
  });

  return schema.validate(data);
};

module.exports = {
  validateUserRegistration,
  validateLogin,
};
