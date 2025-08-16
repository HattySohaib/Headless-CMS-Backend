import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "./models/Messages.js";

dotenv.config();

// Sample data for generating random messages
const sampleEmails = [
  "john.doe@gmail.com",
  "sarah.wilson@yahoo.com",
  "mike.johnson@hotmail.com",
  "emma.brown@outlook.com",
  "david.lee@gmail.com",
  "lisa.garcia@yahoo.com",
  "ryan.martinez@hotmail.com",
  "anna.rodriguez@gmail.com",
  "james.lopez@outlook.com",
  "maria.gonzalez@yahoo.com",
  "chris.anderson@gmail.com",
  "jessica.taylor@hotmail.com",
  "daniel.thomas@outlook.com",
  "ashley.jackson@gmail.com",
  "matthew.white@yahoo.com",
  "nicole.harris@hotmail.com",
  "kevin.martin@gmail.com",
  "amanda.thompson@outlook.com",
  "brandon.clark@yahoo.com",
  "stephanie.lewis@gmail.com",
];

const sampleSubjects = [
  "Question about your blog post",
  "Collaboration opportunity",
  "Interview request",
  "Feedback on your article",
  "Guest post proposal",
  "Speaking engagement invitation",
  "Project partnership",
  "Media inquiry",
  "Book recommendation",
  "Technical question",
  "Content suggestion",
  "Thank you message",
  "Business proposal",
  "Event invitation",
  "Consulting inquiry",
  "Mentorship request",
  "Product review request",
  "Podcast interview",
  "Conference speaker invitation",
  "Newsletter collaboration",
];

const sampleMessages = [
  "Hi! I really enjoyed your recent blog post about web development. Could you share more insights on this topic?",
  "Hello, I'm reaching out regarding a potential collaboration opportunity. Would love to discuss this further with you.",
  "Great article! I'm a journalist and would like to interview you for our tech magazine. Are you available?",
  "Your content has been really helpful to me. Thank you for sharing your knowledge with the community!",
  "I'm organizing a tech conference and would love to have you as a speaker. Please let me know if you're interested.",
  "Hello! I run a similar blog and was wondering if you'd be interested in guest posting for each other?",
  "Your expertise in this field is impressive. I'd like to discuss a potential consulting project with you.",
  "I'm working on a project that aligns with your interests. Would you be open to a partnership discussion?",
  "Thank you for the valuable insights in your latest post. It helped me solve a problem I was facing.",
  "I'm a student working on my thesis and your work has been a great inspiration. Could I ask you a few questions?",
  "Hello! I represent a tech company that would love to sponsor some of your content. Interested?",
  "Your tutorial series is amazing! Any plans to create more advanced content on this topic?",
  "I noticed we have similar interests. Would you like to connect and potentially collaborate?",
  "Great work on your recent project! I'd love to feature it in our newsletter if you're okay with it.",
  "Hello, I'm organizing a webinar series and think you'd be a perfect fit as a presenter.",
  "Your problem-solving approach is unique. I'd love to learn more about your methodology.",
  "I'm starting a podcast focused on tech trends. Would you be interested in being a guest?",
  "Your content always provides fresh perspectives. Keep up the excellent work!",
  "I'm working on a similar project and would appreciate your feedback if you have time.",
  "Hello! I run a tech meetup group and would love to invite you to speak at our next event.",
  "Your recent article sparked an interesting discussion in our team. Thank you for sharing!",
  "I'm a recruiter and have some exciting opportunities that might interest you.",
  "Your open-source contributions are impressive. Would you consider mentoring junior developers?",
  "Hello! I'm writing a book and would love to include a quote from you if you're interested.",
  "Your solution to that complex problem was brilliant! Could you explain the thought process behind it?",
  "I'm organizing a hackathon and think you'd be a great judge. Are you available?",
  "Your content has helped me transition into tech. Thank you for making complex topics accessible!",
  "Hello! I represent a tech publication and would love to republish one of your articles.",
  "Great insights on the latest industry trends! Do you have any predictions for next year?",
  "I'm building a tech community and would love to have you as an advisor. Interested?",
  "Your debugging techniques are incredibly helpful. Any plans for more technical deep-dives?",
  "Hello! I'm a product manager and would love to get your thoughts on our new developer tool.",
  "Your career journey is inspiring. Would you be open to sharing your story in an interview?",
  "I'm working on a research paper and your work would be a valuable reference. May I cite you?",
  "Your code reviews are always thorough and helpful. Thank you for contributing to open source!",
  "Hello! I'm launching a tech newsletter and would love to feature your work.",
  "Your approach to team leadership has given me new ideas. Thank you for sharing your experience!",
  "I'm a designer working with developers and your posts help me understand the technical side better.",
  "Your problem-solving videos are excellent teaching tools. Have you considered creating a course?",
  "Hello! I run a tech blog and would love to cross-promote each other's content.",
  "Your insights on work-life balance in tech are much needed. Thank you for addressing this topic!",
  "I'm building a developer tool and would value your feedback as an experienced professional.",
  "Your contribution to the community is remarkable. Keep inspiring others!",
  "Hello! I'm organizing a charity coding event and would love your participation.",
  "Your technical writing skills are exceptional. Any tips for improving technical documentation?",
  "I'm a startup founder and your advice on scaling development teams was invaluable.",
  "Your recent talk was inspiring! Do you have any upcoming speaking engagements?",
  "Hello! I'm working on a tech documentary and would love to include your perspective.",
  "Your mentorship approach resonates with me. Would you consider taking on another mentee?",
  "I'm impressed by your commitment to continuous learning. What resources do you recommend?",
];

// Function to get random item from array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Function to generate random timestamp within last 30 days
const getRandomDate = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime =
    thirtyDaysAgo.getTime() +
    Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
};

// Function to seed messages
const seedMessages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    // Delete existing messages for this user (optional - remove if you want to keep existing messages)
    const receiverId = "689a6bae15e5238ca55281eb";
    await Message.deleteMany({ receiverId });
    console.log("Cleared existing messages for the user");

    // Generate 50 random messages
    const messages = [];
    for (let i = 0; i < 50; i++) {
      const message = {
        senderEmail: getRandomItem(sampleEmails),
        receiverId: receiverId,
        message: getRandomItem(sampleMessages),
        subject: getRandomItem(sampleSubjects),
        read: Math.random() > 0.3, // 70% chance of being read
        createdAt: getRandomDate(),
        updatedAt: getRandomDate(),
      };
      messages.push(message);
    }

    // Insert messages into database
    const insertedMessages = await Message.insertMany(messages);
    console.log(`Successfully inserted ${insertedMessages.length} messages`);

    // Display some statistics
    const totalMessages = await Message.countDocuments({ receiverId });
    const unreadMessages = await Message.countDocuments({
      receiverId,
      read: false,
    });

    console.log(`\nStatistics for user ${receiverId}:`);
    console.log(`Total messages: ${totalMessages}`);
    console.log(`Unread messages: ${unreadMessages}`);
    console.log(`Read messages: ${totalMessages - unreadMessages}`);
  } catch (error) {
    console.error("Error seeding messages:", error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
seedMessages();
