import mongoose from "mongoose";
import dotenv from "dotenv";
import View from "./models/View.js";
import Blog from "./models/Blog.js";

dotenv.config();

// Function to get random date within a range
const getRandomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Function to seed views
const seedViews = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    // Get all blogs for the user
    const userId = "689a6bae15e5238ca55281eb";
    const userBlogs = await Blog.find({ author: userId }).select("_id title");

    if (userBlogs.length === 0) {
      console.log("No blogs found for the user");
      return;
    }

    console.log(`Found ${userBlogs.length} blogs for the user`);

    // Clear existing views for user's blogs
    await View.deleteMany({ blog: { $in: userBlogs.map((b) => b._id) } });
    console.log("Cleared existing views");

    // Generate views for the last 90 days
    const views = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    // Generate different amounts of views for different time periods
    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // More recent days get more views
      const recencyMultiplier = Math.max(0.3, i / 90);
      const baseViews = Math.floor(Math.random() * 20 * recencyMultiplier) + 1;

      for (let j = 0; j < baseViews; j++) {
        // Random blog selection with bias towards certain blogs
        const randomBlogIndex = Math.floor(
          Math.pow(Math.random(), 0.7) * userBlogs.length
        );
        const randomBlog = userBlogs[randomBlogIndex];

        // Random time within the day
        const viewTime = getRandomDate(
          new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          ),
          new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23,
            59,
            59
          )
        );

        views.push({
          blog: randomBlog._id,
          createdAt: viewTime,
          updatedAt: viewTime,
        });
      }
    }

    // Insert views into database
    const insertedViews = await View.insertMany(views);
    console.log(`Successfully inserted ${insertedViews.length} views`);

    // Display statistics
    const totalViews = await View.countDocuments({
      blog: { $in: userBlogs.map((b) => b._id) },
    });

    // Get views for last 7 days
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyViews = await View.countDocuments({
      blog: { $in: userBlogs.map((b) => b._id) },
      createdAt: { $gte: weekStart },
    });

    console.log(`\nStatistics:`);
    console.log(`Total views: ${totalViews}`);
    console.log(`Views in last 7 days: ${weeklyViews}`);

    // Show views per blog
    for (const blog of userBlogs) {
      const blogViews = await View.countDocuments({ blog: blog._id });
      console.log(`${blog.title}: ${blogViews} views`);
    }
  } catch (error) {
    console.error("Error seeding views:", error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
seedViews();
