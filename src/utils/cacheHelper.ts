import redisClient from "../config/redisClient";

// Function to set a cache with an optional expiry time (default 1 hour)
export const setCache = async (key: string, value: any, expiry = 3600): Promise<void> => {
  try {
    // Use options object to specify EX (expiration in seconds)
    await redisClient.set(key, JSON.stringify(value), { EX: expiry });
  } catch (error) {
    console.error(`Error setting cache for key: ${key}`, error);
  }
};

// Function to get a cached value by key
export const getCache = async (key: string): Promise<any | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null; // Return parsed JSON or null if no cache found
  } catch (error) {
    console.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

// Function to delete a cache by key
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key); // Delete cache for the specified key
  } catch (error) {
    console.error(`Error deleting cache for key: ${key}`, error);
  }
};
