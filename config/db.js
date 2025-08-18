import mongoose from "mongoose";

export const connectDb = (url) => {
  mongoose.connect(url);
  mongoose.connection.on("connected", () => {
    console.log("Connected to MongoDB");
  });
  mongoose.connection.on("error", (err) => {
    console.log("MongoDB Connection Error:", err);
  });
};
