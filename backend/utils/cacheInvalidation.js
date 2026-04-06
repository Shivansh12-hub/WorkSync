import redisClient from "./redisClient.js";

export const invalidateCacheByPrefix = async (prefix) => {
  if (!redisClient.isOpen) {
    return;
  }

  try {
    const keys = [];
    for await (const keyBatch of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      if (Array.isArray(keyBatch) && keyBatch.length) {
        keys.push(...keyBatch);
      }
    }

    if (keys.length) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error(`[CACHE] Failed to invalidate prefix ${prefix}:`, error.message);
  }
};

export const invalidateKeys = async (keys = []) => {
  if (!redisClient.isOpen || !keys.length) {
    return;
  }

  try {
    await redisClient.del(...keys);
  } catch (error) {
    console.error("[CACHE] Failed to invalidate keys:", error.message);
  }
};
