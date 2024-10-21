import mongoose from "mongoose";
mongoose.set("strictQuery", true);

const blogSchema = new mongoose.Schema({
  banner: String,
  date: String,
  time: String,
  category: String,
  title: String,
  meta: String,
  content: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  liked_by: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  comments: {
    type: [{ user: mongoose.Schema.Types.ObjectId, comment: String }],
    ref: "User",
    default: [],
  },
  published: Boolean,
  featured: Boolean,
});

const Blog = mongoose.model("Blogs", blogSchema);

export default { Blog };