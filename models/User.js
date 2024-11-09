import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  apiKey: { type: String, default: null },
  accessToken: { type: String, default: null },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: "",
  },
  profile_image_url: {
    type: String,
    default: "",
  },
  following: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);

export default { User };
