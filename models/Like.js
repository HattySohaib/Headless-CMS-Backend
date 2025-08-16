import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate likes from same user
likeSchema.index({ user: 1, blog: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
