import mongoose from "mongoose";

const viewSchema = new mongoose.Schema(
  {
    blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
  },
  { timestamps: true }
);

// Index for performance optimization on trending/analytics queries
viewSchema.index({ createdAt: -1 });
viewSchema.index({ blog: 1, createdAt: -1 });

export default mongoose.model("View", viewSchema);
