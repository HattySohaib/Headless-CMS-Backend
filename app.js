import dotenv from "dotenv";
dotenv.config();
import cors from "cors";

import express from "express";
import { connectDb } from "./config/db.js";

import blogRoutes from "./routes/blogRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

app.use("/api/blogs", blogRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/like", likeRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    connectDb(process.env.MONGO_URL);
    app.listen(PORT, () =>
      console.log(`Server running successfully on port ${PORT}`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
