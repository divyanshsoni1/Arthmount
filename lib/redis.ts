import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,       // connect eagerly — first request pays zero connection cost
    enableReadyCheck: true,
  });

  redis.on("error", (err) => {
    console.error("[Redis] Connection error:", err);
  });

  redis.on("connect", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Connected");
    }
  });

  return redis;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
