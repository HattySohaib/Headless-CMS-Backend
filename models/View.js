import mongoose from "mongoose";
mongoose.set("strictQuery", true);

const viewSchema = new mongoose.Schema({
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Blogs",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const View = mongoose.model("Views", viewSchema);

export default { View };
