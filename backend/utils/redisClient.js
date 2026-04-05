import { createClient } from "redis";

const fallbackClient = {
  isOpen: false,
  get: async () => null,
  setEx: async () => null,
};

let redisClient = fallbackClient;

try {
  if (process.env.REDIS_URL) {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: () => false,
      },
    });

    client.on("error", () => {
      console.log("Redis unavailable, continuing without cache");
    });

    await client.connect();
    redisClient = client;
    console.log("Redis connected");
  } else {
    console.log("REDIS_URL not set, running without cache");
  }
} catch (error) {
  redisClient = fallbackClient;
  console.log("Redis unavailable, continuing without cache");
}

export default redisClient;