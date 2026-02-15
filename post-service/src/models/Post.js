const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: string,
      required: true,
    },
    mediaIds: [
      {
        type: string,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// can be skiped if you have diffrent service for search eg: elastic search
postSchema.index({ content: "text" });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
