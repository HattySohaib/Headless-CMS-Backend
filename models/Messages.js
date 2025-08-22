import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderEmail: {
      type: String,
      required: true,
      trim: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index({ senderEmail: 1 });

export default mongoose.model("Message", messageSchema);
