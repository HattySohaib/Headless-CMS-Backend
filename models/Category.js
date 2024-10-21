import mongoose from "mongoose";
mongoose.set("strictQuery", true);

const categorySchema = new mongoose.Schema({
  parent: String,
  value: String,
});

const Category = mongoose.model("Categories", categorySchema);

export default { Category };
