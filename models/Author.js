import mongoose, { Schema } from "mongoose";

const authorSchema = new mongoose.Schema({
  authorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blogs: {
    type: [Schema.Types.ObjectId],
    ref: "Blog",
    default: [],
  },
  followers: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
});

const Author = mongoose.model("Author", authorSchema);

export default { Author };
