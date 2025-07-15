import mongoose from "mongoose";

export const connectDb = (url) => {
  mongoose.connect(url);
};
