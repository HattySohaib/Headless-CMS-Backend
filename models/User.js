import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    apiKey: { type: String, default: null }, // hash if sensitive
    email: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: "" },
    profileImageUrl: { type: String, default: "" },
    blogCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
