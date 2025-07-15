import mongo from "../models/Blog.js";
import Author from "../models/Author.js";
import User from "../models/User.js";
import View from "../models/View.js";

import { getObject, putObject } from "../services/s3Service.js";

const bucketName = process.env.BUCKET_NAME;

export const createNewBlog = async (req, res) => {
  try {
    const userId = req.user.id;
    const blog = req.body;
    const banner = req.file.originalname;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();
    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const newBlog = await mongo.Blog.create({
      banner: banner,
      author: userId,
      date: formattedDate,
      time: formattedTime,
      featured: false,
      liked_by: [],
      ...blog,
    });

    const author = await Author.Author.findOne({ authorId: userId });
    if (author) {
      await Author.Author.updateOne(
        { user: userId },
        { $push: { blogs: newBlog._id } }
      );
    } else {
      await Author.Author.create({
        authorId: userId,
        blogs: [newBlog._id],
      });
    }

    putObject(bucketName, req.file);

    res.json("Blog added successfully");
  } catch (error) {
    console.log(error);
    res.send(error);
  }
};

export const saveEditedBlog = async (req, res) => {
  const blog = req.body;
  if (req.file) {
    putObject(bucketName, req.file);
    console.log("true");
    await mongo.Blog.updateOne(
      { _id: req.query.blog },
      { banner: req.file.originalname }
    );
  }

  await mongo.Blog.updateOne({ _id: req.query.blog }, { ...blog });

  res.json("Saved");
};

export const getAllBlogsByUser = async (req, res) => {
  const id = req.params.id;
  try {
    let blogs = await mongo.Blog.find({ author: id });
    res.json(blogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFeaturedBlogsByUser = async (req, res) => {
  const id = req.params.id;
  try {
    let featured = await mongo.Blog.find({
      published: true,
      featured: true,
      author: id,
    });
    res.json(featured);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBlogDetails = async (req, res) => {
  try {
    let blog = await mongo.Blog.findOne({ _id: req.query.blog });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    let imageUri = await getObject(bucketName, blog.banner);
    blog.banner = imageUri;
    await View.View.create({ blog: blog._id });
    await Author.Author.updateOne(
      { authorId: blog.author },
      { $inc: { views: 1 } }
    );
    res.json(blog);
  } catch (error) {
    console.error("Error getting blog details:", error);
    res.status(500).json({ error: "There was an error. Please try again." });
  }
};

export const getPublishedBlogs = async (req, res) => {
  const id = req.params.id;
  let published;
  try {
    if (id) {
      published = await mongo.Blog.find({ published: true, author: id });
    } else {
      published = await mongo.Blog.find({ published: true });
    }
    const updatedPublished = await Promise.all(
      published.map(async (post) => {
        let imageUri = await getObject(bucketName, post.banner);
        post.banner = imageUri;
        let user = await User.User.findById(post.author);
        let profile_image_url = await getObject(
          bucketName,
          user.profile_image_url
        );
        user.profile_image_url = profile_image_url;
        post = { ...post._doc, author: user };
        return post;
      })
    );
    res.json(updatedPublished);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const publishBlog = async (req, res) => {
  await mongo.Blog.updateOne({ _id: req.query.blog }, { published: true });
  res.json("Blog Successfully Published");
};

export const moveToDrafts = async (req, res) => {
  await mongo.Blog.updateOne({ _id: req.query.blog }, { published: false });
  res.json("Blog Moved to Drafts");
};

export const deleteBlog = async (req, res) => {
  await mongo.Blog.deleteOne({ _id: req.query.blog });
  res.json("Blog has been deleted");
};

export const uploadImageForBlog = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    putObject(bucketName, req.file);
    let imageURI = await getObject(bucketName, req.file.originalname);
    res.json(imageURI);
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

export const toggleFeaturedBlog = async (req, res) => {
  try {
    let blog = await mongo.Blog.findOne({ _id: req.query.blog });
    if (blog) {
      await mongo.Blog.updateOne(
        { _id: blog._id },
        { featured: !blog.featured }
      );
      res.json("Feature toggled");
    }
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    res.status(500).json({ error: "There was an error. Please try again." });
  }
};

export const likeBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const userId = req.user.id;
    const blog = await mongo.Blog.findOne({ _id: blogId });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    const user = await User.User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const liked = blog?.liked_by.includes(userId);
    if (liked) {
      await mongo.Blog.updateOne(
        { _id: blogId },
        { $pull: { liked_by: userId } }
      );
      res.json("You unliked this blog.");
    }
    if (!liked) {
      await mongo.Blog.updateOne(
        { _id: blogId },
        { $push: { liked_by: userId } }
      );
      res.json("You liked this blog.");
    }
  } catch (error) {
    console.error("Error liking blog:", error);
    res.status(500).json({ error: "There was an error. Please try again." });
  }
};

export const commentOnBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const userId = req.user.id;
    const { comment } = req.body;
    console.log(req.body);
    const blog = await mongo.Blog.findOne({ _id: blogId });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    const user = await User.User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await mongo.Blog.updateOne(
      { _id: blogId },
      { $push: { comments: { user: userId, comment: comment } } }
    );
    res.json("Comment added successfully.");
  } catch (error) {
    console.error("Error commenting on blog:", error);
    res.status(500).json({ error: "There was an error. Please try again." });
  }
};

export const getViewsOnAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.Author.findOne({ authorId: id });
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }
    const views = await View.View.find({ blog: { $in: author.blogs } });
    res.json(views);
  } catch (error) {
    console.error("Error getting views on author:", error);
    res.status(500).json({ error: "There was an error. Please try again." });
  }
};
