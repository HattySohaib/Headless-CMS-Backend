import { createClient } from "redis";

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

redisClient.on("ready", () => {
  console.log("Connected to Redis");
});
