import mongoose from "mongoose";
import dotenv from "dotenv";
import Blog from "./models/Blog.js";

dotenv.config();

// Sample data for generating random blogs
const categories = [
  "System Design",
  "Web Development",
  "Backend Development",
  "Frontend Development",
  "Database Design",
  "DevOps",
  "API Design",
  "Software Architecture",
  "Performance Optimization",
  "Security",
  "Cloud Computing",
  "Microservices",
  "Data Structures",
  "Algorithms",
  "Mobile Development",
  "Machine Learning",
  "AI Development",
  "Testing",
  "Code Quality",
  "Project Management",
];

const titlePrefixes = [
  "How I built",
  "The complete guide to",
  "10 tips for better",
  "Why you should use",
  "Understanding",
  "Mastering",
  "Building scalable",
  "The future of",
  "Common mistakes in",
  "Best practices for",
  "Introduction to",
  "Advanced techniques in",
  "Debugging",
  "Optimizing",
  "Implementing",
  "Design patterns for",
  "From zero to hero:",
  "Deep dive into",
  "Everything you need to know about",
  "My journey with",
];

const titleSuffixes = [
  "RESTful APIs",
  "microservices architecture",
  "database optimization",
  "cloud deployment",
  "user authentication",
  "real-time applications",
  "scalable systems",
  "modern web development",
  "API security",
  "performance monitoring",
  "containerization",
  "serverless functions",
  "event-driven architecture",
  "data visualization",
  "automated testing",
  "CI/CD pipelines",
  "load balancing",
  "caching strategies",
  "error handling",
  "code reviews",
  "team collaboration",
  "agile development",
  "code refactoring",
  "system monitoring",
  "backup strategies",
];

const metaDescriptions = [
  "Learn how to implement modern development practices that scale.",
  "A comprehensive guide covering everything from basics to advanced concepts.",
  "Discover the techniques that top developers use in production.",
  "Step-by-step tutorial with real-world examples and best practices.",
  "Common pitfalls and how to avoid them in your next project.",
  "Everything you need to know to get started with this technology.",
  "Advanced strategies for building robust and maintainable systems.",
  "My experience and lessons learned from years of development.",
  "Practical tips that will improve your development workflow immediately.",
  "The essential guide for developers looking to level up their skills.",
  "Industry best practices that every developer should know.",
  "From theory to practice: implementing solutions that work.",
  "Real-world case studies and their solutions explained.",
  "The complete roadmap for mastering this important skill.",
  "Why this approach is becoming the new standard in the industry.",
];

const contentTemplates = [
  `<h1>Introduction</h1>
<p>In this comprehensive guide, we'll explore the fundamentals and advanced concepts that every developer should know.</p>

<h2>Getting Started</h2>
<p>Before diving into the technical details, let's understand the core principles that make this approach so effective.</p>

<h3>Key Concepts</h3>
<ol>
<li>Understanding the basic architecture</li>
<li>Implementing best practices from day one</li>
<li>Scaling considerations for production</li>
<li>Security implications and solutions</li>
</ol>

<h2>Implementation Details</h2>
<p>Now let's look at how to implement these concepts in real-world scenarios.</p>

<h3>Code Examples</h3>
<p>Here are some practical examples that demonstrate the concepts in action:</p>

<h2>Best Practices</h2>
<ul>
<li>Always validate input data</li>
<li>Implement proper error handling</li>
<li>Use meaningful variable names</li>
<li>Write comprehensive tests</li>
<li>Document your code thoroughly</li>
</ul>

<h2>Common Pitfalls</h2>
<p>Avoid these common mistakes that can cause issues in production:</p>

<h2>Conclusion</h2>
<p>By following these guidelines, you'll be able to build robust, scalable, and maintainable solutions.</p>`,

  `<h1>Why This Matters</h1>
<p>Understanding these concepts is crucial for any developer looking to build production-ready applications.</p>

<h2>The Problem</h2>
<p>Many developers struggle with implementing scalable solutions because they lack understanding of the fundamental principles.</p>

<h2>The Solution</h2>
<p>This approach provides a systematic way to address these challenges:</p>

<h3>Step 1: Planning</h3>
<p>Start with a solid foundation by planning your architecture carefully.</p>

<h3>Step 2: Implementation</h3>
<p>Follow established patterns and best practices during development.</p>

<h3>Step 3: Testing</h3>
<p>Ensure your solution works correctly under various conditions.</p>

<h3>Step 4: Deployment</h3>
<p>Deploy with confidence using proven deployment strategies.</p>

<h2>Real-World Examples</h2>
<p>Let's look at how major companies have implemented similar solutions:</p>

<h2>Performance Considerations</h2>
<p>When implementing this approach, keep these performance factors in mind:</p>

<h2>Future Considerations</h2>
<p>As technology evolves, these principles will continue to be relevant.</p>`,

  `<h1>Deep Dive Analysis</h1>
<p>In this detailed analysis, we'll examine the technical aspects that make this approach so effective.</p>

<h2>Technical Foundation</h2>
<p>The underlying technology stack plays a crucial role in the success of this implementation.</p>

<h2>Architecture Overview</h2>
<p>Let's break down the system architecture into its core components:</p>

<h3>Frontend Layer</h3>
<p>The user interface and user experience considerations.</p>

<h3>Backend Services</h3>
<p>The core business logic and data processing layer.</p>

<h3>Database Layer</h3>
<p>Data storage and retrieval optimization strategies.</p>

<h2>Security Considerations</h2>
<p>Security should be built into every layer of the application:</p>
<ul>
<li>Authentication and authorization</li>
<li>Data encryption and protection</li>
<li>Input validation and sanitization</li>
<li>Rate limiting and DDoS protection</li>
</ul>

<h2>Monitoring and Logging</h2>
<p>Effective monitoring is essential for maintaining system health.</p>

<h2>Scaling Strategies</h2>
<p>How to handle increased load and growing user bases.</p>

<h2>Lessons Learned</h2>
<p>Key takeaways from implementing this solution in production.</p>`,
];

const tags = [
  "javascript",
  "typescript",
  "nodejs",
  "react",
  "vue",
  "angular",
  "python",
  "java",
  "go",
  "rust",
  "php",
  "ruby",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "elasticsearch",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "api",
  "rest",
  "graphql",
  "microservices",
  "serverless",
  "testing",
  "security",
  "performance",
  "scaling",
  "optimization",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "web",
  "devops",
  "ci/cd",
  "monitoring",
  "logging",
  "debugging",
];

// Function to get random item from array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Function to get random items from array
const getRandomItems = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Function to generate slug from title
const generateSlug = (title, index) => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Add index to ensure uniqueness
  return `${baseSlug}-${index}-${Date.now()}`;
};

// Function to generate random date within last 60 days
const getRandomDate = () => {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const randomTime =
    sixtyDaysAgo.getTime() +
    Math.random() * (now.getTime() - sixtyDaysAgo.getTime());
  return new Date(randomTime);
};

// Function to seed blogs
const seedBlogs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    const authorId = "689a6bae15e5238ca55281eb";
    const bannerImage = "Screenshot_20250810-010404.png";

    // Delete existing blogs for this author (optional - remove if you want to keep existing blogs)
    // await Blog.deleteMany({ author: authorId });
    // console.log("Cleared existing blogs for the author");

    // Generate 50 random blogs
    const blogs = [];
    for (let i = 0; i < 50; i++) {
      const title = `${getRandomItem(titlePrefixes)} ${getRandomItem(
        titleSuffixes
      )}`;
      const publishedDate = getRandomDate();

      const blog = {
        banner: bannerImage,
        category: getRandomItem(categories),
        title: title,
        slug: generateSlug(title, i),
        meta: getRandomItem(metaDescriptions),
        content: getRandomItem(contentTemplates),
        author: authorId,
        published: Math.random() > 0.2, // 80% chance of being published
        featured: Math.random() > 0.7, // 30% chance of being featured
        tags: getRandomItems(tags, Math.floor(Math.random() * 5) + 2), // 2-6 random tags
        likesCount: Math.floor(Math.random() * 50), // 0-49 likes
        viewsCount: Math.floor(Math.random() * 200), // 0-199 views
        publishedAt: publishedDate,
        createdAt: publishedDate,
        updatedAt: new Date(
          publishedDate.getTime() +
            Math.random() * (Date.now() - publishedDate.getTime())
        ),
      };
      blogs.push(blog);
    }

    // Insert blogs into database
    const insertedBlogs = await Blog.insertMany(blogs);
    console.log(`Successfully inserted ${insertedBlogs.length} blogs`);

    // Display some statistics
    const totalBlogs = await Blog.countDocuments({ author: authorId });
    const publishedBlogs = await Blog.countDocuments({
      author: authorId,
      published: true,
    });
    const draftBlogs = await Blog.countDocuments({
      author: authorId,
      published: false,
    });
    const featuredBlogs = await Blog.countDocuments({
      author: authorId,
      featured: true,
    });

    console.log(`\nStatistics for author ${authorId}:`);
    console.log(`Total blogs: ${totalBlogs}`);
    console.log(`Published blogs: ${publishedBlogs}`);
    console.log(`Draft blogs: ${draftBlogs}`);
    console.log(`Featured blogs: ${featuredBlogs}`);

    // Show some sample titles
    console.log(`\nSample blog titles created:`);
    const sampleBlogs = await Blog.find({ author: authorId })
      .select("title")
      .limit(5);
    sampleBlogs.forEach((blog, index) => {
      console.log(`${index + 1}. ${blog.title}`);
    });
  } catch (error) {
    console.error("Error seeding blogs:", error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
seedBlogs();
