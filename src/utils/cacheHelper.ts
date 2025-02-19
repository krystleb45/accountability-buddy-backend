import redisClient from "../config/redisClient";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const setCache = async (key: string, value: any, expiry = 3600) => {
  // Use options object to specify EX (expiration in seconds)
  await redisClient.set(key, JSON.stringify(value), { EX: expiry });
};

export const getCache = async (key: string): Promise<any | null> => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};
