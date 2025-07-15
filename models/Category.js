import mongoose from "mongoose";
mongoose.set("strictQuery", true);

const categorySchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
  },
  blogCount: {
    type: Number,
    default: 0,
  },
});

const Category = mongoose.model("Categories", categorySchema);

export default { Category };
