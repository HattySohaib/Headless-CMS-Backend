import mongoose from "mongoose";

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

export default mongoose.model("Categories", categorySchema);
