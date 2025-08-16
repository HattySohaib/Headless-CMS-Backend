import mongoose from "mongoose";

const viewSchema = new mongoose.Schema(
  {
    blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("View", viewSchema);
