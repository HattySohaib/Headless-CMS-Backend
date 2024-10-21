import bcrypt from "bcrypt";
import mongo from "../models/User.js";
import Author from "../models/Author.js";

import { getObject, putObject } from "../services/s3Service.js";

const bucketName = process.env.BUCKET_NAME;

export const createUser = async (req, res) => {
  try {
    const { full_name, username, email, password, bio } = req.body;

    const profile_image_url = req.file.originalname;

    putObject(bucketName, req.file);

    // Hash the password before saving
    const password_hash = await bcrypt.hash(password, 10);

    await mongo.User.create({
      full_name,
      username,
      email,
      password_hash,
      bio,
      profile_image_url,
    });
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit user data
export const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If password is being updated, hash the new password
    if (updateData.password) {
      updateData.password_hash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password; // Remove plain password from updateData
    }

    await mongo.User.findByIdAndUpdate(id, updateData);

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the user by ID
    let user = await mongo.User.findById(id).select("-password_hash"); // Exclude password hash
    let profile_image_url = await getObject(bucketName, user.profile_image_url);
    user.profile_image_url = profile_image_url;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    let users = await mongo.User.find().select("-password_hash"); // Exclude password hash
    const updatedUsers = await Promise.all(
      users.map(async (user) => {
        let profile_image_url = await getObject(
          bucketName,
          user.profile_image_url
        );
        user.profile_image_url = profile_image_url;
        return user;
      })
    );
    res.json(updatedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllAuthors = async (req, res) => {
  try {
    let authors = await Author.Author.find();
    const updatedAuthors = await Promise.all(
      authors.map(async (author) => {
        let userdata = await mongo.User.findById(author.authorId).select(
          "-password_hash"
        );
        let profile_image_url = await getObject(
          bucketName,
          userdata.profile_image_url
        );
        userdata.profile_image_url = profile_image_url;
        author = { ...author._doc, user: userdata };
        return author;
      })
    );
    res.json(updatedAuthors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAuthorProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    let author = await Author.Author.findOne({ authorId: id });
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    } else {
      const userdata = await mongo.User.findById(author.authorId).select(
        "-password_hash"
      );
      let profile_image_url = await getObject(
        bucketName,
        userdata.profile_image_url
      );
      userdata.profile_image_url = profile_image_url;
      author = { ...author._doc, user: userdata };
      res.json(author);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const followAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.Author.findOne({ authorId: id });
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }
    const user = await mongo.User.findById(req.user.id);

    if (user.following.includes(author.authorId)) {
      user.following.pull(author.authorId);
      await user.save();
      author.followers.pull(user._id);
      await author.save();
      return res.json({ message: "Author unfollowed successfully" });
    } else {
      user.following.push(author.authorId);
      await user.save();
      author.followers.push(user._id);
      await author.save();
      return res.json({ message: "Author followed successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};