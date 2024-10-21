import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { connectDb } from "./config/db.js";
import blogRoutes from "./routes/blogRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/api/blogs", blogRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

const start = async () => {
  try {
    connectDb(process.env.MONGO_URL);
    app.listen(5000, () => console.log("Server running successfully"));
  } catch (error) {
    console.log(error);
  }
};

start();