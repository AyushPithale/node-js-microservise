const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// hash passwords using argon2
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (error) {
      return next(error);
    }
  }
});

// compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

// for indexing of user name for search fcuntionaltiy
userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);
module.exports = User;
