import Blog from "../models/Blog.js";
import Message from "../models/Messages.js";
import View from "../models/View.js";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/responseHelpers.js";

// Helper function to get start of day for a given date
const getStartOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper function to get end of day for a given date
const getEndOfDay = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Helper function to get date range for last 7 days
const getLast7DaysRange = () => {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push({
      start: getStartOfDay(date),
      end: getEndOfDay(date),
      date: date.toISOString().split("T")[0],
    });
  }
  return days;
};

// Helper function to get quarterly date ranges
const getQuarterlyRanges = () => {
  const currentYear = new Date().getFullYear();
  return [
    {
      label: "Q1",
      start: new Date(currentYear, 0, 1), // Jan 1
      end: new Date(currentYear, 2, 31), // Mar 31
      color: "#FF6B6B",
    },
    {
      label: "Q2",
      start: new Date(currentYear, 3, 1), // Apr 1
      end: new Date(currentYear, 5, 30), // Jun 30
      color: "#4ECDC4",
    },
    {
      label: "Q3",
      start: new Date(currentYear, 6, 1), // Jul 1
      end: new Date(currentYear, 8, 30), // Sep 30
      color: "#45B7D1",
    },
    {
      label: "Q4",
      start: new Date(currentYear, 9, 1), // Oct 1
      end: new Date(currentYear, 11, 31), // Dec 31
      color: "#96CEB4",
    },
  ];
};

// 1. Blog Statistics Endpoint
export const getBlogStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic blog counts
    const [totalBlogs, publishedBlogs, draftBlogs] = await Promise.all([
      Blog.countDocuments({ author: userId }),
      Blog.countDocuments({ author: userId, published: true }),
      Blog.countDocuments({ author: userId, published: false }),
    ]);

    // Get total views from user's blogs
    const userBlogs = await Blog.find({ author: userId }).select(
      "_id viewCount likesCount"
    );
    const blogIds = userBlogs.map((blog) => blog._id);

    const totalViews = userBlogs.reduce(
      (sum, blog) => sum + (blog.viewCount || 0),
      0
    );
    const totalLikes = userBlogs.reduce(
      (sum, blog) => sum + (blog.likesCount || 0),
      0
    );

    // For comments, we'll use a placeholder since there's no Comment model yet
    const totalComments = 0; // TODO: Update when Comment model is available

    // Get weekly views (last 7 days)
    const last7Days = getLast7DaysRange();
    const weeklyViews = [];

    for (const day of last7Days) {
      const viewCount = await View.countDocuments({
        blog: { $in: blogIds },
        createdAt: { $gte: day.start, $lte: day.end },
      });
      weeklyViews.push(viewCount);
    }

    // Get top 5 blogs with their 7-day view data
    const topBlogs = [];
    const sortedBlogs = userBlogs
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);

    for (const blog of sortedBlogs) {
      const dailyViews = [];
      for (const day of last7Days) {
        const viewCount = await View.countDocuments({
          blog: blog._id,
          createdAt: { $gte: day.start, $lte: day.end },
        });
        dailyViews.push(viewCount);
      }
      topBlogs.push({
        blogId: blog._id.toString(),
        dailyViews,
      });
    }

    const stats = {
      totalViews,
      publishedBlogs,
      draftBlogs,
      totalLikes,
      totalComments,
      weeklyViews,
      topBlogs,
    };

    return successResponse(
      res,
      stats,
      "Blog statistics retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to retrieve blog statistics", 500, error);
  }
};

// 2. Message Statistics Endpoint
export const getMessageStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic message counts
    const [totalMessages, unreadMessages] = await Promise.all([
      Message.countDocuments({ receiverId: userId }),
      Message.countDocuments({ receiverId: userId, read: false }),
    ]);

    // Get messages from this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const messagesThisWeek = await Message.countDocuments({
      receiverId: userId,
      createdAt: { $gte: weekStart },
    });

    // Get daily message counts for last 7 days
    const last7Days = getLast7DaysRange();
    const messagesByDay = [];

    for (const day of last7Days) {
      const messageCount = await Message.countDocuments({
        receiverId: userId,
        createdAt: { $gte: day.start, $lte: day.end },
      });
      messagesByDay.push(messageCount);
    }

    // Calculate average response time (placeholder calculation)
    // This would require tracking when messages are read vs when they're created
    const readMessages = await Message.find({
      receiverId: userId,
      read: true,
    })
      .select("createdAt updatedAt")
      .limit(100);

    let totalResponseTime = 0;
    let validResponses = 0;

    readMessages.forEach((message) => {
      if (message.updatedAt && message.createdAt) {
        const responseTime =
          (message.updatedAt - message.createdAt) / (1000 * 60 * 60); // Convert to hours
        if (responseTime > 0 && responseTime < 168) {
          // Only count if less than a week
          totalResponseTime += responseTime;
          validResponses++;
        }
      }
    });

    const responseTime =
      validResponses > 0
        ? Math.round((totalResponseTime / validResponses) * 10) / 10
        : 0;

    const stats = {
      totalMessages,
      unreadMessages,
      messagesThisWeek,
      messagesByDay,
      responseTime,
    };

    return successResponse(
      res,
      stats,
      "Message statistics retrieved successfully"
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to retrieve message statistics",
      500,
      error
    );
  }
};

// 3. Performance Metrics Endpoint
export const getPerformanceMetrics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's blogs
    const userBlogs = await Blog.find({ author: userId }).select(
      "_id viewCount likesCount"
    );
    const blogIds = userBlogs.map((blog) => blog._id);

    // Get last 7 days data
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Get last 14 days data for comparison
    const twoWeeksStart = new Date();
    twoWeeksStart.setDate(twoWeeksStart.getDate() - 14);

    const [
      currentWeekViews,
      previousWeekViews,
      currentWeekMessages,
      previousWeekMessages,
    ] = await Promise.all([
      View.countDocuments({
        blog: { $in: blogIds },
        createdAt: { $gte: weekStart },
      }),
      View.countDocuments({
        blog: { $in: blogIds },
        createdAt: { $gte: twoWeeksStart, $lt: weekStart },
      }),
      Message.countDocuments({
        receiverId: userId,
        createdAt: { $gte: weekStart },
      }),
      Message.countDocuments({
        receiverId: userId,
        createdAt: { $gte: twoWeeksStart, $lt: weekStart },
      }),
    ]);

    // Calculate growth rates
    const viewGrowthRate =
      previousWeekViews > 0
        ? Math.round(
            ((currentWeekViews - previousWeekViews) / previousWeekViews) *
              100 *
              10
          ) / 10
        : currentWeekViews > 0
        ? 100
        : 0;

    const messageGrowthRate =
      previousWeekMessages > 0
        ? Math.round(
            ((currentWeekMessages - previousWeekMessages) /
              previousWeekMessages) *
              100 *
              10
          ) / 10
        : currentWeekMessages > 0
        ? 100
        : 0;

    // Get current week likes and comments (placeholder for comments)
    const currentWeekLikes = userBlogs.reduce(
      (sum, blog) => sum + (blog.likesCount || 0),
      0
    );
    const currentWeekComments = 0; // TODO: Update when Comment model is available

    // Calculate response time for message activity
    const readMessages = await Message.find({
      receiverId: userId,
      read: true,
      createdAt: { $gte: weekStart },
    })
      .select("createdAt updatedAt")
      .limit(50);

    let totalResponseTime = 0;
    let validResponses = 0;

    readMessages.forEach((message) => {
      if (message.updatedAt && message.createdAt) {
        const responseTime =
          (message.updatedAt - message.createdAt) / (1000 * 60 * 60);
        if (responseTime > 0 && responseTime < 168) {
          totalResponseTime += responseTime;
          validResponses++;
        }
      }
    });

    const avgResponseTime =
      validResponses > 0
        ? Math.round((totalResponseTime / validResponses) * 10) / 10
        : 0;

    const metrics = {
      blogPerformance: {
        growthRate: viewGrowthRate,
        last7Days: {
          likes: currentWeekLikes,
          comments: currentWeekComments,
          views: currentWeekViews,
        },
      },
      messageActivity: {
        responseTime: avgResponseTime,
        weeklyGrowth: messageGrowthRate,
      },
    };

    return successResponse(
      res,
      metrics,
      "Performance metrics retrieved successfully"
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to retrieve performance metrics",
      500,
      error
    );
  }
};

// 4. Quarterly View Share Endpoint
export const getQuarterlyViews = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's blogs
    const userBlogs = await Blog.find({ author: userId }).select("_id");
    const blogIds = userBlogs.map((blog) => blog._id);

    // Get quarterly ranges
    const quarters = getQuarterlyRanges();
    const quarterlyViews = [];

    for (const quarter of quarters) {
      const viewCount = await View.countDocuments({
        blog: { $in: blogIds },
        createdAt: { $gte: quarter.start, $lte: quarter.end },
      });

      quarterlyViews.push({
        label: quarter.label,
        value: viewCount,
        color: quarter.color,
      });
    }

    return successResponse(
      res,
      quarterlyViews,
      "Quarterly views retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to retrieve quarterly views", 500, error);
  }
};

export const getUserViews = async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user's ID
    const days = parseInt(req.query.days) || 30; // Default to last 30 days

    // Calculate the start date based on the days parameter
    // Subtract (days - 1) to include today in the count
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0); // Start of day

    // Get user's blogs
    const userBlogs = await Blog.find({ author: userId }).select("_id");
    const blogIds = userBlogs.map((blog) => blog._id);

    // Get views for each blog within the specified date range
    const views = await View.aggregate([
      {
        $match: {
          blog: { $in: blogIds },
          createdAt: { $gte: startDate }, // Only include views from the last 'days' days
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalViews: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return successResponse(res, views, "User views retrieved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to retrieve user views", 500, error);
  }
};

export const getDetailedViews = async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user's ID
    const days = parseInt(req.query.days) || 30; // Default to last 30 days

    // Calculate the start date based on the days parameter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0); // Start of day

    // Get user's blogs
    const userBlogs = await Blog.find({ author: userId }).select("_id");
    const blogIds = userBlogs.map((blog) => blog._id);

    const views = await View.find({
      blog: { $in: blogIds },
      createdAt: { $gte: startDate },
    }).populate("blog", "title");

    return successResponse(res, views, "User views retrieved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to retrieve user views", 500, error);
  }
};
