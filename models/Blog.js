import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    banner: { type: String, required: true }, // image URL or path
    category: { type: String, index: true },
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    meta: { type: String, maxlength: 160 }, // SEO meta description
    content: { type: String, required: true },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    published: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    tags: [{ type: String, lowercase: true, trim: true, index: true }],

    likesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },

    publishedAt: { type: Date }, // date/time of publish
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Index for performance (e.g., get latest published blogs quickly)
blogSchema.index({ published: 1, createdAt: -1 });

export default mongoose.model("Blog", blogSchema);
