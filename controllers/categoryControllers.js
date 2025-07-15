import mongo from "../models/Category.js";
import dotenv from "dotenv";
dotenv.config();

export const getCategories = async (req, res) => {
  try {
    let categories = await mongo.Category.find({});
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addNewCategory = async (req, res) => {
  const category = req.body;
  try {
    await mongo.Category.create({ ...category });
    res.status(200).json("Category added successfully");
  } catch (error) {
    res.send(error);
  }
};

export const saveEditedCategory = async (req, res) => {
  const category = req.body;
  try {
    await mongo.Category.updateOne({ _id: req.query.id }, { ...category });
    res.status(200).json("Saved Category");
  } catch (error) {
    res.send(error);
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.query;
  try {
    await mongo.Category.deleteOne({ _id: id });
    res.status(200).json("Deleted Category");
  } catch (error) {
    res.send(error);
  }
};
